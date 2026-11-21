import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  ActionButton,
  AppShell,
  Card,
  EmptyState,
  Field,
  SectionTitle,
} from "@/components/app-shell";
import { DatePickerField } from "@/components/date-picker-field";
import { getDatabase } from "@/database/db";
import {
  deleteStock,
  listStocks,
  saveStock,
} from "@/database/repositories/stockRepository";
import { useAppContext } from "@/providers/app-provider";
import type { Stock } from "@/types/finance";
import { confirmDestructiveAction, showMessage } from "@/utils/confirm";
import {
  formatAmountInput,
  formatCurrency,
  parseAmountInput,
} from "@/utils/currency";
import { formatDate, toDateKey } from "@/utils/date";

export default function StocksScreen() {
  const { colors, currency, deviceId } = useAppContext();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Stock | undefined>();
  const loadData = useCallback(async () => {
    try {
      setStocks(await listStocks(await getDatabase()));
    } catch (error) {
      Alert.alert(
        "Tidak dapat memuat saham",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const totalInvested = stocks.reduce(
    (sum, item) => sum + item.lots * 100 * item.buy_price,
    0,
  );
  const currentValue = stocks.reduce(
    (sum, item) => sum + item.lots * 100 * item.current_price,
    0,
  );
  const totalProfit = currentValue - totalInvested;

  const confirmDelete = (stock: Stock) => {
    confirmDestructiveAction(
      "Hapus saham?",
      `${stock.symbol} akan dihapus dari portofolio.`,
      "Hapus",
      async () => {
        try {
          await deleteStock(await getDatabase(), stock.id);
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
      title="Saham"
      headerAction={
        <ActionButton
          title="+ Tambah"
          compact
          onPress={() => {
            setEditing(undefined);
            setFormVisible(true);
          }}
        />
      }
    >
      <View style={[styles.info, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Portofolio tanpa koneksi
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          Harga beli dan harga pasar diisi manual. Estimasi tidak mengambil
          harga real-time dari internet.
        </Text>
      </View>
      <Card>
        <Text style={[styles.summaryLabel, { color: colors.muted }]}>
          Total nilai beli
        </Text>
        <Text style={[styles.total, { color: colors.text }]}>
          {formatCurrency(totalInvested, currency)}
        </Text>
        <View style={[styles.summaryBottom, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              Nilai pasar manual
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(currentValue, currency)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              Estimasi profit
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totalProfit >= 0 ? colors.positive : colors.negative },
              ]}
            >
              {totalProfit >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(totalProfit), currency)}
            </Text>
          </View>
        </View>
      </Card>
      <Card>
        <SectionTitle>Saham saya</SectionTitle>
        {stocks.length === 0 ? (
          <EmptyState
            title="Portofolio masih kosong"
            message="Tambahkan saham yang Anda miliki untuk menghitung nilai dan estimasi keuntungan."
          />
        ) : (
          stocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              currency={currency}
              onEdit={() => {
                setEditing(stock);
                setFormVisible(true);
              }}
              onDelete={() => confirmDelete(stock)}
            />
          ))
        )}
      </Card>
      <StockForm
        key={`${formVisible}-${editing?.id ?? "new"}`}
        visible={formVisible}
        initial={editing}
        currency={currency}
        onClose={() => setFormVisible(false)}
        onSave={async (draft) => {
          await saveStock(await getDatabase(), deviceId, draft, editing);
          await loadData();
        }}
      />
    </AppShell>
  );
}

function StockCard({
  stock,
  currency,
  onEdit,
  onDelete,
}: {
  stock: Stock;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppContext();
  const totalCost = stock.lots * 100 * stock.buy_price;
  const marketValue = stock.lots * 100 * stock.current_price;
  const profit = marketValue - totalCost;
  const change = totalCost ? (profit / totalCost) * 100 : 0;
  return (
    <View style={[styles.stockItem, { borderTopColor: colors.border }]}>
      <View style={styles.stockTop}>
        <View
          style={[styles.symbolBadge, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.symbol, { color: colors.primary }]}>
            {stock.symbol}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stockName, { color: colors.text }]}>
            {stock.name}
          </Text>
          <Text style={[styles.stockMeta, { color: colors.muted }]}>
            {stock.lots} lot · {stock.lots * 100} lembar
          </Text>
        </View>
        <Text
          style={[
            styles.profit,
            { color: profit >= 0 ? colors.positive : colors.negative },
          ]}
        >
          {profit >= 0 ? "+" : "−"}
          {formatCurrency(Math.abs(profit), currency)}
        </Text>
      </View>
      <View style={styles.priceRow}>
        <Price
          label="Harga beli"
          amount={stock.buy_price}
          currency={currency}
        />
        <Price
          label="Harga pasar"
          amount={stock.current_price}
          currency={currency}
        />
        <Price
          label="Perubahan"
          amount={change}
          currency=""
          suffix="%"
          tint={profit >= 0 ? colors.positive : colors.negative}
        />
      </View>
      <Text style={[styles.stockDate, { color: colors.muted }]}>
        Dibeli {formatDate(stock.buy_date)}
      </Text>
      {stock.description ? (
        <Text style={[styles.stockNote, { color: colors.muted }]}>
          {stock.description}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <ActionButton
          title="Edit harga/data"
          compact
          variant="secondary"
          onPress={onEdit}
        />
        <ActionButton
          title="Hapus"
          compact
          variant="danger"
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function Price({
  label,
  amount,
  currency,
  suffix,
  tint,
}: {
  label: string;
  amount: number;
  currency: string;
  suffix?: string;
  tint?: string;
}) {
  const { colors } = useAppContext();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.priceLabel, { color: colors.muted }]}>{label}</Text>
      <Text
        style={[styles.priceValue, { color: tint ?? colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {currency ? formatCurrency(amount, currency) : amount.toFixed(1)}
        {suffix}
      </Text>
    </View>
  );
}

function StockForm({
  visible,
  initial,
  currency,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: Stock;
  currency: string;
  onClose: () => void;
  onSave: (draft: {
    symbol: string;
    name: string;
    lots: number;
    buy_price: number;
    current_price: number;
    buy_date: string;
    description: string;
  }) => Promise<void>;
}) {
  const { colors } = useAppContext();
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [lots, setLots] = useState(initial ? String(initial.lots) : "");
  const [buyPrice, setBuyPrice] = useState(
    initial ? formatAmountInput(String(initial.buy_price), currency) : "",
  );
  const [currentPrice, setCurrentPrice] = useState(
    initial ? formatAmountInput(String(initial.current_price), currency) : "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [buyDate, setBuyDate] = useState(
    initial ? new Date(`${initial.buy_date}T12:00:00`) : new Date(),
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedLots = Number(lots.replace(",", "."));
    const parsedBuy = parseAmountInput(buyPrice, currency);
    const parsedCurrent = parseAmountInput(currentPrice, currency);
    if (!symbol.trim() || !name.trim()) {
      Alert.alert("Data belum lengkap", "Kode dan nama saham wajib diisi.");
      return;
    }
    if (
      ![parsedLots, parsedBuy, parsedCurrent].every(Number.isFinite) ||
      parsedLots <= 0 ||
      parsedBuy < 0 ||
      parsedCurrent < 0
    ) {
      Alert.alert(
        "Nominal tidak valid",
        "Lot harus lebih dari nol dan harga tidak boleh negatif.",
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        lots: parsedLots,
        buy_price: parsedBuy,
        current_price: parsedCurrent,
        buy_date: toDateKey(buyDate),
        description: description.trim(),
      });
      onClose();
    } catch (error) {
      Alert.alert(
        "Data saham gagal disimpan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {initial ? "Edit saham" : "Tambah saham"}
              </Text>
              <Pressable onPress={onClose}>
                <Text style={[styles.close, { color: colors.muted }]}>✕</Text>
              </Pressable>
            </View>
            <Field
              label="Kode saham"
              value={symbol}
              onChangeText={setSymbol}
              placeholder="BBCA"
            />
            <Field
              label="Nama saham"
              value={name}
              onChangeText={setName}
              placeholder="Bank Central Asia"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Jumlah lot"
                  value={lots}
                  onChangeText={(text) => setLots(text.replace(/[^\d.,]/g, ""))}
                  placeholder="10"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Harga beli/lembar"
                  value={buyPrice}
                  onChangeText={(text) =>
                    setBuyPrice(formatAmountInput(text, currency))
                  }
                  placeholder="9.000"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Field
              label={`Harga pasar manual/lembar (${currency})`}
              value={currentPrice}
              onChangeText={(text) =>
                setCurrentPrice(formatAmountInput(text, currency))
              }
              placeholder="10.000"
              keyboardType="decimal-pad"
            />
            <View style={styles.dateField}>
              <DatePickerField
                label="Tanggal beli"
                value={buyDate}
                onChange={setBuyDate}
              />
            </View>
            <Field
              label="Catatan"
              value={description}
              onChangeText={setDescription}
              placeholder="Opsional"
              multiline
            />
            <View style={{ marginTop: 5, marginBottom: 10 }}>
              <ActionButton
                title={saving ? "Menyimpan..." : "Simpan saham"}
                onPress={() => void submit()}
                disabled={saving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  info: { padding: 16, borderRadius: 18 },
  infoTitle: { fontWeight: "800", fontSize: 14 },
  infoText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  summaryLabel: { fontSize: 11, fontWeight: "600" },
  total: { fontSize: 24, fontWeight: "800", marginTop: 6 },
  summaryBottom: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 13,
    marginTop: 14,
  },
  summaryValue: { fontSize: 13, fontWeight: "800", marginTop: 5 },
  stockItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 15,
    paddingBottom: 14,
  },
  stockTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  symbolBadge: {
    width: 52,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { fontSize: 12, fontWeight: "900" },
  stockName: { fontSize: 13, fontWeight: "800" },
  stockMeta: { fontSize: 10, marginTop: 4 },
  profit: { fontSize: 12, fontWeight: "800" },
  priceRow: { flexDirection: "row", gap: 7, marginTop: 15 },
  priceLabel: { fontSize: 9, fontWeight: "600" },
  priceValue: { fontSize: 11, fontWeight: "800", marginTop: 4 },
  stockDate: { fontSize: 10, marginTop: 11 },
  stockNote: { fontSize: 11, marginTop: 5 },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 12,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    maxHeight: "94%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#B9C4BD",
    alignSelf: "center",
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: { fontSize: 20, fontWeight: "800" },
  close: { fontSize: 18, padding: 5 },
  row: { flexDirection: "row", gap: 10 },
  dateField: { marginBottom: 14 },
});
