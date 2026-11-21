import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PALETTE } from "@/constants/finance";
import {
  getDatabase,
  getDeviceId,
  getSetting,
  setSetting,
} from "@/database/db";
import {
  createVerificationCode,
  openWhatsAppVerification,
} from "@/services/whatsappVerification";
import { createId } from "@/utils/ids";

export type ThemePreference = "system" | "light" | "dark";

interface AppContextValue {
  ready: boolean;
  deviceId: string;
  name: string;
  phone: string;
  currency: string;
  theme: ThemePreference;
  isDark: boolean;
  colors: (typeof PALETTE)["light"] | (typeof PALETTE)["dark"];
  locked: boolean;
  pinEnabled: boolean;
  updateProfile: (
    name: string,
    currency: string,
    phone?: string,
  ) => Promise<void>;
  updatePhone: (phone: string) => Promise<void>;
  updateTheme: (theme: ThemePreference) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lockNow: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context)
    throw new Error(
      "useAppContext harus digunakan di dalam AppContextProvider.",
    );
  return context;
}

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneChallenge, setPhoneChallenge] = useState("");
  const [phoneCodeInput, setPhoneCodeInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [currency, setCurrency] = useState("IDR");
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [locked, setLocked] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const initialize = useCallback(async () => {
    try {
      await getDatabase();
      const [
        id,
        savedName,
        savedPhone,
        savedPhoneVerification,
        savedCurrency,
        savedTheme,
        pin,
      ] = await Promise.all([
        getDeviceId(),
        getSetting("profile_name"),
        getSetting("profile_phone"),
        getSetting("profile_phone_verified"),
        getSetting("currency"),
        getSetting("theme"),
        SecureStore.getItemAsync("app_pin_hash"),
      ]);
      setDeviceId(id);
      setName(savedName ?? "");
      setPhone(savedPhone ?? "");
      setPhoneVerified(
        Boolean(savedPhone && savedPhoneVerification === savedPhone),
      );
      setPhoneInput(savedPhone ?? "");
      setCurrency(savedCurrency ?? "IDR");
      setTheme(
        savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system",
      );
      setStoredPin(pin);
      setLocked(Boolean(pin));
      setReady(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Penyimpanan lokal gagal dibuka.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void initialize(), 0);
    return () => clearTimeout(timer);
  }, [initialize]);

  const updatePhone = useCallback(async (nextPhone: string) => {
    const cleanPhone = nextPhone.trim();
    if (!isValidPhoneNumber(cleanPhone)) {
      throw new Error(
        "Masukkan nomor telepon yang valid, termasuk kode negara jika diperlukan.",
      );
    }
    await Promise.all([
      setSetting("profile_phone", cleanPhone),
      setSetting("profile_phone_verified", cleanPhone),
    ]);
    setPhone(cleanPhone);
    setPhoneVerified(true);
  }, []);

  const updateProfile = useCallback(
    async (nextName: string, nextCurrency: string, nextPhone?: string) => {
      const cleanName = nextName.trim();
      if (!cleanName) throw new Error("Nama pengguna wajib diisi.");
      const cleanPhone = nextPhone?.trim();
      if (cleanPhone !== undefined) {
        if (!isValidPhoneNumber(cleanPhone)) {
          throw new Error(
            "Masukkan nomor telepon yang valid, termasuk kode negara jika diperlukan.",
          );
        }
      }
      const updates = [
        setSetting("profile_name", cleanName),
        setSetting("currency", nextCurrency),
      ];
      if (cleanPhone !== undefined) {
        updates.push(setSetting("profile_phone", cleanPhone));
        if (cleanPhone !== phone)
          updates.push(setSetting("profile_phone_verified", ""));
      }
      await Promise.all(updates);
      setName(cleanName);
      setCurrency(nextCurrency);
      if (cleanPhone !== undefined) {
        setPhone(cleanPhone);
        if (cleanPhone !== phone) setPhoneVerified(false);
      }
    },
    [phone],
  );

  const updateTheme = useCallback(async (nextTheme: ThemePreference) => {
    await setSetting("theme", nextTheme);
    setTheme(nextTheme);
  }, []);

  const setPin = useCallback(async (pin: string) => {
    if (!/^\d{4,6}$/.test(pin))
      throw new Error("PIN harus terdiri dari 4 sampai 6 angka.");
    const salt = createId();
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`,
    );
    const value = `${salt}:${digest}`;
    await SecureStore.setItemAsync("app_pin_hash", value);
    setStoredPin(value);
    setLocked(false);
  }, []);

  const removePin = useCallback(async () => {
    await SecureStore.deleteItemAsync("app_pin_hash");
    setStoredPin(null);
    setLocked(false);
  }, []);

  const unlock = useCallback(
    async (pin: string) => {
      if (!storedPin) {
        setLocked(false);
        return true;
      }
      const [salt, expectedDigest] = storedPin.split(":");
      if (!salt || !expectedDigest) return false;
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}:${pin}`,
      );
      if (digest !== expectedDigest) return false;
      setLocked(false);
      setPinInput("");
      setPinError("");
      return true;
    },
    [storedPin],
  );

  const systemScheme = useColorScheme();
  const isDark =
    theme === "dark" || (theme === "system" && systemScheme === "dark");
  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      deviceId,
      name,
      phone,
      currency,
      theme,
      isDark,
      colors: isDark ? PALETTE.dark : PALETTE.light,
      locked,
      pinEnabled: Boolean(storedPin),
      updateProfile,
      updatePhone,
      updateTheme,
      setPin,
      removePin,
      unlock,
      lockNow: () => setLocked(Boolean(storedPin)),
    }),
    [
      ready,
      deviceId,
      name,
      phone,
      currency,
      theme,
      isDark,
      locked,
      storedPin,
      updateProfile,
      updatePhone,
      updateTheme,
      setPin,
      removePin,
      unlock,
    ],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Penyimpanan belum siap</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => {
            setError(null);
            void initialize();
          }}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#177D57" />
        <Text style={styles.errorText}>Menyiapkan data di perangkat...</Text>
      </View>
    );
  }

  if (locked) {
    const submitPin = async () => {
      try {
        const valid = await unlock(pinInput);
        if (!valid) setPinError("PIN tidak sesuai.");
      } catch {
        setPinError("Tidak dapat memverifikasi PIN. Coba lagi.");
      }
    };
    return (
      <AppContext.Provider value={value}>
        <View style={styles.center}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.errorTitle}>Masukkan PIN</Text>
          <Text style={styles.errorText}>
            PIN tersimpan secara aman di perangkat ini.
          </Text>
          <TextInput
            value={pinInput}
            onChangeText={(text) => {
              setPinInput(text.replace(/\D/g, "").slice(0, 6));
              setPinError("");
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="PIN 4-6 angka"
            style={styles.pinInput}
          />
          {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
          <Pressable onPress={() => void submitPin()} style={styles.retry}>
            <Text style={styles.retryText}>Buka aplikasi</Text>
          </Pressable>
        </View>
      </AppContext.Provider>
    );
  }

  if (!phone.trim() || !phoneVerified) {
    const sendPhoneCode = async () => {
      if (!isValidPhoneNumber(phoneInput)) {
        setPhoneError(
          "Masukkan nomor WhatsApp yang valid, termasuk kode negara.",
        );
        return;
      }
      setPhoneSaving(true);
      setPhoneError("");
      try {
        const code = createVerificationCode();
        await openWhatsAppVerification(phoneInput, code, "self");
        setPhoneChallenge(code);
        setPhoneCodeInput("");
      } catch (reason) {
        setPhoneError(
          reason instanceof Error
            ? reason.message
            : "WhatsApp tidak dapat dibuka.",
        );
      } finally {
        setPhoneSaving(false);
      }
    };

    const savePhone = async () => {
      if (!phoneChallenge || phoneCodeInput !== phoneChallenge) {
        setPhoneError("Kode tidak cocok. Periksa pesan di chat WhatsApp Anda.");
        return;
      }
      setPhoneSaving(true);
      setPhoneError("");
      try {
        await updatePhone(phoneInput);
      } catch (reason) {
        setPhoneError(
          reason instanceof Error
            ? reason.message
            : "Nomor tidak dapat disimpan. Coba lagi.",
        );
      } finally {
        setPhoneSaving(false);
      }
    };

    return (
      <AppContext.Provider value={value}>
        <SafeAreaView
          style={[
            styles.setupScreen,
            { backgroundColor: value.colors.background },
          ]}
        >
          <View
            style={[
              styles.setupCard,
              {
                backgroundColor: value.colors.surface,
                borderColor: value.colors.border,
              },
            ]}
          >
            <Text
              style={[styles.setupEyebrow, { color: value.colors.primary }]}
            >
              PENGATURAN AWAL
            </Text>
            <Text style={[styles.errorTitle, { color: value.colors.text }]}>
              Konfirmasi WhatsApp Anda
            </Text>
            <Text style={[styles.errorText, { color: value.colors.muted }]}>
              Masukkan nomor WhatsApp yang Anda gunakan. Kirim pesan berkode ke
              chat Anda sendiri, lalu ketik ulang kode dari pesan tersebut.
            </Text>
            <TextInput
              value={phoneInput}
              onChangeText={(text) => {
                setPhoneInput(text);
                setPhoneError("");
              }}
              keyboardType="phone-pad"
              maxLength={20}
              placeholder="+628123456789"
              placeholderTextColor={value.colors.muted}
              style={[
                styles.phoneInput,
                {
                  color: value.colors.text,
                  backgroundColor: value.colors.surfaceAlt,
                  borderColor: value.colors.border,
                },
              ]}
            />
            {phoneError ? (
              <Text style={styles.pinError}>{phoneError}</Text>
            ) : null}
            <Text style={[styles.setupPrivacy, { color: value.colors.muted }]}>
              Konfirmasi ini manual. Aplikasi hanya membuka WhatsApp dan tidak
              dapat memastikan pesan terkirim atau membaca balasan. Tidak ada
              server.
            </Text>
            {phoneChallenge ? (
              <>
                <TextInput
                  value={phoneCodeInput}
                  onChangeText={(text) => {
                    setPhoneCodeInput(text.replace(/\D/g, "").slice(0, 6));
                    setPhoneError("");
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Kode 6 digit"
                  placeholderTextColor={value.colors.muted}
                  style={[
                    styles.phoneInput,
                    {
                      color: value.colors.text,
                      backgroundColor: value.colors.surfaceAlt,
                      borderColor: value.colors.border,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => void savePhone()}
                  disabled={phoneSaving || phoneCodeInput.length !== 6}
                  style={[
                    styles.retry,
                    (phoneSaving || phoneCodeInput.length !== 6) &&
                      styles.disabledButton,
                  ]}
                >
                  <Text style={styles.retryText}>
                    {phoneSaving ? "Memeriksa..." : "Konfirmasi dan lanjutkan"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => void sendPhoneCode()}
                disabled={phoneSaving}
                style={[styles.retry, phoneSaving && styles.disabledButton]}
              >
                <Text style={styles.retryText}>
                  {phoneSaving
                    ? "Membuka WhatsApp..."
                    : "Siapkan kode WhatsApp"}
                </Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </AppContext.Provider>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return (
    /^\+?[\d\s()-]+$/.test(phone) && digits.length >= 8 && digits.length <= 15
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#F5F7F6",
  },
  errorText: { color: "#75817B", textAlign: "center", marginTop: 10 },
  errorTitle: {
    color: "#18231E",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  retry: {
    backgroundColor: "#177D57",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  lockIcon: { fontSize: 42, marginBottom: 18 },
  pinInput: {
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 20,
    backgroundColor: "#FFFFFF",
  },
  pinError: { color: "#D74B4B", marginTop: 8 },
  setupScreen: { flex: 1, justifyContent: "center", padding: 24 },
  setupCard: { borderWidth: 1, borderRadius: 24, padding: 22 },
  setupEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  phoneInput: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 14,
    fontSize: 16,
    marginTop: 22,
  },
  setupPrivacy: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  disabledButton: { opacity: 0.6 },
});
