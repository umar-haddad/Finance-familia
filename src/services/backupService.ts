import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDeviceId } from "@/database/db";
import { listCategories } from "@/database/repositories/categoryRepository";
import { listDebts } from "@/database/repositories/debtRepository";
import { listStocks } from "@/database/repositories/stockRepository";
import { listTransactions } from "@/database/repositories/transactionRepository";
import type {
  BackupFile,
  Category,
  Debt,
  Stock,
  Transaction,
} from "@/types/finance";

const MAX_BACKUP_SIZE = 10 * 1024 * 1024;
const ENTITY_TYPES = ["transactions", "debts", "stocks", "categories"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];
type BackupEntity = Transaction | Debt | Stock | Category;
type ResolutionMap = Record<string, "local" | "remote">;

export interface BackupConflict {
  type: EntityType;
  id: string;
  local: BackupEntity;
  remote: BackupEntity;
}

export interface MergePreview {
  backup: BackupFile;
  newCount: number;
  newRecords: {
    transactions: Transaction[];
    debts: Debt[];
    stocks: Stock[];
    categories: Category[];
  };
  conflicts: BackupConflict[];
  resolutions: ResolutionMap;
}

export async function createBackup(
  database: SQLiteDatabase,
): Promise<BackupFile> {
  const [deviceId, transactions, debts, stocks, categories] = await Promise.all(
    [
      getDeviceId(database),
      listTransactions(database, { includeDeleted: true }),
      listDebts(database, true),
      listStocks(database, true),
      listCategories(database),
    ],
  );
  return {
    version: 1,
    deviceId,
    exportedAt: new Date().toISOString(),
    transactions,
    debts,
    stocks,
    categories,
  };
}

