import { useState } from "react";
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

import { ActionButton, Field } from "@/components/app-shell";
import { DatePickerField } from "@/components/date-picker-field";
import { useAppContext } from "@/providers/app-provider";
import type { Category, Transaction, TransactionType } from "@/types/finance";
import { formatAmountInput, parseAmountInput } from "@/utils/currency";
import { toDateKey } from "@/utils/date";
import type { TransactionDraft } from "@/database/repositories/transactionRepository";

export function TransactionForm({
  visible,
  categories,
  initial,
  initialType = "expense",
  onClose,
  onSave,
}: {
  visible: boolean;
  categories: Category[];
  initial?: Transaction;
  initialType?: TransactionType;
  onClose: () => void;
  onSave: (draft: TransactionDraft, existing?: Transaction) => Promise<void>;
}) {
  const { colors, currency } = useAppContext();
  const [type, setType] = useState<TransactionType>(
    initial?.type ?? initialType,
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? formatAmountInput(String(initial.amount), currency) : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(
    initial ? new Date(`${initial.date}T12:00:00`) : new Date(),
  );
  const [saving, setSaving] = useState(false);

  const availableCategories = categories.filter(
    (item) => item.type === type || item.type === "both",
  );
  const selectedCategory = availableCategories.some(
    (item) => item.name === category,
  )
    ? category
    : (availableCategories[0]?.name ?? "");

  const submit = async () => {
    const parsedAmount = parseAmountInput(amount, currency);
    if (!description.trim()) {
      Alert.alert("Perlu deskripsi", "Masukkan keterangan transaksi.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Nominal tidak valid", "Nominal harus lebih besar dari nol.");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Perlu kategori", "Pilih kategori transaksi.");
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          type,
          description: description.trim(),
          amount: parsedAmount,
          category: selectedCategory,
          date: toDateKey(date),
        },
        initial,
      );
      onClose();
    } catch (error) {
      Alert.alert(
        "Transaksi gagal disimpan",
        error instanceof Error ? error.message : "Silakan coba lagi.",
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>
                {initial ? "Edit transaksi" : "Transaksi baru"}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: colors.muted }]}>
                  ✕
                </Text>
              </Pressable>
            </View>
            <View
              style={[
                styles.typeSwitch,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              {(["income", "expense"] as const).map((value) => {
                const selected = type === value;
                const accent =
                  value === "income" ? colors.positive : colors.negative;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setType(value);
                      const nextCategories = categories.filter(
                        (item) => item.type === value || item.type === "both",
                      );
                      if (
                        !nextCategories.some((item) => item.name === category)
                      ) {
                        setCategory(nextCategories[0]?.name ?? "");
                      }
                    }}
                    style={[
                      styles.typeButton,
                      selected && {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? accent : colors.muted,
                        fontWeight: "800",
                      }}
                    >
                      {value === "income" ? "+ Pemasukan" : "− Pengeluaran"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="Keterangan"
              value={description}
              onChangeText={setDescription}
              placeholder="Contoh: Gaji bulanan"
            />
            <Field
              label={`Nominal (${currency})`}
              value={amount}
              onChangeText={(text) =>
                setAmount(formatAmountInput(text, currency))
              }
              placeholder="Contoh: 50.000"
              keyboardType="decimal-pad"
            />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Kategori
            </Text>
            <View style={styles.categoryList}>
              {availableCategories.map((item) => {
                const selected = selectedCategory === item.name;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setCategory(item.name)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? colors.primarySoft
                          : colors.surfaceAlt,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? colors.primary : colors.muted,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.dateContainer}>
              <DatePickerField
                label="Tanggal"
                value={date}
                onChange={setDate}
              />
            </View>
            <View style={styles.actions}>
              <ActionButton
                title={saving ? "Menyimpan..." : "Simpan transaksi"}
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
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    maxHeight: "94%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#B9C4BD",
    alignSelf: "center",
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  title: { flex: 1, fontSize: 21, fontWeight: "800" },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 17 },
  typeSwitch: {
    flexDirection: "row",
    padding: 5,
    borderRadius: 15,
    marginBottom: 18,
    gap: 5,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "transparent",
  },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  dateContainer: { marginBottom: 17 },
  actions: { paddingBottom: 12 },
});
