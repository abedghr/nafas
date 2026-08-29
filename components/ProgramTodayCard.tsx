// Compact "my program" card for the workout dashboard: program name + a thin
// progress bar + today's workout with a Start button and a small actions menu.
// Deliberately small — the full day list lives on the program screen.
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { programSequence, positionToday, dayStatus, programProgress, resolveDayExercises, swapDayOrder, currentDayReachable, type SeqDay } from '@/lib/program-schedule';
import WorkoutTextModal from '@/components/WorkoutTextModal';
import ProgramCompleteModal from '@/components/ProgramCompleteModal';
import { daySessions } from '@/lib/program-sessions';

export default function ProgramTodayCard() {
  const { t } = useTranslation();
  const { isDark, programs, activeEnrollment, setEnrollmentDay, clearEnrollmentDay, updateEnrollmentLocal, endEnrollment } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const program = useMemo(() => programs.find((p: any) => p.id === activeEnrollment?.programId), [programs, activeEnrollment]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [dur, setDur] = useState('');
  const [textDay, setTextDay] = useState<any | null>(null);
  const [finishModal, setFinishModal] = useState(false);

  // pop a congrats modal the moment the last day gets decided (once per run).
  const finishAckRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeEnrollment || !program) return;
    const p = positionToday(activeEnrollment, program);
    if (p.finishedPlan && activeEnrollment.status === 'active' && finishAckRef.current !== activeEnrollment.id) {
      finishAckRef.current = activeEnrollment.id;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFinishModal(true);
    }
  }, [activeEnrollment, program]);

  if (!activeEnrollment || !program) return null;

  const seq = programSequence(program, activeEnrollment);
  const pos = positionToday(activeEnrollment, program);
  const today: SeqDay | undefined = seq[pos.ordinal];
  const prog = programProgress(activeEnrollment, program);
  const pct = Math.round(prog.pct * 100);
  const todayStatus = today ? dayStatus(activeEnrollment, today.weekIndex, today.dayIndex) : null;
  // the CURRENT session within the current day (a day can hold morning + evening)
  const sessions = today ? daySessions(today.day) : [];
  const curSession = sessions[pos.sessionIndex];
  const multi = sessions.length > 1;
  const curName = today?.day.restDay ? '' : (curSession?.name || curSession?.label || today?.day.name || today?.day.label || '');
  const runnable = !!today && !today.day.restDay && ((curSession?.exercises?.length ?? 0) > 0 || !!curSession?.templateId);
  // Startable only when the shown day's scheduled date has arrived and nothing
  // has been trained today. When false, the shown day is a future/next day:
  // display it but don't allow starting it early.
  const unlocked = currentDayReachable(activeEnrollment, program);
  const locked = !unlocked;

  const start = (sd: SeqDay, sessionIndex = pos.sessionIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/prepare-workout?programId=${program.id}&weekIndex=${sd.weekIndex}&dayIndex=${sd.dayIndex}&session=${sessionIndex}&run=1&enrollmentId=${activeEnrollment.id}&slotDay=${sd.dayIndex}` as any);
  };
  const openDetail = () => router.push(`/program/${program.id}` as any);

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={[s.card, { backgroundColor: theme.card }]}>
        {/* header */}
        <Pressable onPress={openDetail} style={s.head}>
          <View style={[s.badge, { backgroundColor: Colors.electric + '1E' }]}><Ionicons name="flag" size={12} color={Colors.electric} /></View>
          <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
          <Text style={[s.count, { color: theme.textMuted }]}>{pos.finishedPlan ? t('programs.done', { defaultValue: 'Done' }) : `${t('programs.dayN', { n: pos.ordinal + 1, defaultValue: `Day ${pos.ordinal + 1}` })}/${prog.total}`}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>

        {/* progress */}
        <View style={s.progRow}>
          <View style={[s.progTrack, { backgroundColor: theme.cardAlt }]}><View style={[s.progFill, { width: `${pct}%`, backgroundColor: Colors.electric }]} /></View>
          <Text style={[s.pct, { color: Colors.electric }]}>{pct}%</Text>
        </View>

        {/* plan complete → finish + view report */}
        {pos.finishedPlan && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); endEnrollment(activeEnrollment.id, 'finished'); router.push(`/program-report/${activeEnrollment.id}` as any); }}
            style={({ pressed }) => [s.finishBanner, { backgroundColor: Colors.electric, opacity: pressed ? 0.92 : 1 }]}
          >
            <Ionicons name="trophy" size={18} color="#04120B" />
            <View style={{ flex: 1 }}>
              <Text style={s.finishBannerTitle}>{t('programs.planCompleteTitle', { defaultValue: 'Program complete' })}</Text>
              <Text style={s.finishBannerSub}>{t('programs.viewReport', { defaultValue: 'See your full journey report' })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#04120B" />
          </Pressable>
        )}

        {/* today block */}
        {today && (() => {
          const exCount = curSession?.exercises?.length ?? 0;
          const statusCol = todayStatus === 'done' ? Colors.semantic.success : todayStatus === 'skipped' ? Colors.semantic.warn : theme.textSecondary;
          // kicker: TODAY, plus "Session X/Y · Label" for multi-session days, else exercise count
          const sessTag = multi
            ? `  ·  ${t('programs.sessionOfN', { n: pos.sessionIndex + 1, total: sessions.length, defaultValue: `Session ${pos.sessionIndex + 1}/${sessions.length}` })}${curSession?.label ? `  ·  ${curSession.label}` : ''}`
            : (exCount > 0 ? `  ·  ${t('programs.exercisesN', { n: exCount })}` : '');
          return (
          <View style={[s.todayBlock, { borderTopColor: theme.border }]}>
            <View style={s.todayHeadRow}>
              <Text style={[s.kicker, { color: theme.textMuted }]}>
                {pos.finishedPlan ? t('programs.planComplete', { defaultValue: 'Plan complete' }) : `${t('programs.today', { defaultValue: 'TODAY' })}${sessTag}`}
              </Text>
              {todayStatus && (
                <View style={[s.statusDot, { backgroundColor: statusCol }]} />
              )}
            </View>
            <Text style={[s.todayName, { color: theme.text }]} numberOfLines={2}>{today.day.restDay ? t('programs.restDay') : (curName || t('programs.rest', { defaultValue: 'Rest day' }))}</Text>

            <View style={s.actionsRow}>
              <View style={s.leftActions}>
                {runnable && (
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTextDay({ name: curName, exercises: resolveDayExercises(activeEnrollment, today.weekIndex, today.dayIndex, (curSession?.exercises as any[]) || []) }); }}
                    hitSlop={8} style={[s.iconBtn, { backgroundColor: theme.cardAlt }]}
                    accessibilityLabel={t('workoutPrep.viewAsText', { defaultValue: 'View as text' })}
                  >
                    <Ionicons name="reader-outline" size={17} color={Colors.electric} />
                  </Pressable>
                )}
                <Pressable
                  disabled={locked}
                  onPress={() => { Haptics.selectionAsync(); setMarking(false); setSwapping(false); setSkipping(false); setSheetOpen(true); }}
                  hitSlop={8} style={[s.iconBtn, { backgroundColor: theme.cardAlt, opacity: locked ? 0.4 : 1 }]}
                >
                  <Ionicons name="ellipsis-horizontal" size={17} color={theme.textSecondary} />
                </Pressable>
              </View>

              {todayStatus ? (
                <View style={[s.statusPill, { backgroundColor: statusCol + '22' }]}>
                  <Ionicons name={todayStatus === 'done' ? 'checkmark-circle' : todayStatus === 'skipped' ? 'close-circle' : 'moon'} size={13} color={statusCol} />
                  <Text style={[s.statusPillText, { color: statusCol }]}>{t(`programs.${todayStatus}`, { defaultValue: todayStatus })}</Text>
                </View>
              ) : locked ? (
                <View style={[s.statusPill, { backgroundColor: theme.cardAlt }]}>
                  <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                  <Text style={[s.statusPillText, { color: theme.textMuted, textTransform: 'none' }]}>{t('programs.nextTomorrow', { defaultValue: 'Next tomorrow' })}</Text>
                </View>
              ) : runnable ? (
                <Pressable onPress={() => start(today)} style={({ pressed }) => [s.startBtn, { backgroundColor: Colors.electric, opacity: pressed ? 0.9 : 1 }]}>
                  <Ionicons name="play" size={13} color="#04120B" /><Text style={s.startBtnText}>{t('programs.startDay', { defaultValue: 'Start' })}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          );
        })()}
      </View>

      {/* today actions sheet */}
      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setSheetOpen(false)}>
          <Pressable style={[s.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            {today && (() => {
              const commitDone = () => {
                const mins = parseInt(dur, 10);
                setEnrollmentDay(activeEnrollment.id, today.weekIndex, today.dayIndex, 'done', { sessionIndex: pos.sessionIndex, ...(Number.isFinite(mins) && mins > 0 ? { durationMin: mins } : {}) });
                setSheetOpen(false);
              };
              if (swapping) {
                return (
                  <>
                    <Text style={[s.sheetTitle, { color: theme.text }]}>{t('programs.swapWith', { defaultValue: 'Swap today with…' })}</Text>
                    <View style={s.swapGrid}>
                      {seq.filter((sd) => sd.ordinal !== pos.ordinal && !dayStatus(activeEnrollment, sd.weekIndex, sd.dayIndex)).slice(0, 12).map((sd) => (
                        <Pressable key={sd.ordinal} onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateEnrollmentLocal(activeEnrollment.id, { dayOrder: swapDayOrder(activeEnrollment, program, pos.ordinal, sd.ordinal) });
                          setSwapping(false); setSheetOpen(false);
                        }} style={[s.swapChip, { backgroundColor: theme.cardAlt }]}>
                          <Text style={[s.swapChipText, { color: theme.text }]} numberOfLines={1}>{`Day ${sd.ordinal + 1}`} · {sd.day.restDay ? t('programs.restDay') : (sd.day.name || sd.day.label || '—')}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                );
              }
              if (marking) {
                return (
                  <>
                    <Text style={[s.durLabel, { color: theme.textSecondary }]}>{t('programs.durationMinutes', { defaultValue: 'Duration (minutes)' })}</Text>
                    <TextInput style={[s.durInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={dur} onChangeText={setDur} keyboardType="number-pad" placeholder="45" placeholderTextColor={theme.textMuted} autoFocus />
                    <Pressable onPress={commitDone} style={[s.confirmBtn, { backgroundColor: Colors.electric }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#04120B" /><Text style={s.confirmText}>{t('programs.markDone', { defaultValue: 'Mark done' })}</Text>
                    </Pressable>
                  </>
                );
              }
              if (skipping) {
                return (
                  <>
                    <Text style={[s.sheetTitle, { color: theme.text }]}>{t('programs.skipTitle', { defaultValue: 'Skip today — what instead?' })}</Text>
                    <SheetBtn icon="moon" color={theme.textSecondary} label={t('programs.restDayOpt', { defaultValue: 'Rest day' })} onPress={() => { setEnrollmentDay(activeEnrollment.id, today.weekIndex, today.dayIndex, 'rest'); setSheetOpen(false); }} theme={theme} />
                    {/* only marks the day skipped once a substitute is actually completed */}
                    <SheetBtn icon="add-circle-outline" color={Colors.electric} label={t('programs.buildDifferent', { defaultValue: 'Build a different workout' })} onPress={() => { setSheetOpen(false); router.push(`/prepare-workout?subEnroll=${activeEnrollment.id}&subWeek=${today.weekIndex}&subDay=${today.dayIndex}` as any); }} theme={theme} />
                  </>
                );
              }
              return (
                <>
                  <Text style={[s.sheetTitle, { color: theme.text }]}>{`Day ${pos.ordinal + 1}`}{multi ? ` · ${t('programs.sessionOfN', { n: pos.sessionIndex + 1, total: sessions.length, defaultValue: `Session ${pos.sessionIndex + 1}/${sessions.length}` })}` : ''}{curName ? ` · ${curName}` : ''}</Text>
                  {runnable && !locked && (
                    <SheetBtn icon="play" color={Colors.electric} label={t('programs.startDay', { defaultValue: 'Start' })} onPress={() => { setSheetOpen(false); start(today); }} theme={theme} />
                  )}
                  {runnable && (
                    <SheetBtn icon="reader-outline" color={theme.text} label={t('workoutPrep.viewAsText', { defaultValue: 'View as text' })} onPress={() => { setTextDay({ name: curName, exercises: resolveDayExercises(activeEnrollment, today.weekIndex, today.dayIndex, (curSession?.exercises as any[]) || []) }); setSheetOpen(false); }} theme={theme} />
                  )}
                  <SheetBtn icon="checkmark-circle" color={Colors.semantic.success} label={t('programs.markDone', { defaultValue: 'Mark done' })} onPress={() => setMarking(true)} theme={theme} />
                  <SheetBtn icon="play-skip-forward" color={Colors.semantic.warn} label={t('programs.skipToday', { defaultValue: 'Skip today' })} onPress={() => setSkipping(true)} theme={theme} />
                  <SheetBtn icon="swap-horizontal" color={theme.text} label={t('programs.swapDay', { defaultValue: 'Swap with another day' })} onPress={() => setSwapping(true)} theme={theme} />
                  {(activeEnrollment.dayOrder?.length ?? 0) > 0 && <SheetBtn icon="arrow-undo" color={theme.textSecondary} label={t('programs.resetOrder', { defaultValue: 'Reset day order' })} onPress={() => { updateEnrollmentLocal(activeEnrollment.id, { dayOrder: [] }); setSheetOpen(false); }} theme={theme} />}
                  {todayStatus && <SheetBtn icon="refresh" color={theme.textMuted} label={t('programs.clearStatus', { defaultValue: 'Clear' })} onPress={() => { clearEnrollmentDay(activeEnrollment.id, today.weekIndex, today.dayIndex, pos.sessionIndex); setSheetOpen(false); }} theme={theme} />}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      <WorkoutTextModal visible={textDay !== null} onClose={() => setTextDay(null)} title={textDay?.name || t('programs.buildWorkout')} exercises={(textDay?.exercises as any[]) || []} />

      <ProgramCompleteModal
        visible={finishModal}
        programName={program.name}
        completed
        onView={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFinishModal(false); endEnrollment(activeEnrollment.id, 'finished'); router.push(`/program-report/${activeEnrollment.id}` as any); }}
        onClose={() => setFinishModal(false)}
        theme={theme}
      />
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
  card: { borderRadius: 16, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  name: { ...Type.bodyMed, fontWeight: '700', flex: 1 },
  count: { ...Type.caption, fontFamily: Fonts.monoBold },
  finishBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  finishBannerTitle: { fontSize: 14, fontFamily: Fonts.bold, color: '#04120B' },
  finishBannerSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#04120B', opacity: 0.8, marginTop: 1 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3 },
  pct: { fontFamily: Fonts.monoBold, fontSize: 12, minWidth: 34, textAlign: 'right' },
  todayBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  todayHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { ...Type.caption, letterSpacing: 1, textTransform: 'uppercase', fontSize: 9.5, flex: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  todayName: { ...Type.h2, fontWeight: '700', lineHeight: 24 },
  menuBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  startBtnText: { color: '#04120B', fontSize: 14, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 34, gap: 4 },
  sheetTitle: { ...Type.h2, marginBottom: 8 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12 },
  sheetBtnText: { ...Type.body, fontWeight: '600' },
  swapGrid: { gap: 8 },
  swapChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  swapChipText: { ...Type.body, fontWeight: '600' },
  durLabel: { ...Type.caption, marginTop: 4, marginBottom: 6 },
  durInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 10 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  confirmText: { color: '#04120B', fontSize: 15, fontWeight: '800' },
});