export async function shareBackup(database: SQLiteDatabase): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Fitur berbagi tidak tersedia di perangkat ini.");
  }
  const backup = await createBackup(database);
  const fileName = `personal_finance_sync_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Bagikan backup ke pasangan",
    UTI: "public.json",
  });
  await database.withTransactionAsync(async () => {
    for (const table of ["transactions", "debts", "stocks"] as const) {
      await database.runAsync(
        `UPDATE ${table} SET sync_status = 'synced' WHERE sync_status = 'pending'`,
      );
    }
    await database.runAsync(
      `INSERT INTO sync_metadata (id, device_id, partner_id, last_sync_at)
       VALUES ('partner-sync', ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET last_sync_at = excluded.last_sync_at`,
      backup.deviceId,
      new Date().toISOString(),
    );
  });
}

export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json", "application/octet-stream"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error("File backup terlalu besar. Batas ukuran adalah 10 MB.");
  }
  return parseBackup(await file.text());
}

export function parseBackup(text: string): BackupFile {
  if (text.length > MAX_BACKUP_SIZE) {
    throw new Error("File backup terlalu besar. Batas ukuran adalah 10 MB.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("File bukan JSON yang valid.");
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.deviceId !== "string"
  ) {
    throw new Error(
      "Format backup tidak dikenali. Pastikan memilih file dari Finance Familia.",
    );
  }
  if (
    !Array.isArray(value.transactions) ||
    !Array.isArray(value.debts) ||
    !Array.isArray(value.stocks) ||
    !Array.isArray(value.categories)
  ) {
    throw new Error("File backup tidak memiliki data yang lengkap.");
  }
  const backup: BackupFile = {
    version: 1,
    deviceId: value.deviceId,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    transactions: value.transactions as Transaction[],
    debts: value.debts as Debt[],
    stocks: value.stocks as Stock[],
    categories: value.categories as Category[],
  };
  if (
    !backup.transactions.every(isTransaction) ||
    !backup.debts.every(isDebt) ||
    !backup.stocks.every(isStock) ||
    !backup.categories.every(isCategory)
  ) {
    throw new Error("Ada data di file backup yang tidak valid.");
  }
  const ids = new Set<string>();
  for (const type of ENTITY_TYPES) {
    for (const record of backup[type]) {
      const key = `${type}:${record.id}`;
      if (ids.has(key))
        throw new Error("File backup berisi ID data yang ganda.");
      ids.add(key);
    }
  }
  return backup;
}

export async function previewMerge(
  backup: BackupFile,
  database: SQLiteDatabase,
): Promise<MergePreview> {
  if (backup.deviceId === (await getDeviceId(database))) {
    throw new Error(
      "File berasal dari perangkat ini. Impor dibatalkan agar data tidak terduplikasi.",
    );
  }
  const [transactions, debts, stocks, categories] = await Promise.all([
    listTransactions(database, { includeDeleted: true }),
    listDebts(database, true),
    listStocks(database, true),
    listCategories(database),
  ]);
  const conflicts: BackupConflict[] = [];
  const newRecords = {
    transactions: [],
    debts: [],
    stocks: [],
    categories: [],
  } as MergePreview["newRecords"];
  const compare = <T extends BackupEntity>(
    type: EntityType,
    localRows: T[],
    remoteRows: T[],
  ) => {
    const localById = new Map(localRows.map((row) => [row.id, row]));
    for (const remote of remoteRows) {
      const local = localById.get(remote.id);
      if (!local) {
        if (type === "transactions")
          newRecords.transactions.push(remote as Transaction);
        else if (type === "debts") newRecords.debts.push(remote as Debt);
        else if (type === "stocks") newRecords.stocks.push(remote as Stock);
        else newRecords.categories.push(remote as Category);
      } else if (!sameEntity(local, remote)) {
        conflicts.push({ type, id: remote.id, local, remote });
      }
    }
  };
  compare("transactions", transactions, backup.transactions);
  compare("debts", debts, backup.debts);
  compare("stocks", stocks, backup.stocks);
  compare("categories", categories, backup.categories);
  const newCount = ENTITY_TYPES.reduce(
    (count, type) => count + newRecords[type].length,
    0,
  );
  return { backup, newCount, newRecords, conflicts, resolutions: {} };
}

export async function applyMerge(
  preview: MergePreview,
  database: SQLiteDatabase,
  partnerName?: string,
): Promise<{ added: number; updated: number; keptLocal: number }> {
  const { backup, newRecords, conflicts, resolutions } = preview;
  let added = 0;
  let updated = 0;
  let keptLocal = 0;
  await database.withTransactionAsync(async () => {
    for (const record of newRecords.transactions) {
      await upsertTransaction(database, record);
      added += 1;
    }
    for (const record of newRecords.debts) {
      await upsertDebt(database, record);
      added += 1;
    }
    for (const record of newRecords.stocks) {
      await upsertStock(database, record);
      added += 1;
    }
    for (const record of newRecords.categories) {
      await upsertCategory(database, record);
      added += 1;
    }
    for (const conflict of conflicts) {
      if (resolutions[`${conflict.type}:${conflict.id}`] === "remote") {
        if (conflict.type === "transactions")
          await upsertTransaction(database, conflict.remote as Transaction);
        else if (conflict.type === "debts")
          await upsertDebt(database, conflict.remote as Debt);
        else if (conflict.type === "stocks")
          await upsertStock(database, conflict.remote as Stock);
        else await upsertCategory(database, conflict.remote as Category);
        updated += 1;
      } else {
        keptLocal += 1;
      }
    }
    await database.runAsync(
      `INSERT INTO sync_metadata (id, device_id, partner_id, last_sync_at)
       VALUES ('partner-sync', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET partner_id = excluded.partner_id, last_sync_at = excluded.last_sync_at`,
      await getDeviceId(database),
      backup.deviceId,
      new Date().toISOString(),
    );
    if (partnerName?.trim()) {
      await database.runAsync(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        "partner_name",
        partnerName.trim(),
      );
    }
  });
  return { added, updated, keptLocal };
}

function sameEntity(left: BackupEntity, right: BackupEntity): boolean {
  if (!("device_id" in left) && !("device_id" in right)) {
    return left.name === right.name && left.type === right.type;
  }
  const normalize = (entity: BackupEntity) => {
    const normalized = { ...entity };
    if ("sync_status" in normalized) {
      const { sync_status: _syncStatus, ...withoutStatus } = normalized;
      return withoutStatus;
    }
    return normalized;
  };
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

async function upsertTransaction(
  database: SQLiteDatabase,
  row: Transaction,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO transactions (id, device_id, type, description, amount, category, date, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET device_id=excluded.device_id, type=excluded.type, description=excluded.description,
       amount=excluded.amount, category=excluded.category, date=excluded.date, created_at=excluded.created_at,
       updated_at=excluded.updated_at, deleted_at=excluded.deleted_at, sync_status='synced'`,
    row.id,
    row.device_id,
    row.type,
    row.description,
    row.amount,
    row.category,
    row.date,
    row.created_at,
    row.updated_at,
    row.deleted_at,
  );
}

