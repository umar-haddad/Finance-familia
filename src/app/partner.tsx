import { useCallback, useState } from "react";
import { Alert, Linking, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useNetworkState } from "expo-network";
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
import { getDatabase, getSetting, setSetting } from "@/database/db";
import { useAppContext } from "@/providers/app-provider";
import { showMessage } from "@/utils/confirm";
import { formatDate } from "@/utils/date";
import { getNetworkLabel } from "@/utils/network";

export default function PartnerScreen() {
  const { colors, deviceId } = useAppContext();
  const networkState = useNetworkState();
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const database = await getDatabase();
      setDatabase(database);
      const [savedName, savedPhone, savedVerifiedPhone, metadata, pending] =
        await Promise.all([
          getSetting("partner_name"),
          getSetting("partner_phone"),
          getSetting("partner_phone_verified"),
          database.getFirstAsync<{
            last_sync_at: string | null;
            partner_id: string | null;
          }>(
            "SELECT last_sync_at, partner_id FROM sync_metadata WHERE id = ?",
            "partner-sync",
          ),
          database.getFirstAsync<{ count: number }>(
            `SELECT
            (SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending') +
            (SELECT COUNT(*) FROM debts WHERE sync_status = 'pending') +
            (SELECT COUNT(*) FROM stocks WHERE sync_status = 'pending') AS count`,
          ),
        ]);
      setPartnerName(savedName ?? "");
      setPhone(savedPhone ?? "");
      setVerifiedPhone(savedVerifiedPhone ?? "");
      setLastSync(metadata?.last_sync_at ?? null);
      setPartnerId(metadata?.partner_id ?? null);
      setPendingCount(pending?.count ?? 0);
    } catch (error) {
      Alert.alert(
        "Informasi pasangan gagal dimuat",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const savePartner = async () => {
    setSaving(true);
    try {
      await setSetting("partner_name", partnerName.trim());
      if (phone.trim() && phone.trim() !== verifiedPhone) {
        showMessage(
          "Nomor belum dikonfirmasi",
          "Nama pasangan tersimpan. Konfirmasikan nomor WhatsApp sebelum menyimpannya atau mengirim undangan.",
        );
      } else {
        await setSetting("partner_phone", phone.trim());
        showMessage(
          "Tersimpan",
          "Informasi pasangan hanya tersimpan di perangkat ini.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Tidak dapat menyimpan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const invite = async () => {
    if (!phone.trim() || verifiedPhone !== phone.trim()) {
      showMessage(
        "Konfirmasi nomor dulu",
        "Konfirmasikan nomor WhatsApp pasangan sebelum mengirim undangan.",
      );
      return;
    }
    const inviteCode = deviceId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const message = `Hai${partnerName ? ` ${partnerName}` : ""} ❤️\n\nYuk gunakan Finance Familia bersama untuk memantau keuangan kita.\n\nAplikasi ini tidak memakai login atau server. Setelah memasang aplikasi, kita bertukar file CSV melalui menu Sinkronisasi dan mencocokkan ID perangkat.\n\nKode perangkat: ${inviteCode}`;
    const digits = phone.replace(/\D/g, "");
    try {
      if (digits.length >= 8) {
        await Linking.openURL(
          `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
        );
      } else {
        await Share.share({ message, title: "Undangan Finance Familia" });
      }
    } catch (error) {
      try {
        await Share.share({ message, title: "Undangan Finance Familia" });
      } catch {
        Alert.alert(
          "Undangan gagal dibagikan",
          error instanceof Error ? error.message : "Coba lagi.",
        );
      }
    }
  };

  return (
    <AppShell title="Pasangan">
      <View style={[styles.statusCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statusIcon}>
          <Text style={styles.heart}>♡</Text>
        </View>
        <Text style={styles.statusTitle}>
          {getNetworkLabel(networkState.isConnected, networkState.type)}
        </Text>
        <Text style={styles.statusText}>
          {networkState.isInternetReachable === false
            ? "Jaringan terdeteksi, tetapi akses internet belum tersedia. "
            : ""}
          Status ini menunjukkan jaringan perangkat, bukan koneksi langsung ke
          pasangan. Sinkronisasi memakai file CSV dan ID perangkat.
        </Text>
        <Text style={styles.partnerId}>
          {partnerId
            ? `ID pasangan cocok: ${partnerId.slice(0, 8).toUpperCase()}`
            : "Belum ada ID pasangan yang dicocokkan"}
        </Text>
      </View>
      <Card>
        <SectionTitle>Undang pasangan</SectionTitle>
        <Field
          label="Nama pasangan"
          value={partnerName}
          onChangeText={setPartnerName}
          placeholder="Contoh: Budi"
        />
        <Field
          label="Nomor WhatsApp"
          value={phone}
          onChangeText={setPhone}
          placeholder="+628123456789"
          keyboardType="phone-pad"
        />
        <WhatsAppCodeVerification
          key={phone.trim()}
          phone={phone}
          recipient="partner"
          verified={Boolean(phone.trim()) && verifiedPhone === phone.trim()}
          onVerified={async (verifiedNumber) => {
            await Promise.all([
              setSetting("partner_phone", verifiedNumber),
              setSetting("partner_phone_verified", verifiedNumber),
            ]);
            setPhone(verifiedNumber);
            setVerifiedPhone(verifiedNumber);
          }}
        />
        <View style={styles.buttonSpacing}>
          <ActionButton
            title={saving ? "Menyimpan..." : "Simpan informasi"}
            variant="secondary"
            onPress={() => void savePartner()}
            disabled={saving}
          />
        </View>
        <ActionButton title="Kirim undangan" onPress={() => void invite()} />
        <Text style={[styles.code, { color: colors.muted }]}>
          Kode perangkat: {deviceId.slice(0, 8).toUpperCase()}
        </Text>
      </Card>
      <Card>
        <View style={styles.syncHeader}>
          <SectionTitle>Sinkronisasi file</SectionTitle>
          <Text
            style={[
              styles.pendingBadge,
              { color: pendingCount ? colors.warning : colors.positive },
            ]}
          >
            {pendingCount} menunggu
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.muted }]}>
          {lastSync
            ? `File terakhir dibagikan atau diimpor ${formatDate(lastSync.slice(0, 10))}.`
            : "Belum ada pertukaran file."}
        </Text>
      </Card>
      {database ? (
        <BackupManager database={database} onComplete={loadData} mode="sync" />
      ) : null}
      <Text style={[styles.footnote, { color: colors.muted }]}>
        File CSV mencakup transaksi, hutang, saham, kategori, dan penghapusan.
        ID perangkat dipakai untuk mencocokkan sumber file; data lokal tidak
        pernah diganti seluruhnya.
      </Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statusCard: { padding: 20, borderRadius: 22 },
  statusIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heart: { color: "#FFFFFF", fontSize: 25 },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
  },
  statusText: { color: "#E1F7E9", fontSize: 12, lineHeight: 18, marginTop: 5 },
  partnerId: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", marginTop: 9 },
  buttonSpacing: { marginBottom: 9 },
  code: { textAlign: "center", marginTop: 12, fontSize: 10 },
  syncHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pendingBadge: { fontSize: 10, fontWeight: "800", marginTop: -7 },
  body: { fontSize: 12, lineHeight: 18, marginTop: -4 },
  footnote: {
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 10,
  },
});


