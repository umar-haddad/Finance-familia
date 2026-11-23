import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDeviceId } from "@/database/db";
import { listCategories } from "@/database/repositories/categoryRepository";
import { listDebts } from "@/database/repositories/debtRepository";
import { listStocks } from "@/database/repositories/stockRepository";
import { listTransactions } from "@/database/repositories/transactionRepository";
import { parseCsv, shareCsvFile, stringifyCsv } from "@/services/csvService";
import type {
  BackupFile,
  Category,
  Debt,
  Stock,
  Transaction,
} from "@/types/finance";

const MAX_BACKUP_SIZE = 10 * 1024 * 1024;
const ENTITY_TYPES = ["transactions", "debts", "stocks", "categories"] as const;
const CSV_COLUMNS = [
  "record_type",
  "source_device_id",
  "exported_at",
  "id",
  "device_id",
  "type",
  "description",
  "amount",
  "category",
  "date",
  "created_at",
  "updated_at",
  "deleted_at",
  "sync_status",
  "person_name",
  "paid_amount",
  "due_date",
  "status",
  "symbol",
  "name",
  "lots",
  "buy_price",
  "current_price",
  "buy_date",
] as const;
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
  const backup = await createBackup(database);
  const fileName = `finance_familia_sync_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  await shareCsvFile(fileName, stringifyCsv(backupToCsvRows(backup)), "Bagikan CSV ke pasangan");
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
    type: [
      "text/csv",
      "text/comma-separated-values",
      "application/vnd.ms-excel",
      "text/plain",
      "application/octet-stream",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error("File backup terlalu besar. Batas ukuran adalah 10 MB.");
  }
  return parseBackupCsv(await file.text());
}

export function parseBackupCsv(text: string): BackupFile {
  if (text.length > MAX_BACKUP_SIZE) {
    throw new Error("File backup terlalu besar. Batas ukuran adalah 10 MB.");
  }
  const rows = parseCsv(text);
  const [header, ...dataRows] = rows;
  if (!header || !dataRows.length) {
    throw new Error("File CSV kosong atau tidak memiliki data.");
  }
  const columns = header.map((column) => column.trim());
  if (
    columns.length !== CSV_COLUMNS.length ||
    CSV_COLUMNS.some((column, index) => columns[index] !== column)
  ) {
    throw new Error("Format CSV tidak dikenali. Pilih file ekspor Finance Familia.");
  }
  const records = dataRows.map((values) => {
    if (values.length !== columns.length) {
      throw new Error("Jumlah kolom pada file CSV tidak konsisten.");
    }
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
  const sourceIds = new Set(records.map((record) => record.source_device_id));
  const firstRecord = records[0];
  if (
    sourceIds.size !== 1 ||
    typeof firstRecord?.source_device_id !== "string" ||
    firstRecord.source_device_id.length === 0
  ) {
    throw new Error("File CSV harus berasal dari satu perangkat Finance Familia.");
  }
  const exportedAt = firstRecord.exported_at ?? "";
  if (records.some((record) => record.exported_at !== exportedAt)) {
    throw new Error("Metadata pada file CSV tidak konsisten.");
  }
  const backup: BackupFile = {
    version: 1,
    deviceId: firstRecord.source_device_id,
    exportedAt,
    transactions: [],
    debts: [],
    stocks: [],
    categories: [],
  };
  for (const record of records) {
    switch (record.record_type) {
      case "metadata":
        break;
      case "transaction":
        {
          const transaction = {
            id: record.id,
            device_id: record.device_id,
            type: record.type,
            description: record.description,
            amount: parseCsvNumber(record.amount, "jumlah transaksi"),
            category: record.category,
            date: record.date,
            created_at: record.created_at,
            updated_at: record.updated_at,
            deleted_at: csvNullable(record.deleted_at),
            sync_status: record.sync_status,
          };
          if (!isTransaction(transaction)) {
            throw new Error("Ada data transaksi pada file CSV yang tidak valid.");
          }
          backup.transactions.push(transaction);
        }
        break;
      case "debt":
        {
          const debt = {
            id: record.id,
            device_id: record.device_id,
            person_name: record.person_name,
            description: record.description,
            type: record.type,
            amount: parseCsvNumber(record.amount, "jumlah hutang"),
            paid_amount: parseCsvNumber(record.paid_amount, "jumlah terbayar"),
            date: record.date,
            due_date: csvNullable(record.due_date),
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at,
            deleted_at: csvNullable(record.deleted_at),
            sync_status: record.sync_status,
          };
          if (!isDebt(debt)) {
            throw new Error("Ada data hutang pada file CSV yang tidak valid.");
          }
          backup.debts.push(debt);
        }
        break;
      case "stock":
        {
          const stock = {
            id: record.id,
            device_id: record.device_id,
            symbol: record.symbol,
            name: record.name,
            lots: parseCsvNumber(record.lots, "jumlah lot"),
            buy_price: parseCsvNumber(record.buy_price, "harga beli"),
            current_price: parseCsvNumber(record.current_price, "harga pasar"),
            buy_date: record.buy_date,
            description: record.description,
            created_at: record.created_at,
            updated_at: record.updated_at,
            deleted_at: csvNullable(record.deleted_at),
            sync_status: record.sync_status,
          };
          if (!isStock(stock)) {
            throw new Error("Ada data saham pada file CSV yang tidak valid.");
          }
          backup.stocks.push(stock);
        }
        break;
      case "category":
        {
          const category = {
            id: record.id,
            name: record.name,
            type: record.type,
            created_at: record.created_at,
            updated_at: record.updated_at,
          };
          if (!isCategory(category)) {
            throw new Error("Ada data kategori pada file CSV yang tidak valid.");
          }
          backup.categories.push(category);
        }
        break;
      default:
        throw new Error("File CSV berisi jenis data yang tidak dikenal.");
    }
  }
  if (
    !backup.transactions.every(isTransaction) ||
    !backup.debts.every(isDebt) ||
    !backup.stocks.every(isStock) ||
    !backup.categories.every(isCategory)
  ) {
    throw new Error("Ada data di file CSV yang tidak valid.");
  }
  const ids = new Set<string>();
  for (const type of ENTITY_TYPES) {
    for (const record of backup[type]) {
      const key = `${type}:${record.id}`;
      if (ids.has(key))
        throw new Error("File CSV berisi ID data yang ganda.");
      ids.add(key);
    }
  }
  return backup;
}

function backupToCsvRows(backup: BackupFile): unknown[][] {
  const rows: unknown[][] = [[...CSV_COLUMNS]];
  rows.push(
    CSV_COLUMNS.map((column) => {
      if (column === "record_type") return "metadata";
      if (column === "source_device_id") return backup.deviceId;
      if (column === "exported_at") return backup.exportedAt;
      return "";
    }),
  );
  const addRows = <T extends object>(
    recordType: string,
    records: readonly T[],
  ) => {
    for (const record of records) {
      rows.push(
        CSV_COLUMNS.map((column) => {
          if (column === "record_type") return recordType;
          if (column === "source_device_id") return backup.deviceId;
          if (column === "exported_at") return backup.exportedAt;
          return Reflect.get(record, column) ?? "";
        }),
      );
    }
  };
  addRows("transaction", backup.transactions);
  addRows("debt", backup.debts);
  addRows("stock", backup.stocks);
  addRows("category", backup.categories);
  return rows;
}

function parseCsvNumber(value: string, label: string): number {
  const number = Number(value);
  if (!value || !Number.isFinite(number)) {
    throw new Error(`Kolom ${label} pada file CSV tidak valid.`);
  }
  return number;
}

function csvNullable(value: string): string | null {
  return value === "" ? null : value;
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