async function upsertDebt(database: SQLiteDatabase, row: Debt): Promise<void> {
  await database.runAsync(
    `INSERT INTO debts (id, device_id, person_name, description, type, amount, paid_amount, date, due_date, status, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET device_id=excluded.device_id, person_name=excluded.person_name,
       description=excluded.description, type=excluded.type, amount=excluded.amount, paid_amount=excluded.paid_amount,
       date=excluded.date, due_date=excluded.due_date, status=excluded.status, created_at=excluded.created_at,
       updated_at=excluded.updated_at, deleted_at=excluded.deleted_at, sync_status='synced'`,
    row.id,
    row.device_id,
    row.person_name,
    row.description,
    row.type,
    row.amount,
    row.paid_amount,
    row.date,
    row.due_date,
    row.status,
    row.created_at,
    row.updated_at,
    row.deleted_at,
  );
}

async function upsertStock(
  database: SQLiteDatabase,
  row: Stock,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO stocks (id, device_id, symbol, name, lots, buy_price, current_price, buy_date, description, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET device_id=excluded.device_id, symbol=excluded.symbol, name=excluded.name,
       lots=excluded.lots, buy_price=excluded.buy_price, current_price=excluded.current_price, buy_date=excluded.buy_date,
       description=excluded.description, created_at=excluded.created_at, updated_at=excluded.updated_at,
       deleted_at=excluded.deleted_at, sync_status='synced'`,
    row.id,
    row.device_id,
    row.symbol,
    row.name,
    row.lots,
    row.buy_price,
    row.current_price,
    row.buy_date,
    row.description,
    row.created_at,
    row.updated_at,
    row.deleted_at,
  );
}

async function upsertCategory(
  database: SQLiteDatabase,
  row: Category,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO categories (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type,
       created_at=excluded.created_at, updated_at=excluded.updated_at`,
    row.id,
    row.name,
    row.type,
    row.created_at,
    row.updated_at,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasSyncFields(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isString(value.device_id) &&
    isString(value.created_at) &&
    isString(value.updated_at) &&
    (value.deleted_at === null || isString(value.deleted_at)) &&
    ["pending", "synced", "updated"].includes(String(value.sync_status))
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    hasSyncFields(value) &&
    ["income", "expense"].includes(String(value.type)) &&
    isString(value.description) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    isString(value.category) &&
    isDate(value.date)
  );
}

function isDebt(value: unknown): value is Debt {
  if (!isRecord(value)) return false;
  return (
    hasSyncFields(value) &&
    isString(value.person_name) &&
    typeof value.description === "string" &&
    ["owed", "lent"].includes(String(value.type)) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    typeof value.paid_amount === "number" &&
    Number.isFinite(value.paid_amount) &&
    value.paid_amount >= 0 &&
    value.paid_amount <= value.amount &&
    isDate(value.date) &&
    (value.due_date === null || isDate(value.due_date)) &&
    ["unpaid", "partial", "paid"].includes(String(value.status))
  );
}

function isStock(value: unknown): value is Stock {
  if (!isRecord(value)) return false;
  return (
    hasSyncFields(value) &&
    isString(value.symbol) &&
    isString(value.name) &&
    typeof value.lots === "number" &&
    Number.isFinite(value.lots) &&
    value.lots > 0 &&
    typeof value.buy_price === "number" &&
    Number.isFinite(value.buy_price) &&
    value.buy_price >= 0 &&
    typeof value.current_price === "number" &&
    Number.isFinite(value.current_price) &&
    value.current_price >= 0 &&
    isDate(value.buy_date) &&
    typeof value.description === "string"
  );
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    ["income", "expense", "both"].includes(String(value.type)) &&
    isString(value.created_at) &&
    isString(value.updated_at)
  );
}
