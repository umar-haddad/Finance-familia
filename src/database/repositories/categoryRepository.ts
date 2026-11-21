import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryType } from '@/types/finance';
import { createId } from '@/utils/ids';

export async function listCategories(database: SQLiteDatabase): Promise<Category[]> {
  return database.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY name COLLATE NOCASE'
  );
}

export async function addCategory(
  database: SQLiteDatabase,
  name: string,
  type: CategoryType = 'both'
): Promise<void> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Nama kategori wajib diisi.');
  const exists = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE lower(name) = lower(?)',
    normalizedName
  );
  if (exists) throw new Error('Kategori dengan nama tersebut sudah ada.');
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO categories (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    createId(),
    normalizedName,
    type,
    now,
    now
  );
}
