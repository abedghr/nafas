import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';

// Lightweight date + time picker — pure JS calendar grid + time steppers, no
// native module (works on web + dev build without a rebuild). value/onChange = ISO string.
export default function DateTimeField({ label, value, onChange, theme, minDate, optional }: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  theme: typeof Colors.dark;
  minDate?: Date;
  optional?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value) : null;
  const [view, setView] = useState(() => initial || new Date());
  const [day, setDay] = useState<number | null>(initial ? initial.getDate() : null);
  const [hour, setHour] = useState(initial ? initial.getHours() : 18);
  const [minute, setMinute] = useState(initial ? initial.getMinutes() : 0);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = useMemo(() => view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [view]);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const display = value ? new Date(value).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const pad = (n: number) => String(n).padStart(2, '0');

  const shiftMonth = (d: number) => { Haptics.selectionAsync(); setView(new Date(year, month + d, 1)); };
  const stepHour = (d: number) => { Haptics.selectionAsync(); setHour((h) => (h + d + 24) % 24); };
  const stepMin = (d: number) => { Haptics.selectionAsync(); setMinute((m) => (m + d + 60) % 60); };

  const isPast = (dnum: number) => {
    if (!minDate) return false;
    const cand = new Date(year, month, dnum, 23, 59);
    return cand < minDate;
  };

  const confirm = () => {
    if (day == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange(new Date(year, month, day, hour, minute).toISOString());
    setOpen(false);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(true); }} style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="calendar-outline" size={18} color={value ? Colors.primary : theme.textMuted} />
        <Text style={[styles.fieldText, { color: value ? theme.text : theme.textMuted }]}>{display || t('discover.pick_date')}</Text>
        {optional && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}><Ionicons name="close-circle" size={18} color={theme.textMuted} /></Pressable>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {/* month nav */}
            <View style={styles.monthRow}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color={theme.text} /></Pressable>
              <Text style={[styles.monthText, { color: theme.text }]}>{monthLabel}</Text>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color={theme.text} /></Pressable>
            </View>

            {/* weekdays */}
            <View style={styles.grid}>
              {weekdays.map((w, i) => <Text key={i} style={[styles.wd, { color: theme.textMuted }]}>{w}</Text>)}
            </View>
            {/* days */}
            <View style={styles.grid}>
              {cells.map((c, i) => {
                if (c == null) return <View key={i} style={styles.cell} />;
                const on = day === c;
                const disabled = isPast(c);
                return (
                  <Pressable key={i} disabled={disabled} onPress={() => { Haptics.selectionAsync(); setDay(c); }} style={styles.cell}>
                    <View style={[styles.dayInner, on && { backgroundColor: Colors.primary }]}>
                      <Text style={[styles.dayText, { color: on ? '#fff' : disabled ? theme.textMuted + '55' : theme.text }]}>{c}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* time */}
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>{t('discover.time')}</Text>
              <View style={styles.timeCtrl}>
                <TimeStepper value={pad(hour)} onUp={() => stepHour(1)} onDown={() => stepHour(-1)} theme={theme} />
                <Text style={[styles.colon, { color: theme.text }]}>:</Text>
                <TimeStepper value={pad(minute)} onUp={() => stepMin(5)} onDown={() => stepMin(-5)} theme={theme} />
              </View>
            </View>

            <Pressable onPress={confirm} disabled={day == null} style={[styles.confirm, { backgroundColor: day == null ? theme.border : Colors.primary }]}>
              <Text style={styles.confirmText}>{t('workoutSession.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TimeStepper({ value, onUp, onDown, theme }: { value: string; onUp: () => void; onDown: () => void; theme: typeof Colors.dark }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} hitSlop={8} style={styles.stepBtn}><Ionicons name="chevron-up" size={18} color={theme.textSecondary} /></Pressable>
      <Text style={[styles.stepVal, { color: theme.text }]}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={8} style={styles.stepBtn}><Ionicons name="chevron-down" size={18} color={theme.textSecondary} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  fieldText: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 18 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%` as any, textAlign: 'center', fontSize: 11, fontFamily: 'Rubik_600SemiBold', paddingVertical: 4 },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 4 },
  timeLabel: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  timeCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colon: { fontSize: 22, fontFamily: 'Rubik_700Bold' },
  stepper: { alignItems: 'center' },
  stepBtn: { paddingVertical: 2 },
  stepVal: { fontSize: 22, fontFamily: 'Rubik_700Bold', minWidth: 40, textAlign: 'center' },
  confirm: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  confirmText: { color: '#fff', fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
});
