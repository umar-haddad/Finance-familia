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
  addDebtPayment,
  deleteDebt,
  listDebts,
  saveDebt,
} from "@/database/repositories/debtRepository";
import { useAppContext } from "@/providers/app-provider";
import type { Debt, DebtStatus, DebtType } from "@/types/finance";
import { confirmDestructiveAction, showMessage } from "@/utils/confirm";
import {
  formatAmountInput,
  formatCurrency,
  parseAmountInput,
} from "@/utils/currency";
import { formatDate, toDateKey } from "@/utils/date";

export default function DebtsScreen() {
  const { colors, currency, deviceId } = useAppContext();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Debt | undefined>();
  const [paymentDebt, setPaymentDebt] = useState<Debt | undefined>();

  const loadData = useCallback(async () => {
    try {
      setDebts(await listDebts(await getDatabase()));
    } catch (error) {
      Alert.alert(
        "Tidak dapat memuat hutang",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const confirmDelete = (debt: Debt) => {
    confirmDestructiveAction(
      "Hapus catatan hutang?",
      `Catatan untuk ${debt.person_name} akan dihapus dari daftar.`,
      "Hapus",
      async () => {
        try {
          await deleteDebt(await getDatabase(), debt.id);
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
      title="Hutang"
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
          Catat dan pantau hutang
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          Pembayaran sebagian langsung menghitung sisa. Catatan disimpan lokal
          dan dapat ikut dibagikan sebagai file.
        </Text>
      </View>
      <Card>
        <SectionTitle>Daftar hutang</SectionTitle>
        {debts.length === 0 ? (
          <EmptyState
            title="Belum ada catatan hutang"
            message="Tambahkan hutang yang Anda miliki atau piutang kepada orang lain."
          />
        ) : (
          debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={() => {
                setEditing(debt);
                setFormVisible(true);
              }}
              onPay={() => setPaymentDebt(debt)}
              onDelete={() => confirmDelete(debt)}
            />
          ))
        )}
      </Card>
      <DebtForm
        key={`${formVisible}-${editing?.id ?? "new"}`}
        visible={formVisible}
        initial={editing}
        currency={currency}
        colors={colors}
        onClose={() => setFormVisible(false)}
        onSave={async (draft) => {
          await saveDebt(await getDatabase(), deviceId, draft, editing);
          await loadData();
        }}
      />
      <PaymentForm
        debt={paymentDebt}
        currency={currency}
        onClose={() => setPaymentDebt(undefined)}
        onSave={async (amount) => {
          if (!paymentDebt) return;
          await addDebtPayment(await getDatabase(), paymentDebt, amount);
          setPaymentDebt(undefined);
          await loadData();
        }}
      />
    </AppShell>
  );
}

function DebtCard({
  debt,
  onEdit,
  onPay,
  onDelete,
}: {
  debt: Debt;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const { colors, currency } = useAppContext();
  const remaining = Math.max(0, debt.amount - debt.paid_amount);
  const progress = Math.min(1, debt.paid_amount / debt.amount);
  const typeLabel = debt.type === "owed" ? "Saya berhutang" : "Piutang saya";
  return (
    <View style={[styles.debtItem, { borderTopColor: colors.border }]}>
      <View style={styles.debtTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.person, { color: colors.text }]}>
            {debt.person_name}
          </Text>
          <Text
            style={[styles.description, { color: colors.muted }]}
            numberOfLines={2}
          >
            {typeLabel} · {debt.description || "Tanpa keterangan"}
          </Text>
        </View>
        <Text
          style={[styles.status, { color: statusColor(debt.status, colors) }]}
        >
          {statusLabel(debt.status)}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.amountLabel, { color: colors.muted }]}>Sisa</Text>
        <Text
          style={[
            styles.remaining,
            { color: remaining > 0 ? colors.negative : colors.positive },
          ]}
        >
          {formatCurrency(remaining, currency)}
        </Text>
      </View>
      <Text style={[styles.paid, { color: colors.muted }]}>
        Terbayar {formatCurrency(debt.paid_amount, currency)} dari{" "}
        {formatCurrency(debt.amount, currency)}
      </Text>
      <View
        style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.positive },
          ]}
        />
      </View>
      <Text style={[styles.dueDate, { color: colors.muted }]}>
        Jatuh tempo:{" "}
        {debt.due_date ? formatDate(debt.due_date) : "Belum ditentukan"}
      </Text>
      <View style={styles.actions}>
        {remaining > 0 ? (
          <ActionButton title="Bayar" compact onPress={onPay} />
        ) : null}
        <ActionButton
          title="Edit"
          variant="secondary"
          compact
          onPress={onEdit}
        />
        <ActionButton
          title="Hapus"
          variant="danger"
          compact
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function statusLabel(status: DebtStatus): string {
  if (status === "paid") return "Lunas";
  if (status === "partial") return "Sebagian";
  return "Belum lunas";
}

function statusColor(
  status: DebtStatus,
  colors: ReturnType<typeof useAppContext>["colors"],
): string {
  return status === "paid"
    ? colors.positive
    : status === "partial"
      ? colors.warning
      : colors.negative;
}

function DebtForm({
  visible,
  initial,
  currency,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: Debt;
  currency: string;
  colors: ReturnType<typeof useAppContext>["colors"];
  onClose: () => void;
  onSave: (draft: {
    person_name: string;
    description: string;
    type: DebtType;
    amount: number;
    paid_amount: number;
    date: string;
    due_date: string | null;
  }) => Promise<void>;
}) {
  const [person, setPerson] = useState(initial?.person_name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? formatAmountInput(String(initial.amount), currency) : "",
  );
  const [paidAmount, setPaidAmount] = useState(
    initial ? formatAmountInput(String(initial.paid_amount), currency) : "0",
  );
  const [type, setType] = useState<DebtType>(initial?.type ?? "owed");
  const [date, setDate] = useState(
    initial ? new Date(`${initial.date}T12:00:00`) : new Date(),
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    initial?.due_date ? new Date(`${initial.due_date}T12:00:00`) : null,
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const total = parseAmountInput(amount, currency);
    const paid = parseAmountInput(paidAmount, currency);
    if (!person.trim() || !Number.isFinite(total) || total <= 0) {
      Alert.alert(
        "Data belum lengkap",
        "Nama dan nominal hutang yang valid wajib diisi.",
      );
      return;
    }
    if (!Number.isFinite(paid) || paid < 0 || paid > total) {
      Alert.alert(
        "Pembayaran tidak valid",
        "Nominal terbayar tidak boleh melebihi total hutang.",
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        person_name: person.trim(),
        description: description.trim(),
        type,
        amount: total,
        paid_amount: paid,
        date: toDateKey(date),
        due_date: dueDate ? toDateKey(dueDate) : null,
      });
      onClose();
    } catch (error) {
      Alert.alert(
        "Hutang gagal disimpan",
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
            <View style={styles.titleRow}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {initial ? "Edit hutang" : "Tambah hutang"}
              </Text>
              <Pressable onPress={onClose}>
                <Text style={[styles.close, { color: colors.muted }]}>✕</Text>
              </Pressable>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Jenis
            </Text>
            <View style={styles.typeRow}>
              <TypeButton
                label="Saya berhutang"
                selected={type === "owed"}
                onPress={() => setType("owed")}
              />
              <TypeButton
                label="Piutang saya"
                selected={type === "lent"}
                onPress={() => setType("lent")}
              />
            </View>
            <Field
              label="Nama orang"
              value={person}
              onChangeText={setPerson}
              placeholder="Contoh: Budi"
            />
            <Field
              label="Keterangan"
              value={description}
              onChangeText={setDescription}
              placeholder="Contoh: Pinjaman"
            />
            <Field
              label={`Total nominal (${currency})`}
              value={amount}
              onChangeText={(text) =>
                setAmount(formatAmountInput(text, currency))
              }
              placeholder="500.000"
              keyboardType="decimal-pad"
            />
            <Field
              label={`Sudah dibayar (${currency})`}
              value={paidAmount}
              onChangeText={(text) =>
                setPaidAmount(formatAmountInput(text, currency))
              }
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <View style={styles.dateField}>
              <DatePickerField
                label="Tanggal"
                value={date}
                onChange={setDate}
              />
            </View>
            {dueDate ? (
              <View style={styles.dateField}>
                <DatePickerField
                  label="Jatuh tempo"
                  value={dueDate}
                  onChange={setDueDate}
                />
                <Pressable
                  onPress={() => setDueDate(null)}
                  style={styles.clearDue}
                >
                  <Text style={{ color: colors.negative }}>
                    Hapus jatuh tempo
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setDueDate(new Date())}
                style={[styles.addDue, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  + Tambah jatuh tempo
                </Text>
              </Pressable>
            )}
            <View style={{ marginTop: 16, marginBottom: 10 }}>
              <ActionButton
                title={saving ? "Menyimpan..." : "Simpan hutang"}
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

function TypeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppContext();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeButton,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primary : colors.muted,
          fontSize: 12,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PaymentForm({
  debt,
  currency,
  onClose,
  onSave,
}: {
  debt?: Debt;
  currency: string;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}) {
  const { colors } = useAppContext();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const remaining = debt ? debt.amount - debt.paid_amount : 0;
  const submit = async () => {
    const payment = parseAmountInput(amount, currency);
    if (!Number.isFinite(payment) || payment <= 0 || payment > remaining) {
      Alert.alert(
        "Nominal tidak valid",
        `Masukkan nilai sampai ${formatCurrency(remaining, currency)}.`,
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(payment);
      setAmount("");
    } catch (error) {
      Alert.alert(
        "Pembayaran gagal",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={Boolean(debt)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centerModal}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.paymentCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            Catat pembayaran
          </Text>
          <Text style={[styles.paymentText, { color: colors.muted }]}>
            Sisa hutang {debt?.person_name}:{" "}
            {formatCurrency(remaining, currency)}
          </Text>
          <Field
            label={`Nominal pembayaran (${currency})`}
            value={amount}
            onChangeText={(text) =>
              setAmount(formatAmountInput(text, currency))
            }
            placeholder="100.000"
            keyboardType="decimal-pad"
          />
          <View style={styles.paymentActions}>
            <ActionButton title="Batal" variant="secondary" onPress={onClose} />
            <View style={{ flex: 1 }} />
            <ActionButton
              title={saving ? "Menyimpan..." : "Bayar"}
              onPress={() => void submit()}
              disabled={saving}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  info: { padding: 16, borderRadius: 18 },
  infoTitle: { fontWeight: "800", fontSize: 14 },
  infoText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  debtItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 13,
    marginTop: 2,
  },
  debtTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  person: { fontSize: 16, fontWeight: "800" },
  description: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  status: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  amountLabel: { fontSize: 11 },
  remaining: { fontSize: 17, fontWeight: "800" },
  paid: { fontSize: 10, marginTop: 4 },
  progressTrack: {
    height: 7,
    borderRadius: 5,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 5 },
  dueDate: { fontSize: 11, marginTop: 10 },
  actions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 13,
    justifyContent: "flex-end",
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: { fontSize: 20, fontWeight: "800" },
  close: { fontSize: 18, padding: 5 },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 15 },
  typeButton: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  dateField: { marginBottom: 12 },
  clearDue: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 },
  addDue: {
    minHeight: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  centerModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  paymentCard: { width: "100%", maxWidth: 400, borderRadius: 22, padding: 20 },
  paymentText: { fontSize: 12, marginTop: 6, marginBottom: 16 },
  paymentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
});
