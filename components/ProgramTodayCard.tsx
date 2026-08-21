// "My program" card on the workout screen. The plan is a SEQUENCE (Day 1, Day
// 2, …) filled from the start date — not tied to weekdays. Shows today's day, a
// horizontal Day-N strip with done/skipped status, and a per-day action sheet
// (start / view text / mark done +duration / skip / clear) for backfilling.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { programSequence, positionToday, dayStatus, dateForOrdinal, programProgress, resolveDayExercises, type SeqDay } from '@/lib/program-schedule';
import WorkoutTextModal from '@/components/WorkoutTextModal';

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function ProgramTodayCard() {
  const { t } = useTranslation();
  const { isDark, programs, activeEnrollment, setEnrollmentDay, clearEnrollmentDay } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const program = useMemo(() => programs.find((p: any) => p.id === activeEnrollment?.programId), [programs, activeEnrollment]);
  const [sheet, setSheet] = useState<SeqDay | null>(null);
  const [marking, setMarking] = useState(false);
  const [dur, setDur] = useState('');
  const [textDay, setTextDay] = useState<any | null>(null);

  if (!activeEnrollment || !program) return null;

  const seq = programSequence(program);
  const pos = positionToday(activeEnrollment, program);
  const today = seq[pos.ordinal];
  const prog = programProgress(activeEnrollment, program);
  const stColor = (st: string | null) => st === 'done' ? Colors.semantic.success : st === 'skipped' ? Colors.semantic.warn : theme.textMuted;

  const start = (sd: SeqDay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/prepare-workout?programId=${program.id}&weekIndex=${sd.weekIndex}&dayIndex=${sd.dayIndex}&run=1&enrollmentId=${activeEnrollment.id}&slotDay=${sd.dayIndex}` as any);
  };
  const isRunnable = (sd?: SeqDay | null) => !!sd && !sd.day.restDay && ((sd.day.exercises?.length ?? 0) > 0 || !!sd.day.templateId);

  return (
    <View style={[s.card, { backgroundColor: theme.card }]}>
      {/* header */}
      <View style={s.head}>
        <View style={[s.badge, { backgroundColor: Colors.electric + '18' }]}><Ionicons name="flag" size={13} color={Colors.electric} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: Colors.electric }]}>{t('programs.myProgram', { defaultValue: 'MY PROGRAM' })}</Text>
          <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
        </View>
        <Pressable onPress={() => router.push(`/program/${program.id}` as any)} hitSlop={8}><Ionicons name="chevron-forward" size={18} color={theme.textMuted} /></Pressable>
      </View>

      {/* progress */}
      <View style={{ gap: 6 }}>
        <View style={s.progRow}>
          <Text style={[s.progText, { color: theme.textSecondary }]}>{t('programs.dayProgress', { done: prog.decided, total: prog.total, defaultValue: `${prog.decided} of ${prog.total} days` })}</Text>
          <Text style={[s.progPct, { color: Colors.electric }]}>{Math.round(prog.pct * 100)}%</Text>
        </View>
        <View style={[s.progTrack, { backgroundColor: theme.cardAlt }]}>
          <View style={[s.progFill, { width: `${Math.round(prog.pct * 100)}%`, backgroundColor: Colors.electric }]} />
        </View>
      </View>

      {/* Day-N strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>
        {seq.map((sd) => {
          const st = dayStatus(activeEnrollment, sd.weekIndex, sd.dayIndex);
          const isToday = sd.ordinal === pos.ordinal && pos.started && !pos.finishedPlan;
          return (
            <Pressable
              key={sd.ordinal}
              onPress={() => { Haptics.selectionAsync(); setMarking(false); setDur(''); setSheet(sd); }}
              style={[s.chip, {
                backgroundColor: isToday ? Colors.electric + '22' : theme.cardAlt,
                borderColor: isToday ? Colors.electric : st ? stColor(st) + '66' : 'transparent',
                borderWidth: isToday || st ? 1 : 0,
              }]}
            >
              <Text style={[s.chipDay, { color: isToday ? Colors.electric : theme.textMuted }]}>{t('programs.dayN', { n: sd.ordinal + 1, defaultValue: `Day ${sd.ordinal + 1}` })}</Text>
              {sd.day.restDay ? (
                <Ionicons name="moon" size={14} color={theme.textSecondary} />
              ) : st === 'done' ? (
                <Ionicons name="checkmark-circle" size={16} color={Colors.semantic.success} />
              ) : st === 'skipped' ? (
                <Ionicons name="close-circle" size={16} color={Colors.semantic.warn} />
              ) : (
                <View style={[s.dot, { backgroundColor: isToday ? Colors.electric : theme.textMuted }]} />
              )}
              <Text style={[s.chipDate, { color: theme.textMuted }]}>{shortDate(dateForOrdinal(activeEnrollment, sd.ordinal))}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* today */}
      <View style={[s.today, { borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.todayKicker, { color: theme.textMuted }]}>
            {pos.finishedPlan ? t('programs.planComplete', { defaultValue: 'Plan complete' }) : `${t('programs.today', { defaultValue: 'TODAY' })} · ${t('programs.dayN', { n: pos.ordinal + 1, defaultValue: `Day ${pos.ordinal + 1}` })}`}
          </Text>
          <Text style={[s.todayName, { color: theme.text }]} numberOfLines={1}>
            {today?.day.restDay ? t('programs.restDay') : (today?.day.name || today?.day.label || t('programs.rest', { defaultValue: 'Rest day' }))}
          </Text>
        </View>
        {(() => {
          const st = today ? dayStatus(activeEnrollment, today.weekIndex, today.dayIndex) : null;
          if (st) return <View style={[s.statusPill, { backgroundColor: stColor(st) + '22' }]}><Text style={[s.statusPillText, { color: stColor(st) }]}>{t(`programs.${st}`, { defaultValue: st })}</Text></View>;
          if (isRunnable(today)) return (
            <Pressable onPress={() => start(today!)} style={[s.startBtn, { backgroundColor: Colors.electric }]}>
              <Ionicons name="play" size={13} color="#04120B" /><Text style={s.startBtnText}>{t('programs.startDay', { defaultValue: 'Start' })}</Text>
            </Pressable>
          );
          return null;
        })()}
      </View>

      {/* per-day action sheet */}
      <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={s.overlay} onPress={() => setSheet(null)}>
          <Pressable style={[s.actionSheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            {sheet && (() => {
              const st = dayStatus(activeEnrollment, sheet.weekIndex, sheet.dayIndex);
              const commitDone = () => {
                const mins = parseInt(dur, 10);
                setEnrollmentDay(activeEnrollment.id, sheet.weekIndex, sheet.dayIndex, 'done', Number.isFinite(mins) && mins > 0 ? { durationMin: mins } : undefined);
                setSheet(null);
              };
              return (
                <>
                  <Text style={[s.sheetTitle, { color: theme.text }]}>
                    {t('programs.dayN', { n: sheet.ordinal + 1, defaultValue: `Day ${sheet.ordinal + 1}` })}{sheet.day.name ? ` · ${sheet.day.name}` : ''}
                  </Text>
                  {marking ? (
                    <>
                      <Text style={[s.durLabel, { color: theme.textSecondary }]}>{t('programs.durationMinutes', { defaultValue: 'Duration (minutes)' })}</Text>
                      <TextInput style={[s.durInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={dur} onChangeText={setDur} keyboardType="number-pad" placeholder="45" placeholderTextColor={theme.textMuted} autoFocus />
                      <Pressable onPress={commitDone} style={[s.confirmBtn, { backgroundColor: Colors.electric }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#04120B" /><Text style={s.confirmText}>{t('programs.markDone', { defaultValue: 'Mark done' })}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {isRunnable(sheet) && (
                        <>
                          <SheetBtn icon="play" color={Colors.electric} label={t('programs.startDay', { defaultValue: 'Start' })} onPress={() => { const sd = sheet; setSheet(null); start(sd); }} theme={theme} />
                          <SheetBtn icon="reader-outline" color={theme.text} label={t('workoutPrep.viewAsText', { defaultValue: 'View as text' })} onPress={() => { setTextDay({ ...sheet.day, exercises: resolveDayExercises(activeEnrollment, sheet.weekIndex, sheet.dayIndex, (sheet.day.exercises as any[]) || []) }); setSheet(null); }} theme={theme} />
                        </>
                      )}
                      <SheetBtn icon="checkmark-circle" color={Colors.semantic.success} label={t('programs.markDone', { defaultValue: 'Mark done' })} onPress={() => setMarking(true)} theme={theme} />
                      <SheetBtn icon="close-circle" color={Colors.semantic.warn} label={t('programs.markSkipped', { defaultValue: 'Mark skipped' })} onPress={() => { setEnrollmentDay(activeEnrollment.id, sheet.weekIndex, sheet.dayIndex, 'skipped'); setSheet(null); }} theme={theme} />
                      {st && <SheetBtn icon="refresh" color={theme.textMuted} label={t('programs.clearStatus', { defaultValue: 'Clear' })} onPress={() => { clearEnrollmentDay(activeEnrollment.id, sheet.weekIndex, sheet.dayIndex); setSheet(null); }} theme={theme} />}
                    </>
                  )}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      <WorkoutTextModal visible={textDay !== null} onClose={() => setTextDay(null)} title={textDay?.name || t('programs.buildWorkout')} exercises={(textDay?.exercises as any[]) || []} />
    </View>
  );
}

function SheetBtn({ icon, color, label, onPress, theme }: { icon: any; color: string; label: string; onPress: () => void; theme: any }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.sheetBtn, { backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={[s.sheetBtnText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...Type.caption, letterSpacing: 1, textTransform: 'uppercase' },
  name: { ...Type.h2 },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progText: { ...Type.caption },
  progPct: { fontFamily: Fonts.monoBold, fontSize: 12 },
  progTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3 },
  strip: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: { alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, minWidth: 64 },
  chipDay: { fontSize: 11, fontWeight: '800' },
  chipDate: { fontSize: 9.5, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  todayKicker: { ...Type.caption, letterSpacing: 1, textTransform: 'uppercase' },
  todayName: { ...Type.bodyMed, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  startBtnText: { color: '#04120B', fontSize: 12, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 34, gap: 4 },
  sheetTitle: { ...Type.h2, marginBottom: 8 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12 },
  sheetBtnText: { ...Type.body, fontWeight: '600' },
  durLabel: { ...Type.caption, marginTop: 4, marginBottom: 6 },
  durInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 10 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  confirmText: { color: '#04120B', fontSize: 15, fontWeight: '800' },
});
