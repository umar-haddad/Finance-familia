import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppContext } from '@/providers/app-provider';
import { formatDate, toDateKey } from '@/utils/date';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}) {
  const { colors } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1)
  );
  const days = useMemo(() => {
    const firstWeekday = (new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(0), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }, [viewMonth]);

  const setMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };
  const chooseDay = (day: number) => {
    onChange(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    setVisible(false);
  };

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1));
          setVisible(true);
        }}
        style={[styles.dateButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      >
        <Text style={[styles.dateIcon, { color: colors.primary }]}>▦</Text>
        <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(toDateKey(value))}</Text>
        <Text style={[styles.dateChevron, { color: colors.muted }]}>⌄</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable onPress={() => setVisible(false)} style={styles.backdrop} />
          <View style={[styles.calendar, { backgroundColor: colors.surface }]}>
            <View style={styles.monthHeader}>
              <Pressable onPress={() => setMonth(-1)} style={styles.arrow}>
                <Text style={[styles.arrowText, { color: colors.text }]}>‹</Text>
              </Pressable>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(viewMonth)}
              </Text>
              <Pressable onPress={() => setMonth(1)} style={styles.arrow}>
                <Text style={[styles.arrowText, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={[styles.weekday, { color: colors.muted }]}>{day}</Text>
              ))}
              {days.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const candidate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const selected = toDateKey(candidate) === toDateKey(value);
                const today = toDateKey(candidate) === toDateKey(new Date());
                return (
                  <Pressable
                    key={day}
                    onPress={() => chooseDay(day)}
                    style={[
                      styles.dayCell,
                      selected && { backgroundColor: colors.primary },
                      !selected && today && { backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: selected ? (colors.text === '#F1F6F2' ? '#13231A' : '#FFFFFF') : colors.text },
                        !selected && today && { color: colors.primary, fontWeight: '800' },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.primary }]}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
  dateButton: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateIcon: { fontSize: 18 },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600' },
  dateChevron: { fontSize: 19 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  calendar: { width: '100%', maxWidth: 380, borderRadius: 24, padding: 18 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 30, lineHeight: 34 },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 8, fontSize: 12, fontWeight: '700' },
  dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  dayText: { fontSize: 14, fontWeight: '500' },
  closeButton: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 12, marginTop: 6 },
  closeText: { fontSize: 14, fontWeight: '800' },
});
