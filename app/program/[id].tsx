import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput, Switch, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { useApp, type Program, type ProgramDay, type WorkoutType } from '@/lib/app-context';
import { workoutApi } from '@/src/features/workout/api';
import { confirmDialog } from '@/lib/dialog';
import DateTimeField from '@/components/DateTimeField';
import WorkoutTextModal from '@/components/WorkoutTextModal';
import WorkoutBuilder, { type PrepExercise } from '@/components/WorkoutBuilder';
import { daySessions } from '@/lib/program-sessions';

// one session being edited in the day sheet
type EditSession = { id: string; label: string; type: WorkoutType | null; exercises: PrepExercise[] };
const mapEx = (exercises: PrepExercise[]) => exercises.map(e => ({
  exerciseId: e.exerciseId, name: e.name, muscleGroup: e.muscleGroup, restSeconds: e.restSeconds, sets: e.sets, isCustom: e.isCustom,
  ...(e.combo ? { combo: true, unbroken: e.unbroken, components: e.components, comboRounds: e.comboRounds, mode: e.mode, intervalSeconds: e.intervalSeconds, timeCapSeconds: e.timeCapSeconds } : {}),
  ...(e.kind === 'intervals' ? { kind: 'intervals' as const, intervals: e.intervals } : {}),
}));
import { programStats, positionToday, dayAggStatus, firstUndecidedSession, ordinalOf, dateForOrdinal, resolveDayExercises, programSequence, currentDayReachable } from '@/lib/program-schedule';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';


