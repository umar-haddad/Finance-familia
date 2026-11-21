import { router } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/providers/app-provider";

const MENU_ITEMS = [
  { title: "Dashboard", icon: "⌂", path: "/" as const },
  { title: "Transaksi", icon: "↕", path: "/transactions" as const },
  { title: "Statistik", icon: "▥", path: "/statistics" as const },
  { title: "Hutang", icon: "◉", path: "/debts" as const },
  { title: "Saham", icon: "↗", path: "/stocks" as const },
  { title: "Pasangan & Sinkronisasi", icon: "♡", path: "/partner" as const },
  { title: "Pengaturan", icon: "⚙", path: "/settings" as const },
];

export function AppShell({
  title,
  children,
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  const { colors, name } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.text === "#F1F6F2" ? "light-content" : "dark-content"}
      />
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka menu"
          onPress={() => setMenuOpen(true)}
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text
            style={[styles.subtitle, { color: colors.muted }]}
            numberOfLines={1}
          >
            Finance Familia{name ? ` · ${name}` : ""}
          </Text>
        </View>
        {headerAction}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[styles.drawer, { backgroundColor: colors.surface }]}>
            <View style={styles.drawerHeading}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primarySoft }]}
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  PF
                </Text>
              </View>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>
                Finance Familia
              </Text>
              <Text style={[styles.drawerSubtitle, { color: colors.muted }]}>
                Data tersimpan di perangkat
              </Text>
            </View>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.path}
                onPress={() => {
                  setMenuOpen(false);
                  router.push(item.path);
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceAlt
                      : "transparent",
                  },
                ]}
              >
                <Text style={[styles.menuItemIcon, { color: colors.primary }]}>
                  {item.icon}
                </Text>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors } = useAppContext();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useAppContext();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { colors } = useAppContext();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧾</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.muted }]}>
        {message}
      </Text>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  compact?: boolean;
}) {
  const { colors } = useAppContext();
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.negativeSoft
        : variant === "secondary"
          ? colors.primarySoft
          : "transparent";
  const color =
    variant === "primary"
      ? colors.text === "#F1F6F2"
        ? "#13231A"
        : "#FFFFFF"
      : variant === "danger"
        ? colors.negative
        : colors.primary;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        compact && styles.actionButtonCompact,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.76 : 1 },
      ]}
    >
      <Text style={[styles.actionText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "numeric"
    | "decimal-pad"
    | "number-pad"
    | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  const { colors } = useAppContext();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        style={[
          styles.nativeInput,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            minHeight: multiline ? 92 : 48,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { fontSize: 21, fontWeight: "700" },
  headerTitle: { flex: 1 },
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 36, gap: 16 },
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.42)" },
  drawer: {
    width: "84%",
    maxWidth: 340,
    height: "100%",
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerHeading: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDE5DF",
    marginBottom: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontWeight: "800", fontSize: 17 },
  drawerTitle: { fontSize: 19, fontWeight: "800" },
  drawerSubtitle: { fontSize: 12, marginTop: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 13,
    paddingHorizontal: 10,
  },
  menuItemIcon: { width: 34, fontSize: 20 },
  menuItemTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  chevron: { fontSize: 24 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 18 },
  emptyIcon: { fontSize: 30, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  actionButtonCompact: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  actionText: { fontSize: 14, fontWeight: "700" },
  fieldGroup: { marginBottom: 13 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  nativeInput: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
  },
});
