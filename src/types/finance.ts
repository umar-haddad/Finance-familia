export type TransactionType = 'income' | 'expense';
export type DebtType = 'owed' | 'lent';
export type DebtStatus = 'unpaid' | 'partial' | 'paid';
export type SyncStatus = 'pending' | 'synced' | 'updated';
export type CategoryType = TransactionType | 'both';

export interface SyncFields {
  id: string;
  device_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
}

export interface Transaction extends SyncFields {
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface Debt extends SyncFields {
  person_name: string;
  description: string;
  type: DebtType;
  amount: number;
  paid_amount: number;
  date: string;
  due_date: string | null;
  status: DebtStatus;
}

export interface Stock extends SyncFields {
  symbol: string;
  name: string;
  lots: number;
  buy_price: number;
  current_price: number;
  buy_date: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

export interface BackupFile {
  version: 1;
  deviceId: string;
  exportedAt: string;
  transactions: Transaction[];
  debts: Debt[];
  stocks: Stock[];
  categories: Category[];
}

export interface FinanceSummary {
  balance: number;
  income: number;
  expenses: number;
  debts: number;
  investments: number;
  pendingSync: number;
}
