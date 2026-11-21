import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { ActionButton, Card } from '@/components/app-shell';
import { applyMerge, pickBackupFile, previewMerge, shareBackup } from '@/services/backupService';
import type { BackupConflict, MergePreview } from '@/services/backupService';
import { useAppContext } from '@/providers/app-provider';
import { formatCurrency } from '@/utils/currency';

export function BackupManager({
  database,
  onComplete,
  mode = 'backup',
}: {
  database: SQLiteDatabase;
  onComplete: () => Promise<void>;
  mode?: 'backup' | 'sync';
}) {
  const { colors, currency } = useAppContext();
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [conflictIndex, setConflictIndex] = useState(0);

  const share = async () => {
    setWorking(true);
    try {
      await shareBackup(database);
      Alert.alert(
        'File siap dibagikan',
        'Pilih WhatsApp, Bluetooth, email, atau aplikasi lain pada menu berbagi. Penerima perlu mengimpor file tersebut di aplikasinya.'
      );
      await onComplete();
    } catch (error) {
      Alert.alert('Tidak dapat membuat file', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setWorking(false);
    }
  };

  const importFile = async () => {
    setWorking(true);
    try {
      const backup = await pickBackupFile();
      if (!backup) return;
      const nextPreview = await previewMerge(backup, database);
      if (nextPreview.conflicts.length === 0) {
        const result = await applyMerge(nextPreview, database);
        await onComplete();
        Alert.alert(
          'Impor selesai',
          `${result.added} data baru ditambahkan. Data yang tidak berubah dibiarkan tanpa duplikasi.`
        );
        return;
      }
      setPreview(nextPreview);
      setConflictIndex(0);
    } catch (error) {
      Alert.alert('Impor gagal', error instanceof Error ? error.message : 'File tidak dapat dibaca.');
    } finally {
      setWorking(false);
    }
  };

  const resolveConflict = async (choice: 'local' | 'remote') => {
    if (!preview) return;
    const conflict = preview.conflicts[conflictIndex];
    const resolutions = {
      ...preview.resolutions,
      [`${conflict.type}:${conflict.id}`]: choice,
    };
    if (conflictIndex + 1 < preview.conflicts.length) {
      setPreview({ ...preview, resolutions });
      setConflictIndex(conflictIndex + 1);
      return;
    }
    setWorking(true);
    try {
      const result = await applyMerge({ ...preview, resolutions }, database);
      setPreview(null);
      setConflictIndex(0);
      await onComplete();
      Alert.alert(
        'Sinkronisasi selesai',
        `${result.added} data baru, ${result.updated} konflik memakai data pasangan, ${result.keptLocal} konflik mempertahankan data lokal.`
      );
    } catch (error) {
      Alert.alert('Sinkronisasi gagal', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setWorking(false);
    }
  };

  const currentConflict = preview?.conflicts[conflictIndex];
  return (
    <>
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>
          {mode === 'sync' ? 'Bertukar data dengan pasangan' : 'Backup & restore'}
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Ekspor membuat file JSON lokal. Impor menggabungkan catatan baru tanpa menghapus isi perangkat; jika ada perubahan pada catatan yang sama, Anda memilih salinan yang dipakai.
        </Text>
        <View style={styles.actions}>
          <View style={styles.button}>
            <ActionButton
              title={working ? 'Memproses...' : mode === 'sync' ? '⟳ Bagikan file sync' : '⇧ Ekspor backup'}
              onPress={() => void share()}
              disabled={working}
            />
          </View>
          <View style={styles.button}>
            <ActionButton
              title={working ? 'Memproses...' : '⇩ Impor file JSON'}
              variant="secondary"
              onPress={() => void importFile()}
              disabled={working}
            />
          </View>
        </View>
      </Card>
      {currentConflict ? (
        <ConflictModal
          conflict={currentConflict}
          index={conflictIndex}
          total={preview?.conflicts.length ?? 0}
          currency={currency}
          busy={working}
          onChoose={(choice) => void resolveConflict(choice)}
        />
      ) : null}
    </>
  );
}

function ConflictModal({
  conflict,
  index,
  total,
  currency,
  busy,
  onChoose,
}: {
  conflict: BackupConflict;
  index: number;
  total: number;
  currency: string;
  busy: boolean;
  onChoose: (choice: 'local' | 'remote') => void;
}) {
  const { colors } = useAppContext();
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalRoot}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.conflictCount, { color: colors.primary }]}>Konflik {index + 1} dari {total}</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Pilih data yang dipertahankan</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            Catatan ini berubah di kedua perangkat. Tidak ada salinan yang akan dihapus tanpa pilihan Anda.
          </Text>
          <ConflictVersion
            title="Data di perangkat ini"
            entity={conflict.local}
            currency={currency}
            selectedColor={colors.primary}
          />
          <ConflictVersion
            title="Data dari file pasangan"
            entity={conflict.remote}
            currency={currency}
            selectedColor={colors.warning}
          />
          <View style={styles.choiceRow}>
            <View style={styles.button}>
              <ActionButton title="Gunakan data saya" variant="secondary" onPress={() => onChoose('local')} disabled={busy} />
            </View>
            <View style={styles.button}>
              <ActionButton title="Gunakan pasangan" onPress={() => onChoose('remote')} disabled={busy} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConflictVersion({
  title,
  entity,
  currency,
  selectedColor,
}: {
  title: string;
  entity: BackupConflict['local'];
  currency: string;
  selectedColor: string;
}) {
  const { colors } = useAppContext();
  const details = conflictDescription(entity, currency);
  return (
    <View style={[styles.version, { borderColor: colors.border }]}>
      <Text style={[styles.versionLabel, { color: selectedColor }]}>{title}</Text>
      <Text style={[styles.versionTitle, { color: colors.text }]}>{details.title}</Text>
      <Text style={[styles.versionDetails, { color: colors.muted }]}>{details.description}</Text>
    </View>
  );
}

function conflictDescription(
  entity: BackupConflict['local'],
  currency: string
): { title: string; description: string } {
  if ('amount' in entity && 'category' in entity) {
    return {
      title: entity.description,
      description: `${entity.category} · ${formatCurrency(entity.amount, currency)} · ${entity.date}`,
    };
  }
  if ('person_name' in entity) {
    return {
      title: entity.person_name,
      description: `${formatCurrency(entity.amount, currency)} · terbayar ${formatCurrency(entity.paid_amount, currency)} · ${entity.description}`,
    };
  }
  if ('symbol' in entity) {
    return {
      title: `${entity.symbol} · ${entity.name}`,
      description: `${entity.lots} lot · beli ${formatCurrency(entity.buy_price, currency)} · pasar ${formatCurrency(entity.current_price, currency)}`,
    };
  }
  return { title: entity.name, description: `Kategori ${entity.type}` };
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 12, lineHeight: 18, marginTop: 7 },
  actions: { gap: 9, marginTop: 16 },
  button: { flex: 1 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: { width: '100%', maxWidth: 430, borderRadius: 23, padding: 19 },
  conflictCount: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  version: { borderWidth: 1, borderRadius: 15, padding: 12, marginTop: 12 },
  versionLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
  versionTitle: { fontSize: 13, fontWeight: '700' },
  versionDetails: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
