import * as SQLite from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/constants/finance';
import { SCHEMA_SQL } from '@/database/schema';
import { createId } from '@/utils/ids';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let deviceIdPromise: Promise<string> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('personal-finance.db')
      .then(async (database) => {
        await database.execAsync(SCHEMA_SQL);
        const now = new Date().toISOString();
        const statement = await database.prepareAsync(
          'INSERT OR IGNORE INTO categories (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        );
        try {
          for (const category of DEFAULT_CATEGORIES) {
            await statement.executeAsync(
              category.id,
              category.name,
              category.type,
              now,
              now
            );
          }
        } finally {
          await statement.finalizeAsync();
        }
        await getDeviceId(database);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

export async function getDeviceId(
  existingDatabase?: SQLite.SQLiteDatabase
): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const database = existingDatabase ?? (await getDatabase());
      const result = await database.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        'device_id'
      );
      if (result?.value) return result.value;
      const deviceId = createId();
      await database.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        'device_id',
        deviceId
      );
      return deviceId;
    })().catch((error: unknown) => {
      deviceIdPromise = null;
      throw error;
    });
  }
  return deviceIdPromise;
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key
  );
  return result?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}
