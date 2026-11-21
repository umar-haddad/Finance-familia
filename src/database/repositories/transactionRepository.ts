import type { SQLiteDatabase } from 'expo-sqlite';

import type { Transaction } from '@/types/finance';

export interface TransactionDraft {
  type: Transaction['type'];
  description: string;
  amount: number;
  category: string;
  date: string;
}

export async function listTransactions(
  database: SQLiteDatabase,
  options: { includeDeleted?: boolean; limit?: number } = {}
): Promise<Transaction[]> {
  const where = options.includeDeleted ? '' : 'WHERE deleted_at IS NULL';
  const limit = options.limit ? 'LIMIT ?' : '';
  const parameters = options.limit ? [options.limit] : [];
  return database.getAllAsync<Transaction>(
    `SELECT * FROM transactions ${where} ORDER BY date DESC, created_at DESC ${limit}`,
    ...parameters
  );
}

export async function saveTransaction(
  database: SQLiteDatabase,
  deviceId: string,
  draft: TransactionDraft,
  existing?: Transaction
): Promise<void> {
  const now = new Date().toISOString();
  if (existing) {
    await database.runAsync(
      `UPDATE transactions
       SET type = ?, description = ?, amount = ?, category = ?, date = ?,
           updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      draft.type,
      draft.description.trim(),
      draft.amount,
      draft.category,
      draft.date,
      now,
      existing.id
    );
    return;
  }
  const { createId } = await import('@/utils/ids');
  await database.runAsync(
    `INSERT INTO transactions
      (id, device_id, type, description, amount, category, date, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
    createId(),
    deviceId,
    draft.type,
    draft.description.trim(),
    draft.amount,
    draft.category,
    draft.date,
    now,
    now
  );
}

export async function deleteTransaction(
  database: SQLiteDatabase,
  id: string
): Promise<void> {
  await database.runAsync(
    `UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    new Date().toISOString(),
    new Date().toISOString(),
    id
  );
}
