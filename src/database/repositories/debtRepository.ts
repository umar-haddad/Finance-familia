import type { SQLiteDatabase } from 'expo-sqlite';

import type { Debt, DebtStatus, DebtType } from '@/types/finance';
import { createId } from '@/utils/ids';

export interface DebtDraft {
  person_name: string;
  description: string;
  type: DebtType;
  amount: number;
  paid_amount: number;
  date: string;
  due_date: string | null;
}

function statusFromAmounts(amount: number, paidAmount: number): DebtStatus {
  if (paidAmount >= amount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
}

export async function listDebts(
  database: SQLiteDatabase,
  includeDeleted = false
): Promise<Debt[]> {
  return database.getAllAsync<Debt>(
    `SELECT * FROM debts ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'} ORDER BY COALESCE(due_date, date) ASC`
  );
}

export async function saveDebt(
  database: SQLiteDatabase,
  deviceId: string,
  draft: DebtDraft,
  existing?: Debt
): Promise<void> {
  if (draft.paid_amount > draft.amount) {
    throw new Error('Jumlah terbayar tidak boleh melebihi total hutang.');
  }
  const now = new Date().toISOString();
  const status = statusFromAmounts(draft.amount, draft.paid_amount);
  if (existing) {
    await database.runAsync(
      `UPDATE debts SET person_name = ?, description = ?, type = ?, amount = ?,
       paid_amount = ?, date = ?, due_date = ?, status = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      draft.person_name.trim(),
      draft.description.trim(),
      draft.type,
      draft.amount,
      draft.paid_amount,
      draft.date,
      draft.due_date,
      status,
      now,
      existing.id
    );
    return;
  }
  await database.runAsync(
    `INSERT INTO debts
      (id, device_id, person_name, description, type, amount, paid_amount, date, due_date, status, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
    createId(),
    deviceId,
    draft.person_name.trim(),
    draft.description.trim(),
    draft.type,
    draft.amount,
    draft.paid_amount,
    draft.date,
    draft.due_date,
    status,
    now,
    now
  );
}

export async function addDebtPayment(
  database: SQLiteDatabase,
  debt: Debt,
  payment: number
): Promise<void> {
  if (!Number.isFinite(payment) || payment <= 0) {
    throw new Error('Nominal pembayaran harus lebih dari nol.');
  }
  if (debt.paid_amount + payment > debt.amount) {
    throw new Error('Pembayaran melebihi sisa hutang.');
  }
  await saveDebt(
    database,
    debt.device_id,
    { ...debt, paid_amount: debt.paid_amount + payment },
    debt
  );
}

export async function deleteDebt(database: SQLiteDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE debts SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    now,
    now,
    id
  );
}
