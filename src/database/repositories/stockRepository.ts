import type { SQLiteDatabase } from 'expo-sqlite';

import type { Stock } from '@/types/finance';
import { createId } from '@/utils/ids';

export interface StockDraft {
  symbol: string;
  name: string;
  lots: number;
  buy_price: number;
  current_price: number;
  buy_date: string;
  description: string;
}

export async function listStocks(
  database: SQLiteDatabase,
  includeDeleted = false
): Promise<Stock[]> {
  return database.getAllAsync<Stock>(
    `SELECT * FROM stocks ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'} ORDER BY symbol COLLATE NOCASE`
  );
}

export async function saveStock(
  database: SQLiteDatabase,
  deviceId: string,
  draft: StockDraft,
  existing?: Stock
): Promise<void> {
  const now = new Date().toISOString();
  const symbol = draft.symbol.trim().toUpperCase();
  if (existing) {
    await database.runAsync(
      `UPDATE stocks SET symbol = ?, name = ?, lots = ?, buy_price = ?, current_price = ?,
       buy_date = ?, description = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      symbol,
      draft.name.trim(),
      draft.lots,
      draft.buy_price,
      draft.current_price,
      draft.buy_date,
      draft.description.trim(),
      now,
      existing.id
    );
    return;
  }
  await database.runAsync(
    `INSERT INTO stocks
      (id, device_id, symbol, name, lots, buy_price, current_price, buy_date, description, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
    createId(),
    deviceId,
    symbol,
    draft.name.trim(),
    draft.lots,
    draft.buy_price,
    draft.current_price,
    draft.buy_date,
    draft.description.trim(),
    now,
    now
  );
}

export async function deleteStock(database: SQLiteDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE stocks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    now,
    now,
    id
  );
}
