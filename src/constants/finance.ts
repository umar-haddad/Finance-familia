import type { CategoryType } from '@/types/finance';

export const DEFAULT_CATEGORIES: {
  id: string;
  name: string;
  type: CategoryType;
}[] = [
  { id: 'cat-food', name: 'Makanan', type: 'expense' },
  { id: 'cat-transport', name: 'Transportasi', type: 'expense' },
  { id: 'cat-shopping', name: 'Belanja', type: 'expense' },
  { id: 'cat-bills', name: 'Tagihan', type: 'expense' },
  { id: 'cat-health', name: 'Kesehatan', type: 'expense' },
  { id: 'cat-entertainment', name: 'Hiburan', type: 'expense' },
  { id: 'cat-salary', name: 'Gaji', type: 'income' },
  { id: 'cat-business', name: 'Usaha', type: 'income' },
  { id: 'cat-investment', name: 'Investasi', type: 'income' },
  { id: 'cat-other', name: 'Lainnya', type: 'both' },
];

export const CURRENCIES = [
  { code: 'IDR', label: 'Rupiah Indonesia', symbol: 'Rp' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'MYR', label: 'Ringgit Malaysia', symbol: 'RM' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
] as const;

export const PALETTE = {
  light: {
    background: '#F5F7F6',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2F0',
    text: '#18231E',
    muted: '#75817B',
    border: '#E1E8E3',
    primary: '#177D57',
    primarySoft: '#E2F3EA',
    positive: '#168458',
    negative: '#D74B4B',
    negativeSoft: '#FCE9E8',
    warning: '#B7791F',
    overlay: 'rgba(14, 29, 21, 0.4)',
  },
  dark: {
    background: '#111A16',
    surface: '#1A2620',
    surfaceAlt: '#233129',
    text: '#F1F6F2',
    muted: '#A0AEA5',
    border: '#2D3C33',
    primary: '#72D5A5',
    primarySoft: '#1E3B2C',
    positive: '#72D5A5',
    negative: '#FF8A83',
    negativeSoft: '#432927',
    warning: '#F2C572',
    overlay: 'rgba(0, 0, 0, 0.68)',
  },
} as const;
