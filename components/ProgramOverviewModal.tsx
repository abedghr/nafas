// Full active-program overview as text: every day (Day N · date · name) with its
// exercises as bullet lines; the current day is highlighted. Opened from the
// workout-screen calendar button.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type } from '@/constants/typography';
import { programSequence, positionToday, dateForOrdinal, dayStatus, resolveDayExercises } from '@/lib/program-schedule';
import { workoutPlanLines } from '@/lib/workout-summary';

export default function ProgramOverviewModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { isDark, weightUnit, programs, activeEnrollment } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const program = programs.find((p: any) => p.id === activeEnrollment?.programId);
  if (!visible || !activeEnrollment || !program) return null;

  const seq = programSequence(program);
  const pos = positionToday(activeEnrollment, program);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handleWrap}><View style={[s.handle, { backgroundColor: theme.border }]} /></View>
          <View style={s.header}>
            <View style={[s.badge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="flag" size={15} color={Colors.electric} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: Colors.electric }]}>MY PROGRAM</Text>
              <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
            {seq.map((sd) => {
              const st = dayStatus(activeEnrollment, sd.weekIndex, sd.dayIndex);
              const isToday = sd.ordinal === pos.ordinal && !pos.finishedPlan;
              const date = dateForOrdinal(activeEnrollment, sd.ordinal).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
              const resolved = resolveDayExercises(activeEnrollment, sd.weekIndex, sd.dayIndex, (sd.day.exercises as any[]) || []);
              const lines = sd.day.restDay ? ['Rest day'] : workoutPlanLines(resolved, weightUnit);
              return (
                <View key={sd.ordinal} style={[s.dayCard, {
                  backgroundColor: theme.card,
                  borderColor: isToday ? Colors.electric : 'transparent',
                  borderWidth: isToday ? 1.5 : 0,
                }]}>
                  <View style={s.dayHead}>
                    <Text style={[s.dayLabel, { color: isToday ? Colors.electric : theme.textSecondary }]}>
                      {`Day ${sd.ordinal + 1}`} · {date}{isToday ? ' · TODAY' : ''}
                    </Text>
                    {st && <Ionicons name={st === 'done' ? 'checkmark-circle' : st === 'skipped' ? 'close-circle' : 'moon'} size={16} color={st === 'done' ? Colors.semantic.success : st === 'skipped' ? Colors.semantic.warn : theme.textSecondary} />}
                  </View>
                  <Text style={[s.dayName, { color: theme.text }]}>{sd.day.restDay ? 'Rest' : (sd.day.name || sd.day.label || 'Workout')}</Text>
                  {lines.map((ln, j) => (
                    <View key={j} style={s.row}>
                      <View style={[s.dot, { backgroundColor: isToday ? Colors.electric : theme.textMuted }]} />
                      <Text style={[s.line, { color: theme.textSecondary }]}>{ln}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: Platform.OS === 'web' ? '88%' : '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 6 },
  handleWrap: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...Type.caption, letterSpacing: 1 },
  title: { ...Type.h1 },
  dayCard: { borderRadius: 14, padding: 14, gap: 6 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { ...Type.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayName: { ...Type.bodyMed, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
  line: { ...Type.body, fontSize: 13.5, flex: 1 },
});
