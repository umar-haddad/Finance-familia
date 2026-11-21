import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  ActionButton,
  AppShell,
  Card,
  Field,
  SectionTitle,
} from "@/components/app-shell";
import { BackupManager } from "@/components/backup-manager";
import { WhatsAppCodeVerification } from "@/components/whatsapp-code-verification";
import { getDatabase, getSetting } from "@/database/db";
import {
  addCategory,
  listCategories,
} from "@/database/repositories/categoryRepository";
import { CURRENCIES } from "@/constants/finance";
import { useAppContext, type ThemePreference } from "@/providers/app-provider";
import type { Category } from "@/types/finance";
import { showMessage } from "@/utils/confirm";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
];

export default function SettingsScreen() {
  const {
    colors,
    name,
    phone,
    currency,
    theme,
    pinEnabled,
    updateProfile,
    updatePhone,
    updateTheme,
    setPin,
    removePin,
    lockNow,
  } = useAppContext();
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileName, setProfileName] = useState(name);
  const [profilePhone, setProfilePhone] = useState(phone);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [categoryName, setCategoryName] = useState("");
  const [pin, setPinValue] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const currentDatabase = await getDatabase();
      const [currentCategories, savedVerifiedPhone] = await Promise.all([
        listCategories(currentDatabase),
        getSetting("profile_phone_verified"),
      ]);
      setDatabase(currentDatabase);
      setCategories(currentCategories);
      setVerifiedPhone(savedVerifiedPhone ?? "");
    } catch (error) {
      Alert.alert(
        "Pengaturan gagal dimuat",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadData();
      setProfileName(name);
      setProfilePhone(phone);
      setSelectedCurrency(currency);
    }, [loadData, name, phone, currency]),
  );

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profileName, selectedCurrency);
      if (profilePhone.trim() !== phone) {
        showMessage(
          "Profil tersimpan",
          "Nama dan mata uang tersimpan. Konfirmasi nomor WhatsApp sebelum nomor baru disimpan.",
        );
      } else {
        showMessage(
          "Profil tersimpan",
          "Nama dan mata uang disimpan di perangkat ini.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Profil gagal disimpan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!database) return;
    try {
      await addCategory(database, categoryName, "both");
      setCategoryName("");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Kategori tidak dapat ditambahkan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  };

  const savePin = async () => {
    if (pin !== pinConfirmation) {
      Alert.alert("PIN tidak sama", "Ketikkan PIN yang sama pada kedua kolom.");
      return;
    }
    try {
      await setPin(pin);
      setPinValue("");
      setPinConfirmation("");
      Alert.alert(
        "App Lock aktif",
        "PIN tersimpan secara aman. Aplikasi akan meminta PIN saat dibuka kembali.",
      );
    } catch (error) {
      Alert.alert(
        "PIN tidak dapat disimpan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  };

  const confirmRemovePin = () => {
    Alert.alert(
      "Nonaktifkan App Lock?",
      "PIN aman akan dihapus dari penyimpanan perangkat.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Nonaktifkan",
          style: "destructive",
          onPress: () => {
            void removePin().catch((error: unknown) => {
              Alert.alert(
                "PIN tidak dapat dihapus",
                error instanceof Error ? error.message : "Coba lagi.",
              );
            });
          },
        },
      ],
    );
  };

  return (
    <AppShell title="Pengaturan">
      <Card>
        <SectionTitle>Profil lokal</SectionTitle>
        <Text style={[styles.helper, { color: colors.muted }]}>
          Tidak ada akun, email, password, atau sinkronisasi otomatis ke cloud.
        </Text>
        <Field
          label="Nama"
          value={profileName}
          onChangeText={setProfileName}
          placeholder="Nama Anda"
        />
        <Field
          label="Nomor WhatsApp Anda"
          value={profilePhone}
          onChangeText={setProfilePhone}
          placeholder="+628123456789"
          keyboardType="phone-pad"
        />
        <WhatsAppCodeVerification
          key={profilePhone.trim()}
          phone={profilePhone}
          recipient="self"
          verified={
            Boolean(profilePhone.trim()) &&
            verifiedPhone === profilePhone.trim()
          }
          onVerified={async (verifiedNumber) => {
            await updatePhone(verifiedNumber);
            setVerifiedPhone(verifiedNumber);
            setProfilePhone(verifiedNumber);
          }}
        />
        <Text style={[styles.label, { color: colors.text }]}>Mata uang</Text>
        <View style={styles.choiceRow}>
          {CURRENCIES.map((option) => (
            <Choice
              key={option.code}
              title={option.code}
              selected={selectedCurrency === option.code}
              onPress={() => setSelectedCurrency(option.code)}
            />
          ))}
        </View>
        <View style={styles.buttonSpacing}>
          <ActionButton
            title={saving ? "Menyimpan..." : "Simpan profil"}
            onPress={() => void saveProfile()}
            disabled={saving}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Tampilan</SectionTitle>
        <Text style={[styles.helper, { color: colors.muted }]}>
          Atur tampilan terang atau gelap.
        </Text>
        <View style={styles.choiceRow}>
          {THEMES.map((option) => (
            <Choice
              key={option.value}
              title={option.label}
              selected={theme === option.value}
              onPress={() => {
                void updateTheme(option.value).catch((error: unknown) => {
                  Alert.alert(
                    "Tema gagal disimpan",
                    error instanceof Error ? error.message : "Coba lagi.",
                  );
                });
              }}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Kategori transaksi</SectionTitle>
        <Text style={[styles.helper, { color: colors.muted }]}>
          Kategori khusus disimpan di SQLite dan ikut ke file sync.
        </Text>
        <Field
          label="Nama kategori baru"
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="Contoh: Hewan peliharaan"
        />
        <View style={styles.buttonSpacing}>
          <ActionButton
            title="Tambah kategori"
            variant="secondary"
            onPress={() => void saveCategory()}
          />
        </View>
        <View style={styles.categoryWrap}>
          {categories.map((category) => (
            <View
              key={category.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text style={[styles.categoryText, { color: colors.text }]}>
                {category.name}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>App Lock</SectionTitle>
        <Text style={[styles.helper, { color: colors.muted }]}>
          PIN 4-6 angka di-hash dan disimpan melalui SecureStore, bukan sebagai
          teks biasa. App Lock opsional.
        </Text>
        {pinEnabled ? (
          <>
            <Text style={[styles.enabled, { color: colors.positive }]}>
              ● App Lock aktif
            </Text>
            <View style={styles.buttonSpacing}>
              <ActionButton
                title="Kunci sekarang"
                variant="secondary"
                onPress={lockNow}
              />
            </View>
            <ActionButton
              title="Nonaktifkan PIN"
              variant="danger"
              onPress={confirmRemovePin}
            />
          </>
        ) : (
          <>
            <Field
              label="PIN baru"
              value={pin}
              onChangeText={(text) =>
                setPinValue(text.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="4-6 angka"
              keyboardType="number-pad"
              secureTextEntry
            />
            <Field
              label="Ulangi PIN"
              value={pinConfirmation}
              onChangeText={(text) =>
                setPinConfirmation(text.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Ulangi PIN"
              keyboardType="number-pad"
              secureTextEntry
            />
            <ActionButton
              title="Aktifkan App Lock"
              onPress={() => void savePin()}
            />
          </>
        )}
      </Card>

      {database ? (
        <BackupManager
          database={database}
          onComplete={loadData}
          mode="backup"
        />
      ) : null}
      <Text style={[styles.footer, { color: colors.muted }]}>
        Device ID {useAppDeviceId()}
      </Text>
    </AppShell>
  );
}

function useAppDeviceId(): string {
  const { deviceId } = useAppContext();
  return deviceId.slice(0, 8).toUpperCase();
}

function Choice({
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
        styles.choice,
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
          fontWeight: "800",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 13 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 8 },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  choice: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSpacing: { marginBottom: 9 },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  categoryChip: { borderRadius: 15, paddingVertical: 7, paddingHorizontal: 10 },
  categoryText: { fontSize: 10, fontWeight: "600" },
  enabled: { fontSize: 12, fontWeight: "800", marginBottom: 12 },
  footer: { textAlign: "center", fontSize: 10 },
});
