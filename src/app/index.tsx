import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  AppShell,
  Card,
  EmptyState,
  Field,
  SectionTitle,
} from "@/components/app-shell";
import { IncomeExpenseChart } from "@/components/finance-charts";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionRow } from "@/components/transaction-row";
import { getDatabase } from "@/database/db";
import { listCategories } from "@/database/repositories/categoryRepository";
import { listDebts } from "@/database/repositories/debtRepository";
import { listStocks } from "@/database/repositories/stockRepository";
import {
  deleteTransaction,
  listTransactions,
  saveTransaction,
} from "@/database/repositories/transactionRepository";
import { useAppContext } from "@/providers/app-provider";
import type {
  Category,
  Debt,
  Stock,
  Transaction,
  TransactionType,
} from "@/types/finance";
import { confirmDestructiveAction, showMessage } from "@/utils/confirm";
import { formatCurrency } from "@/utils/currency";
import { formatDate, formatMonth, getMonthRange } from "@/utils/date";

export default function DashboardScreen() {
  const { colors, currency, deviceId, name, updateProfile } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [initialType, setInitialType] = useState<TransactionType>("expense");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [profileName, setProfileName] = useState(name);

  const loadData = useCallback(async () => {
    try {
      const database = await getDatabase();
      const [transactionRows, categoryRows, debtRows, stockRows, pending] =
        await Promise.all([
          listTransactions(database),
          listCategories(database),
          listDebts(database),
          listStocks(database),
          database.getFirstAsync<{ count: number }>(
            `SELECT
            (SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending') +
            (SELECT COUNT(*) FROM debts WHERE sync_status = 'pending') +
            (SELECT COUNT(*) FROM stocks WHERE sync_status = 'pending') AS count`,
          ),
        ]);
      setTransactions(transactionRows);
      setCategories(categoryRows);
      setDebts(debtRows);
      setStocks(stockRows);
      setPendingCount(pending?.count ?? 0);
    } catch (error) {
      Alert.alert(
        "Data belum dapat dimuat",
        error instanceof Error ? error.message : "Silakan coba lagi.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const monthRange = getMonthRange();
  const monthTransactions = transactions.filter(
    (transaction) =>
      transaction.date >= monthRange.start &&
      transaction.date <= monthRange.end,
  );
  const income = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = transactions.reduce(
    (sum, transaction) =>
      sum +
      (transaction.type === "income"
        ? transaction.amount
        : -transaction.amount),
    0,
  );
  const debtTotal = debts.reduce(
    (sum, debt) => sum + Math.max(0, debt.amount - debt.paid_amount),
    0,
  );
  const investmentTotal = stocks.reduce(
    (sum, stock) => sum + stock.lots * 100 * stock.buy_price,
    0,
  );

  const openForm = (type: TransactionType, transaction?: Transaction) => {
    setInitialType(type);
    setEditing(transaction);
    setFormVisible(true);
  };

  const save = async (
    draft: Parameters<typeof saveTransaction>[2],
    existing?: Transaction,
  ) => {
    await saveTransaction(await getDatabase(), deviceId, draft, existing);
    await loadData();
  };

  const confirmDelete = (transaction: Transaction) => {
    confirmDestructiveAction(
      "Hapus transaksi?",
      "Transaksi dihapus dari daftar dan akan ikut tersinkron sebagai penghapusan.",
      "Hapus",
      async () => {
        try {
          await deleteTransaction(await getDatabase(), transaction.id);
          await loadData();
        } catch (error) {
          showMessage(
            "Tidak dapat menghapus",
            error instanceof Error ? error.message : "Coba lagi.",
          );
        }
      },
    );
  };

  return (
    <AppShell title="Dashboard">
      {!name ? (
        <Card>
          <SectionTitle>Selamat datang 👋</SectionTitle>
          <Text style={[styles.helper, { color: colors.muted }]}>
            Isi nama Anda. Profil ini hanya disimpan di perangkat, tanpa akun
            atau login.
          </Text>
          <Field
            label="Nama Anda"
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Contoh: Andi"
          />
          <ActionButton
            title="Mulai gunakan aplikasi"
            onPress={() => {
              void updateProfile(profileName, currency)
                .then(loadData)
                .catch((error: unknown) => {
                  Alert.alert(
                    "Profil belum tersimpan",
                    error instanceof Error ? error.message : "Coba lagi.",
                  );
                });
            }}
          />
        </Card>
      ) : null}

      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Total saldo</Text>
          <Text style={styles.balanceIcon}>◉</Text>
        </View>
        <Text style={styles.balanceValue}>
          {formatCurrency(balance, currency)}
        </Text>
        <Text style={styles.balanceFootnote}>Ringkasan keuangan · offline</Text>
        <View style={styles.monthPill}>
          <Text style={styles.monthText}>{formatMonth()}</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Pemasukan"
          amount={income}
          tint={colors.positive}
          icon="↙"
        />
        <SummaryCard
          title="Pengeluaran"
          amount={expenses}
          tint={colors.negative}
          icon="↗"
        />
        <SummaryCard
          title="Sisa hutang"
          amount={debtTotal}
          tint={colors.warning}
          icon="◉"
        />
        <SummaryCard
          title="Investasi"
          amount={investmentTotal}
          tint={colors.primary}
          icon="⌁"
        />
      </View>

      {pendingCount > 0 ? (
        <Pressable
          onPress={() => router.push("/partner")}
          style={[styles.syncNotice, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.syncIcon, { color: colors.primary }]}>⟳</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.syncTitle, { color: colors.text }]}>
              {pendingCount} data menunggu sinkronisasi
            </Text>
            <Text style={[styles.syncText, { color: colors.muted }]}>
              Tukar file dengan pasangan tanpa server
            </Text>
          </View>
          <Text style={[styles.arrow, { color: colors.primary }]}>›</Text>
        </Pressable>
      ) : null}

      <IncomeExpenseChart transactions={transactions} />

      <Card>
        <View style={styles.sectionHeader}>
          <SectionTitle>Transaksi terbaru</SectionTitle>
          <Pressable onPress={() => router.push("/transactions")}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>
              Lihat semua
            </Text>
          </Pressable>
        </View>
        {transactions.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            message="Catat pemasukan atau pengeluaran pertama Anda."
          />
        ) : (
          transactions
            .slice(0, 5)
            .map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onEdit={() => openForm(transaction.type, transaction)}
                onDelete={() => confirmDelete(transaction)}
              />
            ))
        )}
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tambah data"
        onPress={() => setShowQuickActions((visible) => !visible)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text
          style={[
            styles.fabText,
            { color: colors.text === "#F1F6F2" ? "#13231A" : "#FFFFFF" },
          ]}
        >
          {showQuickActions ? "×" : "+"}
        </Text>
      </Pressable>
      {showQuickActions ? (
        <View
          style={[
            styles.quickActions,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <QuickAction
            title="+ Pemasukan"
            onPress={() => {
              setShowQuickActions(false);
              openForm("income");
            }}
          />
          <QuickAction
            title="− Pengeluaran"
            onPress={() => {
              setShowQuickActions(false);
              openForm("expense");
            }}
          />
          <QuickAction
            title="◉ Tambah hutang"
            onPress={() => {
              setShowQuickActions(false);
              router.push("/debts");
            }}
          />
          <QuickAction
            title="↗ Tambah saham"
            onPress={() => {
              setShowQuickActions(false);
              router.push("/stocks");
            }}
          />
        </View>
      ) : null}
      <TransactionForm
        key={`${formVisible}-${editing?.id ?? "new"}-${initialType}`}
        visible={formVisible}
        categories={categories}
        initial={editing}
        initialType={initialType}
        onClose={() => setFormVisible(false)}
        onSave={save}
      />
      <Text style={[styles.footer, { color: colors.muted }]}>
        Tanggal tersimpan lokal ·{" "}
        {formatDate(new Date().toISOString().slice(0, 10))}
      </Text>
    </AppShell>
  );
}

function SummaryCard({
  title,
  amount,
  tint,
  icon,
}: {
  title: string;
  amount: number;
  tint: string;
  icon: string;
}) {
  const { colors, currency } = useAppContext();
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <Text style={[styles.summaryIcon, { color: tint }]}>{icon}</Text>
        <Text style={[styles.summaryTitle, { color: colors.muted }]}>
          {title}
        </Text>
      </View>
      <Text
        style={[styles.summaryAmount, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(amount, currency)}
      </Text>
    </Card>
  );
}

function QuickAction({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const { colors } = useAppContext();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.quickAction, { borderBottomColor: colors.border }]}
    >
      <Text style={[styles.quickActionText, { color: colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 13, lineHeight: 20, marginTop: -5, marginBottom: 12 },
  balanceCard: {
    borderRadius: 25,
    padding: 22,
    minHeight: 176,
    overflow: "hidden",
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 13, fontWeight: "600", color: "#D8F4E4" },
  balanceIcon: { fontSize: 20, color: "#E8FFF0" },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 13,
  },
  balanceFootnote: { color: "#D8F4E4", fontSize: 11, marginTop: 5 },
  monthPill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.17)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 14,
  },
  monthText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { width: "48%", flexGrow: 1, padding: 14, borderRadius: 18 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  summaryIcon: { fontSize: 15, fontWeight: "800" },
  summaryTitle: { fontSize: 11, fontWeight: "600" },
  summaryAmount: { fontSize: 14, fontWeight: "800", marginTop: 10 },
  syncNotice: {
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncIcon: { fontSize: 24 },
  syncTitle: { fontSize: 12, fontWeight: "800" },
  syncText: { fontSize: 11, marginTop: 3 },
  arrow: { fontSize: 24, fontWeight: "300" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAll: { fontSize: 12, fontWeight: "700", marginTop: -8 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  fabText: { fontSize: 31, lineHeight: 34, fontWeight: "400" },
  quickActions: {
    position: "absolute",
    right: 18,
    bottom: 92,
    width: 205,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    elevation: 5,
  },
  quickAction: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickActionText: { fontSize: 13, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 10, marginTop: 2 },
});
