import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  ActionButton,
  AppShell,
  Card,
  EmptyState,
  SectionTitle,
} from "@/components/app-shell";
import { DatePickerField } from "@/components/date-picker-field";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionRow } from "@/components/transaction-row";
import { getDatabase } from "@/database/db";
import { listCategories } from "@/database/repositories/categoryRepository";
import {
  deleteTransaction,
  listTransactions,
  saveTransaction,
} from "@/database/repositories/transactionRepository";
import { useAppContext } from "@/providers/app-provider";
import type { Category, Transaction, TransactionType } from "@/types/finance";
import { confirmDestructiveAction, showMessage } from "@/utils/confirm";
import { formatDate, getMonthRange, toDateKey } from "@/utils/date";

type TypeFilter = "all" | TransactionType;
type DateFilter = "month" | "all" | "day";

export default function TransactionsScreen() {
  const { colors, deviceId } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("Semua kategori");
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [initialType, setInitialType] = useState<TransactionType>("expense");

  const loadData = useCallback(async () => {
    try {
      const database = await getDatabase();
      const [rows, categoryRows] = await Promise.all([
        listTransactions(database),
        listCategories(database),
      ]);
      setTransactions(rows);
      setCategories(categoryRows);
    } catch (error) {
      Alert.alert(
        "Tidak dapat memuat transaksi",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const filtered = useMemo(() => {
    const range = getMonthRange();
    const term = search.trim().toLocaleLowerCase("id-ID");
    return transactions.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
      if (
        categoryFilter !== "Semua kategori" &&
        transaction.category !== categoryFilter
      )
        return false;
      if (
        dateFilter === "month" &&
        (transaction.date < range.start || transaction.date > range.end)
      )
        return false;
      if (dateFilter === "day" && transaction.date !== toDateKey(selectedDate))
        return false;
      if (
        term &&
        !`${transaction.description} ${transaction.category}`
          .toLocaleLowerCase("id-ID")
          .includes(term)
      )
        return false;
      return true;
    });
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    dateFilter,
    selectedDate,
    search,
  ]);

  const save = async (
    draft: Parameters<typeof saveTransaction>[2],
    existing?: Transaction,
  ) => {
    await saveTransaction(await getDatabase(), deviceId, draft, existing);
    await loadData();
  };

  const openNew = (type: TransactionType = "expense") => {
    setEditing(undefined);
    setInitialType(type);
    setFormVisible(true);
  };

  const confirmDelete = (transaction: Transaction) => {
    confirmDestructiveAction(
      "Hapus transaksi?",
      `“${transaction.description}” akan dihapus dari daftar.`,
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
    <AppShell
      title="Transaksi"
      headerAction={
        <ActionButton title="+ Tambah" compact onPress={() => openNew()} />
      }
    >
      <Card>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          Cari transaksi
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Keterangan atau kategori"
          placeholderTextColor={colors.muted}
          style={[
            styles.searchInput,
            {
              color: colors.text,
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        />
        <Text
          style={[styles.fieldLabel, { color: colors.text, marginTop: 16 }]}
        >
          Jenis
        </Text>
        <View style={styles.chipRow}>
          {(
            [
              ["all", "Semua"],
              ["income", "Pemasukan"],
              ["expense", "Pengeluaran"],
            ] as [TypeFilter, string][]
          ).map(([value, title]) => (
            <FilterChip
              key={value}
              title={title}
              selected={typeFilter === value}
              onPress={() => setTypeFilter(value)}
            />
          ))}
        </View>
        <Text
          style={[styles.fieldLabel, { color: colors.text, marginTop: 15 }]}
        >
          Tanggal
        </Text>
        <View style={styles.chipRow}>
          <FilterChip
            title="Bulan ini"
            selected={dateFilter === "month"}
            onPress={() => setDateFilter("month")}
          />
          <FilterChip
            title="Semua"
            selected={dateFilter === "all"}
            onPress={() => setDateFilter("all")}
          />
          <FilterChip
            title="Pilih tanggal"
            selected={dateFilter === "day"}
            onPress={() => setDateFilter("day")}
          />
        </View>
        {dateFilter === "day" ? (
          <View style={styles.datePicker}>
            <DatePickerField
              label="Tanggal transaksi"
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </View>
        ) : null}
        <Text
          style={[styles.fieldLabel, { color: colors.text, marginTop: 15 }]}
        >
          Kategori
        </Text>
        <View style={styles.chipRow}>
          <FilterChip
            title="Semua kategori"
            selected={categoryFilter === "Semua kategori"}
            onPress={() => setCategoryFilter("Semua kategori")}
          />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              title={category.name}
              selected={categoryFilter === category.name}
              onPress={() => setCategoryFilter(category.name)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.listHeader}>
          <SectionTitle>
            {dateFilter === "month"
              ? "Bulan ini"
              : dateFilter === "day"
                ? formatDate(toDateKey(selectedDate))
                : "Semua transaksi"}
          </SectionTitle>
          <Text style={[styles.resultCount, { color: colors.muted }]}>
            {filtered.length} data
          </Text>
        </View>
        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            message="Ubah filter atau tambahkan transaksi baru."
          />
        ) : (
          filtered.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onEdit={() => {
                setEditing(transaction);
                setInitialType(transaction.type);
                setFormVisible(true);
              }}
              onDelete={() => confirmDelete(transaction)}
            />
          ))
        )}
      </Card>
      <TransactionForm
        key={`${formVisible}-${editing?.id ?? "new"}-${initialType}`}
        visible={formVisible}
        categories={categories}
        initial={editing}
        initialType={initialType}
        onClose={() => setFormVisible(false)}
        onSave={save}
      />
    </AppShell>
  );
}

function FilterChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppContext();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primary : colors.muted,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 8 },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  datePicker: { marginTop: 15 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultCount: { fontSize: 11, marginTop: -7 },
});
