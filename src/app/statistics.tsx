import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { AppShell, Card, SectionTitle } from '@/components/app-shell';
import { CategoryExpenseChart, IncomeExpenseChart } from '@/components/finance-charts';
import { getDatabase } from '@/database/db';
import { listTransactions } from '@/database/repositories/transactionRepository';
import { useAppContext } from '@/providers/app-provider';
import type { Transaction } from '@/types/finance';
import { formatCurrency } from '@/utils/currency';
import { formatMonth, getMonthRange } from '@/utils/date';

export default function StatisticsScreen() {
  const { colors, currency } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const loadData = useCallback(async () => {
    try {
      setTransactions(await listTransactions(await getDatabase()));
    } catch (error) {
      Alert.alert('Statistik belum tersedia', error instanceof Error ? error.message : 'Coba lagi.');
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const range = getMonthRange();
  const currentMonth = transactions.filter((item) => item.date >= range.start && item.date <= range.end);
  const income = currentMonth.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = currentMonth.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const savings = income - expense;

  return (
    <AppShell title="Statistik">
      <Card>
        <SectionTitle>Ringkasan · {formatMonth()}</SectionTitle>
        <View style={styles.metricRow}>
          <Metric label="Pemasukan" amount={income} tint={colors.positive} />
          <Metric label="Pengeluaran" amount={expense} tint={colors.negative} />
        </View>
        <View style={[styles.savings, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.savingsLabel, { color: colors.muted }]}>Arus kas bersih</Text>
          <Text style={[styles.savingsAmount, { color: savings >= 0 ? colors.positive : colors.negative }]}>
            {formatCurrency(savings, currency)}
          </Text>
        </View>
      </Card>
      <IncomeExpenseChart transactions={transactions} />
      <CategoryExpenseChart transactions={currentMonth} />
      <Text style={[styles.note, { color: colors.muted }]}>
        Grafik menggunakan transaksi yang tersimpan di SQLite perangkat ini. Tidak ada harga atau data dari API eksternal.
      </Text>
    </AppShell>
  );
}

function Metric({ label, amount, tint }: { label: string; amount: number; tint: string }) {
  const { colors, currency } = useAppContext();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: { flexDirection: 'row', gap: 14 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  metricValue: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  savings: { borderRadius: 15, padding: 14, marginTop: 17 },
  savingsLabel: { fontSize: 11, fontWeight: '600' },
  savingsAmount: { fontSize: 20, fontWeight: '800', marginTop: 5 },
  note: { fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 8 },
});
