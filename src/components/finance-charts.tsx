import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/app-shell';
import { useAppContext } from '@/providers/app-provider';
import type { Transaction } from '@/types/finance';
import { formatCurrency } from '@/utils/currency';

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(year, month, 1));
}

export function IncomeExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const { colors, currency } = useAppContext();
  const today = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const rows = transactions.filter((item) => item.date.startsWith(monthKey));
    return {
      label: monthLabel(date.getFullYear(), date.getMonth()),
      income: rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
      expense: rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const maxAmount = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]));

  return (
    <Card>
      <View style={styles.heading}>
        <SectionTitle>Pemasukan vs Pengeluaran</SectionTitle>
        <Text style={[styles.legend, { color: colors.muted }]}>6 bulan</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.positive }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Masuk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.negative }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Keluar</Text>
        </View>
      </View>
      <View style={styles.chart}>
        {months.map((month) => (
          <View key={month.label + month.income} style={styles.monthColumn}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(3, (month.income / maxAmount) * 100)}%`, backgroundColor: colors.positive },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(3, (month.expense / maxAmount) * 100)}%`, backgroundColor: colors.negative },
                ]}
              />
            </View>
            <Text style={[styles.monthLabel, { color: colors.muted }]}>{month.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.chartBaseline, { backgroundColor: colors.border }]} />
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryValue, { color: colors.positive }]}>
          {formatCurrency(months[5]?.income ?? 0, currency)}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.negative }]}>
          {formatCurrency(months[5]?.expense ?? 0, currency)}
        </Text>
      </View>
    </Card>
  );
}

export function CategoryExpenseChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { colors, currency } = useAppContext();
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === 'expense') {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    }
  }
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxAmount = Math.max(1, ...categories.map(([, amount]) => amount));
  return (
    <Card>
      <SectionTitle>Pengeluaran per kategori</SectionTitle>
      {categories.length === 0 ? (
        <Text style={[styles.emptyChart, { color: colors.muted }]}>Belum ada pengeluaran bulan ini.</Text>
      ) : (
        categories.map(([category, amount]) => (
          <View key={category} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>{category}</Text>
              <Text style={[styles.categoryAmount, { color: colors.muted }]}>{formatCurrency(amount, currency)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.trackFill,
                  { width: `${Math.max(2, (amount / maxAmount) * 100)}%`, backgroundColor: colors.negative },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  legend: { fontSize: 11 },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: -4, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
  chart: { flexDirection: 'row', height: 138, paddingTop: 8 },
  monthColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bars: { width: '72%', height: 108, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  bar: { width: 10, maxHeight: '100%', minHeight: 3, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  monthLabel: { fontSize: 10, marginTop: 7, textTransform: 'capitalize' },
  chartBaseline: { height: StyleSheet.hairlineWidth, marginTop: -4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  summaryValue: { fontSize: 12, fontWeight: '700' },
  emptyChart: { fontSize: 13, paddingBottom: 4 },
  categoryRow: { marginTop: 12 },
  categoryInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7, gap: 8 },
  categoryName: { flex: 1, fontSize: 13, fontWeight: '700' },
  categoryAmount: { fontSize: 12 },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 5 },
});