export default function ProgramBuilderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { programs, updateProgram, deleteProgram, workoutTemplates, isDark, user, enrollments, activeEnrollment, startProgram, endEnrollment, updateEnrollmentLocal, setEnrollmentDay, clearEnrollmentDay, workoutLogs, weightUnit } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const program = programs.find(p => p.id === id);

  // name/notes are typed locally, committed on blur (avoids an update per keystroke)
  const [name, setName] = useState(program?.name ?? '');
  const [notes, setNotes] = useState(program?.notes ?? '');
  useEffect(() => {
    if (program) { setName(program.name); setNotes(program.notes ?? ''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "New Program" persists an empty draft up front; if the user backs out without
  // adding anything, discard it instead of leaving an empty program behind.
  const disposableRef = useRef(false);
  useEffect(() => {
    const p = programs.find(x => x.id === id);
    const defaults = ['new program', String(t('programs.newProgram')).toLowerCase()];
    const enrolled = (enrollments ?? []).some(e => e.programId === id);
    disposableRef.current = !!p
      && (p.days?.length ?? 0) === 0
      && (!name.trim() || defaults.includes(name.trim().toLowerCase()))
      && !notes.trim()
      && !enrolled;
  }, [programs, id, name, notes, enrollments, t]);
  useEffect(() => () => { if (disposableRef.current) deleteProgram(String(id)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "view as text" sheet — shows a day's full workout as bullet points
  const [textDay, setTextDay] = useState<ProgramDay | null>(null);
  // enrolled-day action sheet (start / done+duration / skip / clear)
  const [dayAction, setDayAction] = useState<{ week: number; day: number } | null>(null);
  const [marking, setMarking] = useState(false);
  const [markDur, setMarkDur] = useState('');

  // day editor sheet state
  const [editing, setEditing] = useState<{ week: number; day: number } | null>(null);
  const [dRest, setDRest] = useState(false);
  // a day holds 1+ sessions (morning run + evening calisthenics), each built inline
  const [dSessions, setDSessions] = useState<EditSession[]>([]);
  const [dNotes, setDNotes] = useState('');
  const updateSession = (i: number, patch: Partial<EditSession>) => setDSessions(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const addSession = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDSessions(prev => [...prev, { id: Crypto.randomUUID(), label: '', type: null, exercises: [] }]); };
  const removeSession = (i: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDSessions(prev => prev.filter((_, idx) => idx !== i)); };

  const commit = useCallback((patch: Partial<Omit<Program, 'id' | 'userId'>>) => {
    if (!program) return;
    updateProgram(program.id, {
      name: program.name,
      startDate: program.startDate ?? null,
      weeks: program.weeks,
      notes: program.notes ?? '',
      days: program.days ?? [],
      weekMeta: program.weekMeta ?? [],
      ...patch,
    });
  }, [program, updateProgram]);

  // upsert a day by (weekIndex, dayIndex) into the days array
  const upsertDay = useCallback((day: ProgramDay) => {
    if (!program) return;
    const rest = (program.days ?? []).filter(d => !(d.weekIndex === day.weekIndex && d.dayIndex === day.dayIndex));
    commit({ days: [...rest, day] });
  }, [program, commit]);

  const removeDay = useCallback((week: number, dayIdx: number) => {
    if (!program) return;
    commit({ days: (program.days ?? []).filter(d => !(d.weekIndex === week && d.dayIndex === dayIdx)) });
  }, [program, commit]);

  const findDay = useCallback((week: number, dayIdx: number) =>
    (program?.days ?? []).find(d => d.weekIndex === week && d.dayIndex === dayIdx),
  [program]);

  const templateName = useCallback((templateId?: string | null) =>
    templateId ? workoutTemplates.find(tp => tp.id === templateId)?.name : undefined,
  [workoutTemplates]);

  const openDay = (week: number, dayIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const day = findDay(week, dayIdx);
    setDRest(day?.restDay ?? false);
    // seed each session (resolving a template ref to its exercises for inline editing)
    const seeded: EditSession[] = daySessions(day).map((sess) => {
      const exs = sess.templateId ? (workoutTemplates.find(t => t.id === sess.templateId)?.exercises ?? []) : (sess.exercises ?? []);
      return { id: sess.id || Crypto.randomUUID(), label: sess.label || '', type: ((sess.name || '') as WorkoutType) || null, exercises: exs.map(e => ({ ...e, uid: Crypto.randomUUID() })) };
    });
    setDSessions(seeded.length ? seeded : (day?.restDay ? [] : [{ id: Crypto.randomUUID(), label: '', type: null, exercises: [] }]));
    setDNotes(day?.notes ?? '');
    setEditing({ week, day: dayIdx });
  };

  const saveDay = () => {
    if (!editing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (dRest) {
      upsertDay({ weekIndex: editing.week, dayIndex: editing.day, restDay: true, templateId: null, sessions: [], label: '', notes: dNotes.trim() });
    } else {
      // one entry per built session (drop empty ones); the day's name/label = the first session's type
      const sessions = dSessions
        .filter(s => s.exercises.length > 0)
        .map(s => ({ id: s.id, label: s.label.trim(), name: s.type || '', templateId: null, exercises: mapEx(s.exercises) as any }));
      const dayName = sessions[0]?.name || '';
      upsertDay({ weekIndex: editing.week, dayIndex: editing.day, restDay: false, templateId: null, name: dayName, exercises: [], sessions, label: dayName, notes: dNotes.trim() });
    }
    setEditing(null);
  };

  const clearDay = () => {
    if (!editing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeDay(editing.week, editing.day);
    setEditing(null);
  };

  // Days are a flat sequence; position = weekIndex*7 + dayIndex. Any mutation
  // re-indexes to keep positions contiguous (Day 1..N).
  const reindexAndCommit = useCallback((days: ProgramDay[]) => {
    const sorted = [...days].sort((a, b) => (a.weekIndex * 7 + a.dayIndex) - (b.weekIndex * 7 + b.dayIndex));
    const norm = sorted.map((d, i) => ({ ...d, weekIndex: Math.floor(i / 7), dayIndex: i % 7 }));
    commit({ days: norm, weeks: Math.max(1, Math.ceil(norm.length / 7)), weekMeta: [] });
  }, [commit]);

  const addDay = () => {
    if (!program) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const n = (program.days ?? []).length;
    openDay(Math.floor(n / 7), n % 7); // blank editor at the next position; Save creates it
  };

  const deleteDayAt = async (week: number, day: number) => {
    if (!program) return;
    const d = findDay(week, day);
    if (d && (d.restDay || (d.exercises?.length ?? 0) > 0 || d.templateId)) {
      const ok = await confirmDialog({ title: t('programs.deleteDay', { defaultValue: 'Delete this day?' }), destructive: true, confirmText: t('programs.delete'), cancelText: t('programs.cancel') });
      if (!ok) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reindexAndCommit((program.days ?? []).filter(x => !(x.weekIndex === week && x.dayIndex === day)));
  };

  const moveDay = (ordinal: number, dir: -1 | 1) => {
    if (!program) return;
    const seq = programSequence(program);
    const j = ordinal + dir;
    if (j < 0 || j >= seq.length) return;
    Haptics.selectionAsync();
    const a = seq[ordinal], b = seq[j];
    const days = (program.days ?? []).map(d => {
      if (d.weekIndex === a.weekIndex && d.dayIndex === a.dayIndex) return { ...d, weekIndex: b.weekIndex, dayIndex: b.dayIndex };
      if (d.weekIndex === b.weekIndex && d.dayIndex === b.dayIndex) return { ...d, weekIndex: a.weekIndex, dayIndex: a.dayIndex };
      return d;
    });
    reindexAndCommit(days);
  };

  const startDay = (day: ProgramDay, sessionIndex = 0) => {
    if (!program) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Always go through the programId path (resolves inline AND template days in
    // prepare-workout) and, when enrolled, carry enrollmentId + slotDay so the
    // finished workout is written back as this day's completion and progress
    // advances. Without these params the log is never linked to the enrollment.
    const enr = activeEnrollment && activeEnrollment.programId === program.id
      ? `&enrollmentId=${activeEnrollment.id}&slotDay=${day.dayIndex}`
      : '';
    router.push((`/prepare-workout?programId=${program.id}&weekIndex=${day.weekIndex}&dayIndex=${day.dayIndex}&session=${sessionIndex}&run=1${enr}`) as any);
  };

  // ── share (owner originals only) ──────────────────────────────────────────
  // canShare comes from the API on hydrated objects; when it's absent (locally
  // created, not yet round-tripped) default to shareable for programs the user
  // owns and that are not received copies.
  const shareable = useMemo(() => {
    const p = program as (Program & { canShare?: boolean; sourceOwnerId?: string | null }) | undefined;
    if (!p) return false;
    const received = p.canShare === false || !!p.sourceOwnerId;
    if (received) return false;
    return p.canShare === true || !p.userId || p.userId === user?.id;
  }, [program, user]);

  // view = use the program (start each day); edit = author it. Default to use.
  const [mode, setMode] = useState<'view' | 'edit'>(edit ? 'edit' : 'view');
  const isEdit = mode === 'edit';

  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState<{ id: string; name: string; username: string; avatarUrl?: string }[]>([]);
  const [shareSearching, setShareSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; username: string; avatarUrl?: string } | null>(null);
  const [genCode, setGenCode] = useState(false);
  const [claimExpiry, setClaimExpiry] = useState<string | null>(null);
  const [claimUnlimited, setClaimUnlimited] = useState(true);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [accessUnlimited, setAccessUnlimited] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [sharedDirect, setSharedDirect] = useState(false);

  const openShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareQuery(''); setShareResults([]); setSelectedUser(null);
    setGenCode(false); setClaimExpiry(null); setClaimUnlimited(true);
    setAccessExpiry(null); setAccessUnlimited(true);
    setShareError(''); setResultCode(null); setSharedDirect(false); setSharing(false);
    setShareOpen(true);
  };

  // debounced user search (min 2 chars)
  useEffect(() => {
    if (!shareOpen || genCode) { setShareResults([]); setShareSearching(false); return; }
    const q = shareQuery.trim();
    if (q.length < 2) { setShareResults([]); setShareSearching(false); return; }
    setShareSearching(true);
    const h = setTimeout(() => {
      workoutApi.searchUsers(q)
        .then(r => setShareResults(Array.isArray(r) ? r : []))
        .catch(() => setShareResults([]))
        .finally(() => setShareSearching(false));
    }, 300);
    return () => clearTimeout(h);
  }, [shareQuery, shareOpen, genCode]);

  const canSend = (genCode || !!selectedUser) && !sharing;

  const doShare = async () => {
    if (!program || !canSend) return;
    setSharing(true); setShareError('');
    try {
      const res = await workoutApi.shareProgram(program.id, {
        toUserId: genCode ? null : (selectedUser?.id ?? null),
        generateCode: genCode,
        claimExpiresAt: claimUnlimited ? null : claimExpiry,
        accessExpiresAt: accessUnlimited ? null : accessExpiry,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res?.code) setResultCode(res.code);
      else setSharedDirect(true);
    } catch {
      setShareError(t('programs.shareError', { defaultValue: 'Could not share this program. Please try again.' }));
    } finally {
      setSharing(false);
    }
  };

  // expo-clipboard isn't installed → use the native share sheet for both copy + share
  const shareCode = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await Share.share({ message: code }); } catch {}
  };


  if (!program) {
    return (
      <View style={[s.container, { backgroundColor: theme.background, paddingTop: topPad + 20 }]}>
        <View style={s.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[s.notFoundText, { color: theme.textSecondary }]}>{t('programs.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={s.goBackBtn}>
            <Text style={s.goBackText}>{t('programs.goBack')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // enrollment overlay for the week grid: highlight today + show done/skipped
  const enrolled = activeEnrollment && activeEnrollment.programId === program.id ? activeEnrollment : null;
  const todayPos = enrolled ? positionToday(enrolled, program) : null;
  // The current day is only startable when its scheduled date has arrived (past
  // days are catch-up-able; future days stay locked — no running ahead).
  const currentUnlocked = enrolled ? currentDayReachable(enrolled, program) : false;
  const orderedDays = programSequence(program, isEdit ? null : enrolled);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
        <View style={s.headerActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(isEdit ? 'view' : 'edit'); }}
            hitSlop={12}
            accessibilityLabel={isEdit ? t('programs.done', { defaultValue: 'Done' }) : t('profile.edit')}
            style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name={isEdit ? 'checkmark' : 'create-outline'} size={22} color={isEdit ? Colors.electric : theme.text} />
          </Pressable>
          {shareable && !isEdit && (
            <Pressable onPress={openShare} hitSlop={12} accessibilityLabel={t('programs.share', { defaultValue: 'Share' })} style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="share-social-outline" size={22} color={Colors.electric} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* program meta */}
        {isEdit ? (
          <View style={[s.metaCard, { backgroundColor: theme.card }]}>
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('programs.programName')}</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              onBlur={() => commit({ name: name.trim() || program.name })}
              placeholder={t('programs.newProgram')}
              placeholderTextColor={theme.textMuted}
            />

            <View style={s.weeksRow}>
              <Text style={[s.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>{t('programs.days', { defaultValue: 'Days' })}</Text>
              <Text style={[s.weeksVal, { color: theme.text }]}>{t('programs.daysCount', { n: (program.days ?? []).length, defaultValue: `${(program.days ?? []).length} days` })}</Text>
            </View>

            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('programs.notesOptional')}</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, height: 64, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              onBlur={() => commit({ notes: notes.trim() })}
              placeholder={t('programs.programNotesPlaceholder')}
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>
        ) : (
          <View style={[s.viewSummary, { backgroundColor: theme.card }]}>
            <View style={s.weeksRow}>
              <Text style={[s.weeksVal, { color: theme.text }]}>{t('programs.daysCount', { n: (program.days ?? []).length, defaultValue: `${(program.days ?? []).length} days` })}</Text>
              <View style={[s.useHint, { backgroundColor: Colors.electric + '18' }]}>
                <Ionicons name="play" size={11} color={Colors.electric} />
                <Text style={[s.useHintText, { color: Colors.electric }]}>{t('programs.tapDayToStart', { defaultValue: 'Tap a day to start' })}</Text>
              </View>
            </View>
            {!!program.notes && <Text style={[s.viewNotes, { color: theme.textSecondary }]}>{program.notes}</Text>}
          </View>
        )}

        {/* start / active enrollment */}
        {!isEdit && (() => {
          const active = activeEnrollment && activeEnrollment.programId === program.id ? activeEnrollment : null;
          if (active) {
            return (
              <View style={[s.metaCard, { backgroundColor: theme.card, gap: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="flag" size={16} color={Colors.electric} />
                  <Text style={[s.dayTitle, { flex: 1, color: theme.text }]}>{t('programs.activeProgram', { defaultValue: 'Active program' })}</Text>
                  <Pressable
                    onPress={async () => {
                      if (!await confirmDialog({ title: t('programs.endProgramConfirm', { defaultValue: 'End this program?' }), message: t('programs.endProgramMsg', { defaultValue: 'You will see your full journey report. This closes the program.' }), destructive: true, confirmText: t('programs.endProgram', { defaultValue: 'End' }) })) return;
                      // completed all days → 'finished'; ended early → 'abandoned'
                      endEnrollment(active.id, todayPos?.finishedPlan ? 'finished' : 'abandoned');
                      router.push(`/program-report/${active.id}` as any);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  >
                    <Ionicons name="stop-circle-outline" size={16} color={theme.textMuted} />
                    <Text style={[s.useHintText, { color: theme.textMuted }]}>{t('programs.endProgram', { defaultValue: 'End' })}</Text>
                  </Pressable>
                </View>

                {/* all days decided → invite the user to close it out and see the report */}
                {todayPos?.finishedPlan && (
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); endEnrollment(active.id, 'finished'); router.push(`/program-report/${active.id}` as any); }}
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
                <DateTimeField
                  label={t('programs.startedOn', { defaultValue: 'Started on' })}
                  value={active.startDate}
                  onChange={(iso) => iso && updateEnrollmentLocal(active.id, { startDate: iso })}
                  theme={theme}
                />
                <Text style={[s.viewNotes, { color: theme.textMuted, marginTop: 0 }]}>{t('programs.backfillHint', { defaultValue: 'Backdate the start, then tap past days on the Today card to mark them done.' })}</Text>
                {(() => {
                  const st = programStats(active, program, workoutLogs);
                  const time = st.minutes >= 60 ? `${Math.floor(st.minutes / 60)}h ${st.minutes % 60}m` : `${st.minutes}m`;
                  const tiles = [
                    { label: t('programs.statDone', { defaultValue: 'Done' }), value: String(st.done), color: Colors.semantic.success },
                    { label: t('programs.statSkipped', { defaultValue: 'Skipped' }), value: String(st.skipped), color: Colors.semantic.warn },
                    { label: t('programs.statAdherence', { defaultValue: 'Adherence' }), value: `${st.adherencePct}%`, color: Colors.electric },
                    { label: t('programs.statTime', { defaultValue: 'Time' }), value: time, color: theme.text },
                  ];
                  return (
                    <View style={s.statsRow}>
                      {tiles.map((ti, i) => (
                        <View key={i} style={[s.statTile, { backgroundColor: theme.cardAlt }]}>
                          <Text style={[s.statValue, { color: ti.color }]} numberOfLines={1}>{ti.value}</Text>
                          <Text style={[s.statLabel, { color: theme.textMuted }]}>{ti.label}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-history/${program.id}` as any); }}
                  style={({ pressed }) => [s.historyBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  <Text style={[s.historyBtnText, { color: theme.textSecondary }]}>{t('programs.viewHistory', { defaultValue: 'View history' })}</Text>
                  <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-report/${active.id}` as any); }}
                  style={({ pressed }) => [s.historyBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="stats-chart-outline" size={16} color={Colors.electric} />
                  <Text style={[s.historyBtnText, { color: theme.textSecondary }]}>{t('programs.viewReport', { defaultValue: 'View report' })}</Text>
                  <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                </Pressable>
              </View>
            );
          }
          // idle: not the active program, but a past finished/abandoned run exists → link its report
          const lastRun = (enrollments ?? []).filter(e => e.programId === program.id && e.status !== 'active')
            .sort((a, b) => new Date(b.finishedAt || b.startDate).getTime() - new Date(a.finishedAt || a.startDate).getTime())[0];
          const canStart = orderedDays.length > 0;
          return (
            <>
              <Pressable
                onPress={() => { if (!canStart) { setMode('edit'); return; } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startProgram(program.id, new Date().toISOString()); }}
                style={({ pressed }) => [s.startProgramBtn, { backgroundColor: canStart ? Colors.electric : theme.cardAlt, opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name={canStart ? 'flag' : 'add'} size={18} color={canStart ? '#04120B' : Colors.electric} />
                <Text style={[s.startProgramText, canStart ? null : { color: Colors.electric }]}>{canStart ? t('programs.startProgram', { defaultValue: 'Start this program' }) : t('programs.addDaysFirst', { defaultValue: 'Add days first' })}</Text>
              </Pressable>
              {lastRun && (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-report/${lastRun.id}` as any); }}
                  style={({ pressed }) => [s.historyBtn, { borderColor: theme.border, marginTop: 10, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="stats-chart-outline" size={16} color={Colors.electric} />
                  <Text style={[s.historyBtnText, { color: theme.textSecondary }]}>{t('programs.viewLastReport', { defaultValue: 'View last report' })}</Text>
                  <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                </Pressable>
              )}
            </>
          );
        })()}

        {/* owner: who has this program */}
        {!isEdit && shareable && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(('/program-shares/' + program.id) as any); }}
            style={({ pressed }) => [s.manageRow, { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={[s.dayBadge, { width: 34, height: 34, backgroundColor: Colors.electric + '18' }]}>
              <Ionicons name="people-outline" size={17} color={Colors.electric} />
            </View>
            <Text style={[s.dayTitle, { flex: 1, color: theme.text }]}>{t('programs.whoHasThis', { defaultValue: 'Who has this' })}</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
          </Pressable>
        )}

        {/* day list */}
        {orderedDays.length === 0 && !isEdit && (
          <View style={[s.viewSummary, { backgroundColor: theme.card, alignItems: 'center' }]}>
            <Text style={[s.viewNotes, { color: theme.textMuted, marginTop: 0 }]}>{t('programs.noDaysYet', { defaultValue: 'No days in this program yet.' })}</Text>
          </View>
        )}
        {orderedDays.map((sd) => {
          const w = sd.weekIndex, dIdx = sd.dayIndex, ord = sd.ordinal, day = sd.day;
          const sessions = day.restDay ? [] : daySessions(day);
          const sCount = sessions.length;
          const single = sCount === 1;
          const firstExs = single ? (sessions[0].exercises?.length ?? 0) : 0;
          const inlineCount = single ? firstExs : 0; // legacy peek path: single-session days only
          const planned = !day.restDay && sCount > 0;
          const title = day.restDay
            ? t('programs.restDay')
            : (day.name || day.label || (sCount > 0 ? t('programs.buildWorkout') : t('programs.emptyDay', { defaultValue: 'Empty day' })));
          const cStatus = enrolled && !isEdit && program ? dayAggStatus(enrolled, program, w, dIdx) : null;
          const isCurrent = !!todayPos && !isEdit && !todayPos.finishedPlan && todayPos.week === w && todayPos.dayIndex === dIdx;
          // "today" (highlighted + startable) only when the current day is also
          // due by the calendar; a current-but-future day renders locked.
          const isToday = isCurrent && currentUnlocked;
          const undecidedIdx = enrolled && program && !isEdit ? firstUndecidedSession(enrolled, program, w, dIdx) : (planned ? 0 : -1);
          const canStartToday = planned && isToday && undecidedIdx !== -1;
          const statusCol = cStatus === 'done' ? Colors.semantic.success : cStatus === 'skipped' ? Colors.semantic.warn : cStatus === 'partial' ? Colors.electric : cStatus === 'rest' ? theme.textSecondary : null;
          const dateStr = enrolled && !isEdit ? dateForOrdinal(enrolled, ord).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
          // enrolled: only the active (today) day is startable. Future days open their
          // text preview; to play a different day, act on the active day (skip / swap).
          const viewText = inlineCount > 0
            ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTextDay({ ...day, exercises: resolveDayExercises(enrolled, w, dIdx, (day.exercises as any[]) || []) } as any); }
            : undefined;
          const onRow = isEdit
            ? () => openDay(w, dIdx)
            : (enrolled && planned && isToday)
              ? () => { Haptics.selectionAsync(); setMarking(false); setMarkDur(''); setDayAction({ week: w, day: dIdx }); }
              // enrolled-but-locked, or before the program is started: preview
              // only. No individual day is startable outside the active day.
              : (planned ? viewText : undefined);
          const sessNames = sessions.map((se, i) => se.name || se.label || t('programs.sessionN', { n: i + 1, defaultValue: `Session ${i + 1}` })).join(', ');
          const sub = [
            dateStr,
            day.restDay ? ''
              : sCount > 1 ? `${t('programs.sessionsN', { n: sCount, defaultValue: `${sCount} sessions` })}  ·  ${sessNames}`
              : firstExs > 0 ? t('programs.exercisesN', { n: firstExs })
              : day.label ? day.label : t('programs.tapToBuild', { defaultValue: 'Tap to build' }),
          ].filter(Boolean).join('  ·  ');
          return (
            <Pressable
              key={ord}
              onPress={onRow}
              disabled={!onRow}
              style={({ pressed }) => [
                s.dayRow2,
                { backgroundColor: pressed && onRow ? theme.cardAlt : theme.card, borderColor: theme.border },
                planned && { borderColor: Colors.electric + '40' },
                statusCol && { borderColor: statusCol + '77' },
                isToday && { borderColor: Colors.electric, borderWidth: 1.5 },
              ]}
            >
              <View style={[s.dayBadge, {
                backgroundColor: day.restDay ? theme.cardAlt : Colors.electric,
                borderColor: day.restDay ? theme.border : 'transparent',
                borderWidth: day.restDay ? 1 : 0,
              }]}>
                <Text style={[s.dayBadgeText, { color: day.restDay ? theme.textMuted : '#04120B' }]}>{`D${ord + 1}`}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.dayTitle, { color: day.restDay ? theme.textSecondary : theme.text, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
                  {isToday && (
                    <View style={[s.todayTag, { backgroundColor: Colors.electric }]}>
                      <Text style={s.todayTagText}>{t('programs.today', { defaultValue: 'TODAY' })}</Text>
                    </View>
                  )}
                </View>
                {!!sub && <Text style={[s.daySub, { color: theme.textMuted }]} numberOfLines={1}>{sub}</Text>}
              </View>
              {inlineCount > 0 && (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTextDay({ ...day, exercises: resolveDayExercises(enrolled, w, dIdx, (day.exercises as any[]) || []) } as any); }}
                  hitSlop={8}
                  style={({ pressed }) => [s.peekBtn, { backgroundColor: theme.cardAlt, opacity: pressed ? 0.6 : 1 }]}
                  accessibilityLabel={t('programs.viewAsText', { defaultValue: 'View as text' })}
                >
                  <Ionicons name="list-outline" size={16} color={Colors.electric} />
                </Pressable>
              )}
              {isEdit ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable onPress={() => moveDay(ord, -1)} disabled={ord === 0} hitSlop={4} style={{ padding: 3, opacity: ord === 0 ? 0.3 : 1 }}><Ionicons name="chevron-up" size={18} color={theme.textSecondary} /></Pressable>
                  <Pressable onPress={() => moveDay(ord, 1)} disabled={ord === orderedDays.length - 1} hitSlop={4} style={{ padding: 3, opacity: ord === orderedDays.length - 1 ? 0.3 : 1 }}><Ionicons name="chevron-down" size={18} color={theme.textSecondary} /></Pressable>
                  <Pressable onPress={() => deleteDayAt(w, dIdx)} hitSlop={4} style={{ padding: 3 }}><Ionicons name="trash-outline" size={17} color={theme.textMuted} /></Pressable>
                </View>
              ) : canStartToday ? (
                <View style={[s.startBtn, { backgroundColor: Colors.electric }]}>
                  <Ionicons name="play" size={11} color="#04120B" />
                  <Text style={[s.startBtnText, { color: '#04120B' }]}>{t('programs.startDay')}</Text>
                </View>
              ) : cStatus ? (
                <View style={[s.statusChip, { backgroundColor: statusCol! + '22' }]}>
                  <Ionicons name={cStatus === 'done' ? 'checkmark-circle' : cStatus === 'skipped' ? 'close-circle' : cStatus === 'partial' ? 'ellipsis-horizontal-circle' : 'moon'} size={13} color={statusCol!} />
                  <Text style={[s.statusChipText, { color: statusCol! }]}>{t(`programs.${cStatus}`, { defaultValue: cStatus })}</Text>
                </View>
              ) : planned ? (
                // locked: enrolled future day, or any day before the program is
                // started. Lock icon only — no label (cleaner, less noise).
                <View style={[s.lockChip, { backgroundColor: theme.cardAlt }]} accessibilityLabel={t('programs.upcoming', { defaultValue: 'Upcoming' })}>
                  <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
                </View>
              ) : day.restDay ? (
                <Ionicons name="moon" size={15} color={theme.textSecondary} />
              ) : null}
            </Pressable>
          );
        })}

        {/* add day — edit mode only */}
        {isEdit && (
          <Pressable
            onPress={addDay}
            style={({ pressed }) => [s.addWeekBtn, { backgroundColor: theme.card, borderColor: Colors.electric + '55', opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="add" size={18} color={Colors.electric} />
            <Text style={[s.addWeekText, { color: Colors.electric }]}>{t('programs.addDay', { defaultValue: 'Add day' })}</Text>
          </Pressable>
        )}

        {/* delete program — edit mode only, confirm required (kept off the list so it isn't a one-tap action) */}
        {isEdit && (
          <Pressable
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const ok = await confirmDialog({ title: t('programs.deleteProgram', { defaultValue: 'Delete program?' }), message: t('programs.deleteProgramConfirm', { name: program.name, defaultValue: `Delete "${program.name}"? This can't be undone.` }), destructive: true, confirmText: t('programs.delete', { defaultValue: 'Delete' }), cancelText: t('programs.cancel', { defaultValue: 'Cancel' }) });
              if (!ok) return;
              disposableRef.current = false; // don't double-delete on unmount
              deleteProgram(String(id));
              router.canGoBack() ? router.back() : router.replace('/programs' as any);
            }}
            style={({ pressed }) => [s.deleteProgramBtn, { borderColor: Colors.semantic.danger + '55', opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.semantic.danger} />
            <Text style={[s.deleteProgramText, { color: Colors.semantic.danger }]}>{t('programs.deleteProgram', { defaultValue: 'Delete program' })}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* view-as-text sheet */}
      <WorkoutTextModal
        visible={textDay !== null}
        onClose={() => setTextDay(null)}
        title={textDay?.name || t('programs.buildWorkout')}
        exercises={(textDay?.exercises as any[]) || []}
      />

      {/* enrolled-day action sheet */}
      <Modal visible={dayAction !== null} transparent animationType="fade" onRequestClose={() => setDayAction(null)}>
        <Pressable style={s.actionOverlay} onPress={() => setDayAction(null)}>
          <Pressable style={[s.actionSheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            {dayAction && enrolled && (() => {
              const d = findDay(dayAction.week, dayAction.day);
              const st = program ? dayAggStatus(enrolled, program, dayAction.week, dayAction.day) : null;
              const sess = d ? daySessions(d) : [];
              const multiSess = sess.length > 1;
              // act on the first still-undecided session; if all decided, fall back to session 0
              const undec = program ? firstUndecidedSession(enrolled, program, dayAction.week, dayAction.day) : 0;
              const si = undec === -1 ? 0 : undec;
              const curSess = sess[si];
              const commitDone = () => {
                const mins = parseInt(markDur, 10);
                setEnrollmentDay(enrolled.id, dayAction.week, dayAction.day, 'done', { sessionIndex: si, ...(Number.isFinite(mins) && mins > 0 ? { durationMin: mins } : {}) });
                setDayAction(null);
              };
              return (
                <>
                  <Text style={[s.actionTitle, { color: theme.text }]}>
                    {t('programs.dayN', { n: dayAction.week * 7 + dayAction.day + 1, defaultValue: `Day ${dayAction.week * 7 + dayAction.day + 1}` })}{multiSess ? ` · ${t('programs.sessionOfN', { n: si + 1, total: sess.length, defaultValue: `Session ${si + 1}/${sess.length}` })}` : ''}{curSess?.name ? ` · ${curSess.name}` : (d?.name ? ` · ${d.name}` : '')}
                  </Text>
                  {marking ? (
                    <>
                      <Text style={[s.fieldLabel, { color: theme.textSecondary, marginTop: 4 }]}>{t('programs.durationMinutes', { defaultValue: 'Duration (minutes)' })}</Text>
                      <TextInput
                        style={[s.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        value={markDur}
                        onChangeText={setMarkDur}
                        keyboardType="number-pad"
                        placeholder="45"
                        placeholderTextColor={theme.textMuted}
                        autoFocus
                      />
                      <Pressable onPress={commitDone} style={[s.startProgramBtn, { backgroundColor: Colors.electric, marginBottom: 0, marginTop: 4 }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#04120B" />
                        <Text style={s.startProgramText}>{t('programs.markDone', { defaultValue: 'Mark done' })}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {d && !d.restDay && curSess && ((curSess.exercises?.length ?? 0) > 0 || curSess.templateId) && (
                        <>
                          <ActBtn icon="play" color={Colors.electric} label={t('programs.startDay', { defaultValue: 'Start' })} onPress={() => { setDayAction(null); if (d) startDay(d, si); }} theme={theme} />
                          <ActBtn icon="list-outline" color={theme.text} label={t('programs.viewAsText', { defaultValue: 'View as text' })} onPress={() => { setTextDay({ name: curSess.name || d.name, exercises: (curSess.exercises as any) || [] } as any); setDayAction(null); }} theme={theme} />
                        </>
                      )}
                      <ActBtn icon="checkmark-circle" color={Colors.semantic.success} label={t('programs.markDone', { defaultValue: 'Mark done' })} onPress={() => setMarking(true)} theme={theme} />
                      <ActBtn icon="close-circle" color={Colors.semantic.warn} label={t('programs.markSkipped', { defaultValue: 'Mark skipped' })} onPress={() => { setEnrollmentDay(enrolled.id, dayAction.week, dayAction.day, 'skipped', { sessionIndex: si }); setDayAction(null); }} theme={theme} />
                      {st && <ActBtn icon="refresh" color={theme.textMuted} label={t('programs.clearStatus', { defaultValue: 'Clear' })} onPress={() => { clearEnrollmentDay(enrolled.id, dayAction.week, dayAction.day, si); setDayAction(null); }} theme={theme} />}
                    </>
                  )}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* day editor bottom sheet */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} />
          <View style={[s.sheet, { backgroundColor: theme.background }]}>
            <View style={s.sheetHandleWrap}>
              <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
            </View>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>
                {editing
                  ? t('programs.dayN', { n: editing.week * 7 + editing.day + 1, defaultValue: `Day ${editing.week * 7 + editing.day + 1}` })
                  : t('programs.planDay')}
              </Text>
              <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            {/* builder + rest/notes + template list scroll together; footer stays pinned */}
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {/* rest toggle */}
              <View style={[s.restRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="moon-outline" size={18} color={Colors.accent} />
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{t('programs.restDayToggle')}</Text>
                </View>
                <Switch
                  value={dRest}
                  onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDRest(v); }}
                  trackColor={{ false: theme.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* day notes */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.miniLabel, { color: theme.textMuted }]}>{t('programs.notesOptional')}</Text>
                <TextInput
                  style={[s.sheetInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={dNotes}
                  onChangeText={setDNotes}
                  placeholder={t('programs.dayNotesPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              {!dRest && (
                <>
                  {dSessions.map((sess, i) => (
                    <View key={sess.id} style={[s.sessionCard, { borderColor: theme.border }]}>
                      <View style={s.sessionHead}>
                        <View style={[s.sessionIndexBadge, { backgroundColor: Colors.electric + '1F' }]}>
                          <Text style={[s.sessionIndexText, { color: Colors.electric }]}>{i + 1}</Text>
                        </View>
                        <TextInput
                          style={[s.sessionLabelInput, { color: theme.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
                          value={sess.label}
                          onChangeText={(v) => updateSession(i, { label: v })}
                          placeholder={t('programs.sessionLabelPlaceholder', { n: i + 1, defaultValue: `Session ${i + 1} (e.g. Morning)` })}
                          placeholderTextColor={theme.textMuted}
                        />
                        {dSessions.length > 1 && (
                          <Pressable onPress={() => removeSession(i)} hitSlop={8} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={17} color={Colors.semantic.danger} />
                          </Pressable>
                        )}
                      </View>
                      <WorkoutBuilder
                        workoutType={sess.type}
                        exercises={sess.exercises}
                        onChangeType={(type) => updateSession(i, { type })}
                        onChangeExercises={(ex) => updateSession(i, { exercises: ex })}
                        theme={theme}
                      />
                    </View>
                  ))}

                  <Pressable onPress={addSession} style={({ pressed }) => [s.addSessionBtn, { borderColor: Colors.electric + '55', opacity: pressed ? 0.85 : 1 }]}>
                    <Ionicons name="add" size={18} color={Colors.electric} />
                    <Text style={[s.addSessionText, { color: Colors.electric }]}>{t('programs.addSession', { defaultValue: 'Add another session' })}</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>

            <View style={[s.sheetFooter, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom + 12 }]}>
              <Pressable
                onPress={clearDay}
                style={({ pressed }) => [s.clearBtn, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name="trash-outline" size={16} color="#F87171" />
                <Text style={s.clearBtnText}>{t('programs.clearDay')}</Text>
              </Pressable>
              <Pressable onPress={saveDay} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveBtn}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>{t('programs.save')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* share bottom sheet (owner originals only) */}
      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={() => setShareOpen(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShareOpen(false)} />
          <View style={[s.sheet, { backgroundColor: theme.background, height: '82%' }]}>
            <View style={s.sheetHandleWrap}>
              <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
            </View>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>{t('programs.shareProgram', { defaultValue: 'Share program' })}</Text>
              <Pressable onPress={() => setShareOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            {resultCode ? (
              /* code result */
              <View style={{ flex: 1 }}>
                <Text style={[s.miniLabel, { color: theme.textMuted, marginTop: 8 }]}>{t('programs.shareCodeReady', { defaultValue: 'Share this code' })}</Text>
                <View style={[s.codeBox, { backgroundColor: theme.card, borderColor: Colors.electric + '55' }]}>
                  <Text style={[s.codeText, { color: theme.text }]} selectable>{resultCode}</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 }}>
                  {t('programs.shareCodeHint', { defaultValue: 'Anyone with this code can add a copy of the program to their account.' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Pressable onPress={() => shareCode(resultCode)} style={({ pressed }) => [s.clearBtn, { flex: 1, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="copy-outline" size={16} color={theme.text} />
                    <Text style={[s.clearBtnText, { color: theme.text }]}>{t('programs.copy', { defaultValue: 'Copy' })}</Text>
                  </Pressable>
                  <Pressable onPress={() => shareCode(resultCode)} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}>
                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                      <Ionicons name="share-social-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnText}>{t('programs.share', { defaultValue: 'Share' })}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            ) : sharedDirect ? (
              /* direct share success */
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 40 }}>
                <View style={[s.successCircle, { backgroundColor: Colors.electric + '18' }]}>
                  <Ionicons name="checkmark-circle" size={40} color={Colors.electric} />
                </View>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  {t('programs.shareSent', { defaultValue: 'Invitation sent' })}
                </Text>
                {selectedUser && (
                  <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center' }}>
                    {t('programs.shareSentTo', { defaultValue: 'Sent to {{name}}', name: selectedUser.name })}
                  </Text>
                )}
                <Pressable onPress={() => setShareOpen(false)} style={({ pressed }) => [{ marginTop: 8, opacity: pressed ? 0.9 : 1 }]}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.saveBtn, { paddingHorizontal: 40 }]}>
                    <Text style={s.saveBtnText}>{t('programs.done', { defaultValue: 'Done' })}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              /* share form */
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* generate-code toggle */}
                <View style={[s.restRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="link-outline" size={18} color={Colors.electric} />
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{t('programs.generateCode', { defaultValue: 'Generate a code / link' })}</Text>
                  </View>
                  <Switch
                    value={genCode}
                    onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGenCode(v); if (v) setSelectedUser(null); }}
                    trackColor={{ false: theme.border, true: Colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {!genCode && (
                  <>
                    <Text style={[s.miniLabel, { color: theme.textMuted, marginTop: 4 }]}>{t('programs.shareWithUser', { defaultValue: 'Share with someone' })}</Text>
                    {selectedUser ? (
                      <View style={[s.userRow, { backgroundColor: theme.card, borderColor: Colors.electric + '55', borderWidth: 1 }]}>
                        <View style={[s.avatar, { backgroundColor: theme.surface }]}>
                          <Ionicons name="person" size={16} color={theme.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{selectedUser.name}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>@{selectedUser.username}</Text>
                        </View>
                        <Pressable onPress={() => setSelectedUser(null)} hitSlop={8}>
                          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <Ionicons name="search" size={16} color={theme.textMuted} />
                          <TextInput
                            style={[s.searchInput, { color: theme.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
                            value={shareQuery}
                            onChangeText={setShareQuery}
                            placeholder={t('programs.searchUsers', { defaultValue: 'Search by name or @username' })}
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                          />
                          {shareSearching && <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />}
                        </View>
                        {shareResults.map(u => (
                          <Pressable
                            key={u.id}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedUser(u); setShareQuery(''); setShareResults([]); }}
                            style={[s.userRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                          >
                            <View style={[s.avatar, { backgroundColor: theme.surface }]}>
                              <Ionicons name="person" size={16} color={theme.textMuted} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{u.name}</Text>
                              <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>@{u.username}</Text>
                            </View>
                          </Pressable>
                        ))}
                        {!shareSearching && shareQuery.trim().length >= 2 && shareResults.length === 0 && (
                          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 14, fontSize: 13 }}>
                            {t('programs.noUsersFound', { defaultValue: 'No users found' })}
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* claim expiry */}
                <View style={{ marginTop: 16 }}>
                  <View style={s.expiryHead}>
                    <Text style={[s.miniLabel, { color: theme.textMuted, marginBottom: 0 }]}>{t('programs.claimExpiry', { defaultValue: 'Claim window' })}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('programs.unlimited', { defaultValue: 'Unlimited' })}</Text>
                      <Switch
                        value={claimUnlimited}
                        onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setClaimUnlimited(v); if (v) setClaimExpiry(null); }}
                        trackColor={{ false: theme.border, true: Colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                  {!claimUnlimited && (
                    <DateTimeField label={t('programs.claimExpiryLabel', { defaultValue: 'Must be claimed before' })} value={claimExpiry} onChange={setClaimExpiry} theme={theme} minDate={new Date()} optional />
                  )}
                </View>

                {/* access expiry */}
                <View style={{ marginTop: 8 }}>
                  <View style={s.expiryHead}>
                    <Text style={[s.miniLabel, { color: theme.textMuted, marginBottom: 0 }]}>{t('programs.accessExpiry', { defaultValue: 'Access window' })}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('programs.unlimited', { defaultValue: 'Unlimited' })}</Text>
                      <Switch
                        value={accessUnlimited}
                        onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAccessUnlimited(v); if (v) setAccessExpiry(null); }}
                        trackColor={{ false: theme.border, true: Colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                  {!accessUnlimited && (
                    <DateTimeField label={t('programs.accessExpiryLabel', { defaultValue: 'Access expires' })} value={accessExpiry} onChange={setAccessExpiry} theme={theme} minDate={new Date()} optional />
                  )}
                </View>

                {shareError ? (
                  <Text style={{ color: Colors.semantic.danger, fontSize: 13, marginTop: 14, textAlign: 'center' }}>{shareError}</Text>
                ) : null}
              </ScrollView>
            )}

            {!resultCode && !sharedDirect && (
              <View style={[s.sheetFooter, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom + 12 }]}>
                <Pressable onPress={doShare} disabled={!canSend} style={({ pressed }) => [{ flex: 1, opacity: !canSend ? 0.5 : pressed ? 0.9 : 1 }]}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                    <Ionicons name={genCode ? 'key-outline' : 'paper-plane-outline'} size={18} color="#fff" />
                    <Text style={s.saveBtnText}>{genCode ? t('programs.createCode', { defaultValue: 'Create code' }) : t('programs.send', { defaultValue: 'Send' })}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Per-week name + notes. Local-first (typed value is source of truth) and committed
// on blur, matching the program name/notes fields above. Keyed by program+week so it
// re-seeds when the program changes.
function ActBtn({ icon, color, label, onPress, theme }: { icon: any; color: string; label: string; onPress: () => void; theme: any }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.actBtn, { backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={[s.actBtnText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 34, gap: 4 },
  actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12 },
  actBtnText: { fontSize: 15, fontWeight: '600' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  notFoundText: { fontSize: 16, fontWeight: '600' },
  goBackBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goBackText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metaCard: { borderRadius: 16, padding: 14, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  weeksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  weeksVal: { fontSize: 14, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  weekTrashBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  addWeekBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginTop: 4,
  },
  addWeekText: { fontSize: 14, fontWeight: '700' },
  deleteProgramBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 24,
  },
  deleteProgramText: { fontSize: 14, fontWeight: '700' },
  buildBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  buildBtnText: { flex: 1, fontSize: 14, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  weekCard: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  weekTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, marginBottom: 12 },
  viewSummary: { borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 },
  useHint: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  useHintText: { fontSize: 11.5, fontWeight: '700' },
  viewNotes: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  dayRow2: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  dayBadge: { width: 46, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 12, fontWeight: '800' },
  dayTitle: { fontSize: 14, fontWeight: '600' },
  daySub: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11 },
  dayName: { fontSize: 12, fontWeight: '600', minWidth: 44, maxWidth: 70 },
  dayState: { flex: 1, fontSize: 13, fontWeight: '500' },
  restChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  restChipText: { fontSize: 12, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  startBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  peekBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lockChip: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  todayTagText: { color: '#04120B', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  startProgramBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 12 },
  startProgramText: { color: '#04120B', fontSize: 15, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statTile: { flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: Fonts.monoBold, fontSize: 15 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  historyBtnText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  finishBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  finishBannerTitle: { fontSize: 15, fontWeight: '800', color: '#04120B' },
  finishBannerSub: { fontSize: 12.5, fontWeight: '600', color: '#04120B', opacity: 0.8, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8 },
  restRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 8,
  },
  inputsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  sheetInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  sessionCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 14 },
  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sessionIndexBadge: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sessionIndexText: { fontSize: 13, fontWeight: '800' },
  sessionLabelInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  addSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 8 },
  addSessionText: { fontSize: 14, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  tmplRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tmplIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  clearBtnText: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, paddingVertical: 13,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // per-week name/notes
  weekMetaWrap: { gap: 6, marginBottom: 6 },
  weekNameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontWeight: '600' },
  weekNotesInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, minHeight: 36, textAlignVertical: 'top' },
  // share sheet
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  expiryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  codeBox: { borderWidth: 1, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 16, marginTop: 8, alignItems: 'center' },
  codeText: { fontFamily: Fonts.monoBold, fontSize: 26, letterSpacing: 3, textAlign: 'center' },
  successCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
