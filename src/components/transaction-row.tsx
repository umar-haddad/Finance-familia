import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppContext } from "@/providers/app-provider";
import type { Transaction } from "@/types/finance";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";

export function TransactionRow({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { colors, currency } = useAppContext();
  const income = transaction.type === "income";
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: income ? colors.primarySoft : colors.negativeSoft,
          },
        ]}
      >
        <Text
          style={{
            color: income ? colors.positive : colors.negative,
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          {income ? "+" : "−"}
        </Text>
      </View>
      <Pressable disabled={!onEdit} onPress={onEdit} style={styles.details}>
        <Text
          style={[styles.description, { color: colors.text }]}
          numberOfLines={1}
        >
          {transaction.description}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {transaction.category} · {formatDate(transaction.date)}
        </Text>
        <Text
          style={[
            styles.syncStatus,
            {
              color:
                transaction.sync_status === "pending"
                  ? colors.warning
                  : colors.positive,
            },
          ]}
        >
          {transaction.sync_status === "pending"
            ? "Belum disinkronkan"
            : "Tersinkron"}
        </Text>
      </Pressable>
      <View style={styles.amountWrap}>
        <Text
          style={[
            styles.amount,
            { color: income ? colors.positive : colors.text },
          ]}
        >
          {income ? "+" : "−"}
          {formatCurrency(transaction.amount, currency)}
        </Text>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityLabel="Hapus transaksi"
            hitSlop={8}
          >
            <Text style={[styles.delete, { color: colors.muted }]}>Hapus</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 11,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  details: { flex: 1, minWidth: 0 },
  description: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 11, marginTop: 4 },
  syncStatus: { fontSize: 10, marginTop: 4 },
  amountWrap: { alignItems: "flex-end", gap: 5 },
  amount: { fontSize: 13, fontWeight: "800" },
  delete: { fontSize: 11, fontWeight: "600" },
});
