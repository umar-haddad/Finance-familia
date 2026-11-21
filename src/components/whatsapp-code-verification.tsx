import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionButton, Field } from "@/components/app-shell";
import { useAppContext } from "@/providers/app-provider";
import {
  createVerificationCode,
  openWhatsAppVerification,
  type VerificationRecipient,
} from "@/services/whatsappVerification";
import { showMessage } from "@/utils/confirm";

export function WhatsAppCodeVerification({
  phone,
  recipient,
  verified,
  onVerified,
}: {
  phone: string;
  recipient: VerificationRecipient;
  verified: boolean;
  onVerified: (phone: string) => Promise<void>;
}) {
  const { colors } = useAppContext();
  const [challenge, setChallenge] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    const code = createVerificationCode();
    setWorking(true);
    setError("");
    try {
      await openWhatsAppVerification(phone, code, recipient);
      setChallenge(code);
      setEnteredCode("");
    } catch (reason) {
      showMessage(
        "WhatsApp tidak dapat dibuka",
        reason instanceof Error ? reason.message : "Coba lagi.",
      );
    } finally {
      setWorking(false);
    }
  };

  const verifyCode = async () => {
    if (enteredCode !== challenge) {
      setError("Kode tidak cocok. Periksa kembali pesan WhatsApp.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await onVerified(phone.trim());
      setChallenge("");
      setEnteredCode("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Konfirmasi gagal. Coba lagi.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.status,
          { color: verified ? colors.positive : colors.warning },
        ]}
      >
        {verified ? "✓ Konfirmasi manual selesai" : "Belum dikonfirmasi"}
      </Text>
      <Text style={[styles.note, { color: colors.muted }]}>
        WhatsApp tidak menyediakan OTP otomatis untuk aplikasi ini. Pesan hanya
        disiapkan; Anda perlu mengirimnya sendiri. Status terkirim tidak dapat
        dibaca aplikasi.
      </Text>
      {!verified ? (
        <>
          {challenge ? (
            <>
              <Field
                label="Masukkan kode 6 digit"
                value={enteredCode}
                onChangeText={(value) => {
                  setEnteredCode(value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="000000"
                keyboardType="number-pad"
              />
              <ActionButton
                title={working ? "Memeriksa..." : "Konfirmasi kode"}
                onPress={() => void verifyCode()}
                disabled={working || enteredCode.length !== 6}
              />
            </>
          ) : (
            <ActionButton
              title={
                working ? "Membuka WhatsApp..." : "Kirim kode lewat WhatsApp"
              }
              onPress={() => void sendCode()}
              disabled={working || !phone.trim()}
            />
          )}
          {error ? (
            <Text style={[styles.error, { color: colors.negative }]}>
              {error}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9, marginBottom: 14 },
  status: { fontSize: 12, fontWeight: "800" },
  note: { fontSize: 11, lineHeight: 16 },
  error: { fontSize: 12, fontWeight: "600" },
});
