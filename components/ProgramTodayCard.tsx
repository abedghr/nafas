// "My program" card shown on the workout screen when a program is active:
// today's workout + a week strip with done/skipped/today status, a Start button,
// and a per-day action sheet (done / skip / move-in-week / clear) for backfill.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type } from '@/constants/typography';
import { positionToday, resolveDay, weekStrip, sourceDayIndex, swapDays, WEEKDAY_KEYS } from '@/lib/program-schedule';
import WorkoutTextModal from '@/components/WorkoutTextModal';

export default function ProgramTodayCard() {
  const { t } = useTranslation();
  const { isDark, programs, activeEnrollment, setEnrollmentDay, clearEnrollmentDay, updateEnrollmentLocal } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const program = useMemo(() => programs.find((p: any) => p.id === activeEnrollment?.programId), [programs, activeEnrollment]);
  const [week, setWeek] = useState<number | null>(null);
  const [sheet, setSheet] = useState<{ weekday: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const [textDay, setTextDay] = useState<any | null>(null);

  if (!activeEnrollment || !program) return null;

  const pos = positionToday(activeEnrollment, program);
  const curWeek = week ?? pos.week;
  const strip = weekStrip(activeEnrollment, program, curWeek);
  const todayCell = strip.find((c) => c.isToday) || strip[pos.dayIndex];
  const todayDay = todayCell?.day || null;
  const todayStatus = todayCell?.status || null;

  const startDay = (weekday: number) => {
    const src = sourceDayIndex(activeEnrollment, curWeek, weekday);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/prepare-workout?programId=${program.id}&weekIndex=${curWeek}&dayIndex=${src}&run=1&enrollmentId=${activeEnrollment.id}&slotDay=${weekday}` as any);
  };

  const statusColor = (st: string | null) => st === 'done' ? Colors.semantic.success : st === 'skipped' ? Colors.semantic.warn : theme.textMuted;

  return (
    <View style={[s.card, { backgroundColor: theme.card }]}>
      {/* header */}
      <View style={s.head}>
        <View style={[s.badge, { backgroundColor: Colors.electric + '18' }]}>
          <Ionicons name="flag" size={13} color={Colors.electric} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: Colors.electric }]}>{t('programs.myProgram', { defaultValue: 'MY PROGRAM' })}</Text>
          <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
        </View>
        <Pressable onPress={() => router.push(`/program/${program.id}` as any)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* week selector */}
      <View style={s.weekNav}>
        <Pressable onPress={() => setWeek(Math.max(0, curWeek - 1))} disabled={curWeek === 0} hitSlop={8} style={{ opacity: curWeek === 0 ? 0.3 : 1 }}>
          <Ionicons name="chevron-back" size={16} color={theme.text} />
        </Pressable>
        <Text style={[s.weekLabel, { color: theme.textSecondary }]}>{t('programs.weekN', { n: curWeek + 1 })}{curWeek === pos.week ? ` · ${t('programs.thisWeek', { defaultValue: 'this week' })}` : ''}</Text>
        <Pressable onPress={() => setWeek(Math.min(program.weeks - 1, curWeek + 1))} disabled={curWeek >= program.weeks - 1} hitSlop={8} style={{ opacity: curWeek >= program.weeks - 1 ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </Pressable>
      </View>

      {/* week strip */}
      <View style={s.strip}>
        {strip.map((c) => {
          const col = statusColor(c.status);
          return (
            <Pressable
              key={c.weekday}
              onPress={() => { Haptics.selectionAsync(); setMoving(false); setSheet({ weekday: c.weekday }); }}
              style={[s.chip, {
                backgroundColor: c.isToday ? Colors.electric + '22' : theme.cardAlt,
                borderColor: c.isToday ? Colors.electric : c.status ? col + '66' : 'transparent',
                borderWidth: c.isToday || c.status ? 1 : 0,
              }]}
            >
              <Text style={[s.chipDay, { color: c.isToday ? Colors.electric : theme.textMuted }]}>{t(`workoutTab.${WEEKDAY_KEYS[c.weekday]}`)}</Text>
              {c.day?.restDay ? (
                <Ionicons name="moon" size={13} color={theme.textSecondary} />
              ) : c.status === 'done' ? (
                <Ionicons name="checkmark-circle" size={15} color={Colors.semantic.success} />
              ) : c.status === 'skipped' ? (
                <Ionicons name="close-circle" size={15} color={Colors.semantic.warn} />
              ) : c.planned ? (
                <View style={[s.dot, { backgroundColor: c.isToday ? Colors.electric : theme.textMuted }]} />
              ) : (
                <Text style={[s.chipDash, { color: theme.textMuted }]}>–</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* today */}
      <View style={[s.today, { borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.todayKicker, { color: theme.textMuted }]}>
            {pos.finishedPlan ? t('programs.planComplete', { defaultValue: 'Plan complete' }) : t('programs.today', { defaultValue: 'TODAY' })}
          </Text>
          <Text style={[s.todayName, { color: theme.text }]} numberOfLines={1}>
            {todayDay?.restDay ? t('programs.restDay') : (todayDay?.name || todayDay?.label || t('programs.rest', { defaultValue: 'Rest day' }))}
          </Text>
        </View>
        {todayStatus ? (
          <View style={[s.statusPill, { backgroundColor: statusColor(todayStatus) + '22' }]}>
            <Text style={[s.statusPillText, { color: statusColor(todayStatus) }]}>{t(`programs.${todayStatus}`, { defaultValue: todayStatus })}</Text>
          </View>
        ) : todayDay && !todayDay.restDay && (todayDay.exercises?.length || todayDay.templateId) ? (
          <Pressable onPress={() => startDay(todayCell!.weekday)} style={[s.startBtn, { backgroundColor: Colors.electric }]}>
            <Ionicons name="play" size={13} color="#04120B" />
            <Text style={s.startBtnText}>{t('programs.startDay', { defaultValue: 'Start' })}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* per-day action sheet */}
      <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={s.overlay} onPress={() => setSheet(null)}>
          <Pressable style={[s.actionSheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            {sheet && (() => {
              const cell = strip.find((c) => c.weekday === sheet.weekday)!;
              const label = t(`workoutTab.${WEEKDAY_KEYS[sheet.weekday]}`);
              if (moving) {
                return (
                  <>
                    <Text style={[s.sheetTitle, { color: theme.text }]}>{t('programs.moveTo', { defaultValue: 'Swap with…' })}</Text>
                    <View style={s.moveGrid}>
                      {strip.filter((c) => c.weekday !== sheet.weekday).map((c) => (
                        <Pressable
                          key={c.weekday}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            updateEnrollmentLocal(activeEnrollment.id, { overrides: swapDays(activeEnrollment, curWeek, sheet.weekday, c.weekday) });
                            setMoving(false); setSheet(null);
                          }}
                          style={[s.moveChip, { backgroundColor: theme.cardAlt }]}
                        >
                          <Text style={[s.moveChipText, { color: theme.text }]}>{t(`workoutTab.${WEEKDAY_KEYS[c.weekday]}`)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                );
              }
              return (
                <>
                  <Text style={[s.sheetTitle, { color: theme.text }]}>{label}{cell.day && !cell.day.restDay ? ` · ${cell.day.name || cell.day.label || ''}` : ''}</Text>
                  {cell.day && !cell.day.restDay && (cell.day.exercises?.length || cell.day.templateId) && (
                    <>
                      <SheetBtn icon="play" color={Colors.electric} label={t('programs.startDay', { defaultValue: 'Start' })} onPress={() => { setSheet(null); startDay(sheet.weekday); }} theme={theme} />
                      <SheetBtn icon="reader-outline" color={theme.text} label={t('workoutPrep.viewAsText', { defaultValue: 'View as text' })} onPress={() => { setTextDay(cell.day); setSheet(null); }} theme={theme} />
                    </>
                  )}
                  <SheetBtn icon="checkmark-circle" color={Colors.semantic.success} label={t('programs.markDone', { defaultValue: 'Mark done' })} onPress={() => { setEnrollmentDay(activeEnrollment.id, curWeek, sheet.weekday, 'done'); setSheet(null); }} theme={theme} />
                  <SheetBtn icon="close-circle" color={Colors.semantic.warn} label={t('programs.markSkipped', { defaultValue: 'Mark skipped' })} onPress={() => { setEnrollmentDay(activeEnrollment.id, curWeek, sheet.weekday, 'skipped'); setSheet(null); }} theme={theme} />
                  <SheetBtn icon="swap-horizontal" color={theme.text} label={t('programs.move', { defaultValue: 'Move to another day' })} onPress={() => setMoving(true)} theme={theme} />
                  {cell.status && (
                    <SheetBtn icon="refresh" color={theme.textMuted} label={t('programs.clearStatus', { defaultValue: 'Clear' })} onPress={() => { clearEnrollmentDay(activeEnrollment.id, curWeek, sheet.weekday); setSheet(null); }} theme={theme} />
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
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  weekLabel: { ...Type.caption, minWidth: 120, textAlign: 'center' },
  strip: { flexDirection: 'row', gap: 5, justifyContent: 'space-between' },
  chip: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  chipDay: { fontSize: 10, fontWeight: '700' },
  chipDash: { fontSize: 13, height: 15, lineHeight: 15 },
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
  moveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  moveChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  moveChipText: { ...Type.body, fontWeight: '700' },
});
