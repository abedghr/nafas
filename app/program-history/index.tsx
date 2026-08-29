// All finished / ended programs across the account, with dropdown status +
// date-range filters and a plain-language insights panel over the filtered set.
// Each row opens that run's full report. (Per-program day history lives at ./[id].)
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';
import DateTimeField from '@/components/DateTimeField';
import { buildReport, aggregateReports, type ProgramReport } from '@/lib/program-report';

type StatusFilter = 'all' | 'finished' | 'abandoned';

const bandColor = (rate: number) => (rate >= 0.75 ? Colors.electric : rate >= 0.4 ? Colors.semantic.warn : Colors.semantic.danger);
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export default function EndedProgramsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { programs, enrollments, workoutLogs, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  // every ended run → its report (from live program or frozen snapshot)
  const allRows = useMemo(() => {
    return (enrollments ?? [])
      .filter((e) => e.status !== 'active')
      .map((e) => {
        const program = (programs.find((p: any) => p.id === e.programId) ?? e.programSnapshot) as any;
        if (!program) return null;
        return { e, program, r: buildReport(e, program, workoutLogs) };
      })
      .filter(Boolean) as { e: any; program: any; r: ProgramReport }[];
  }, [enrollments, programs, workoutLogs]);

  const rows = useMemo(() => {
    const f = from ? startOfDay(new Date(from)).getTime() : null;
    const tt = to ? endOfDay(new Date(to)).getTime() : null;
    return allRows
      .filter((x) => (status === 'all' ? true : x.e.status === status))
      // keep a run whose [start,end] overlaps the chosen window
      .filter((x) => {
        const s = new Date(x.r.startDate).getTime(), e = new Date(x.r.endDate).getTime();
        if (f != null && e < f) return false;
        if (tt != null && s > tt) return false;
        return true;
      })
      .sort((a, b) => new Date(b.r.endDate).getTime() - new Date(a.r.endDate).getTime());
  }, [allRows, status, from, to]);

  const insights = useMemo(() => aggregateReports(rows.map((x) => x.r)), [rows]);

  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const fmtShort = (s: string) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const statusLabel = status === 'all' ? t('history.fAll', { defaultValue: 'All programs' })
    : status === 'finished' ? t('history.fCompleted', { defaultValue: 'Completed' })
    : t('history.fEnded', { defaultValue: 'Ended early' });
  const dateLabel = from && to ? `${fmtShort(from)} – ${fmtShort(to)}`
    : from ? t('history.since', { date: fmtShort(from), defaultValue: `Since ${fmtShort(from)}` })
    : to ? t('history.until', { date: fmtShort(to), defaultValue: `Until ${fmtShort(to)}` })
    : t('history.rAll', { defaultValue: 'All time' });

  const setPreset = (days: number) => { const now = new Date(); setFrom(new Date(now.getTime() - days * 86400000).toISOString()); setTo(now.toISOString()); };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
        <Text style={[s.headerTitle, { color: theme.text }]}>{t('history.title', { defaultValue: 'Program history' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {allRows.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ribbon-outline" size={40} color={theme.textMuted} />
            <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 12 }]}>
              {t('history.empty', { defaultValue: 'No finished programs yet. Complete or end a program to see it here.' })}
            </Text>
          </View>
        ) : (
          <>
            {/* dropdown filters */}
            <View style={s.dropRow}>
              <Pressable onPress={() => { Haptics.selectionAsync(); setStatusOpen(true); }} style={[s.drop, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="funnel-outline" size={15} color={theme.textSecondary} />
                <Text style={[s.dropText, { color: theme.text }]} numberOfLines={1}>{statusLabel}</Text>
                <Ionicons name="chevron-down" size={15} color={theme.textMuted} />
              </Pressable>
              <Pressable onPress={() => { Haptics.selectionAsync(); setDateOpen(true); }} style={[s.drop, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={15} color={theme.textSecondary} />
                <Text style={[s.dropText, { color: theme.text }]} numberOfLines={1}>{dateLabel}</Text>
                <Ionicons name="chevron-down" size={15} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* insights over the filtered set */}
            {rows.length >= 2 && (
              <View style={[s.insights, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[s.insTitle, { color: theme.text }]}>{t('history.insights', { defaultValue: 'Insights' })}</Text>
                <Text style={[s.insLead, { color: theme.textSecondary }]}>
                  {t('history.lead', {
                    runs: insights.runs, completed: insights.completedRuns, sessions: insights.totalDone, pct: pct(insights.avgCompletion),
                    defaultValue: `You started ${insights.runs} programs and finished ${insights.completedRuns}. You completed ${pct(insights.avgCompletion)} of the planned sessions on average, training ${insights.totalDone} sessions.`,
                  })}
                </Text>

                <View style={s.insTiles}>
                  {[
                    { v: `${insights.completedRuns}/${insights.runs}`, l: t('history.finished', { defaultValue: 'Finished' }), c: Colors.electric },
                    { v: pct(insights.avgCompletion), l: t('history.avgCompletion', { defaultValue: 'Avg completed' }), c: bandColor(insights.avgCompletion) },
                    { v: String(insights.totalDone), l: t('history.sessionsDone', { defaultValue: 'Sessions done' }), c: theme.text },
                  ].map((tl, i) => (
                    <View key={i} style={[s.insTile, { backgroundColor: theme.cardAlt }]}>
                      <Text style={[s.insTileVal, { color: tl.c }]}>{tl.v}</Text>
                      <Text style={[s.insTileLabel, { color: theme.textMuted }]} numberOfLines={2}>{tl.l}</Text>
                    </View>
                  ))}
                </View>

                {/* average completion by month */}
                {insights.byMonth.length >= 2 && (() => {
                  const maxMonth = Math.max(...insights.byMonth.map((m) => m.avgCompletion), 0.001);
                  return (
                    <>
                      <Text style={[s.insSection, { color: theme.textSecondary }]}>{t('history.byMonth', { defaultValue: 'Average completion by month' })}</Text>
                      <View style={s.monthRow}>
                        {insights.byMonth.slice(-8).map((m) => {
                          const h = 14 + (m.avgCompletion / maxMonth) * 60;
                          const strong = insights.strongest?.key === m.key;
                          const weak = insights.weakest?.key === m.key && insights.strongest?.key !== m.key;
                          return (
                            <View key={m.key} style={s.monthCol}>
                              <Text style={[s.monthVal, { color: theme.textMuted }]}>{pct(m.avgCompletion)}</Text>
                              <View style={[s.monthBar, { height: h, backgroundColor: strong ? Colors.electric : weak ? Colors.semantic.warn : theme.textSecondary }]} />
                              <Text style={[s.monthLabel, { color: theme.textMuted }]} numberOfLines={1}>{m.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}

                {/* plain-language diagnostics */}
                <View style={s.diagWrap}>
                  {insights.bestProgram && insights.bestProgram.runs >= 2 && (
                    <Diag icon="ribbon" color={Colors.electric} theme={theme}
                      text={t('history.bestProgram', { name: insights.bestProgram.name, pct: pct(insights.bestProgram.avgCompletion), defaultValue: `You stick with "${insights.bestProgram.name}" most — ${pct(insights.bestProgram.avgCompletion)} completed on average.` })} />
                  )}
                  {insights.strongest && insights.weakest && insights.strongest.key !== insights.weakest.key && (
                    <>
                      <Diag icon="trending-up" color={Colors.electric} theme={theme}
                        text={t('history.strongest', { month: insights.strongest.label, pct: pct(insights.strongest.avgCompletion), defaultValue: `Best month: ${insights.strongest.label} (${pct(insights.strongest.avgCompletion)} completed).` })} />
                      <Diag icon="trending-down" color={Colors.semantic.warn} theme={theme}
                        text={t('history.weakest', { month: insights.weakest.label, pct: pct(insights.weakest.avgCompletion), defaultValue: `Toughest month: ${insights.weakest.label} (${pct(insights.weakest.avgCompletion)} completed).` })} />
                    </>
                  )}
                </View>
              </View>
            )}

            {/* result list */}
            {rows.length === 0 ? (
              <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 32 }]}>
                {t('history.noneInFilter', { defaultValue: 'No programs match these filters.' })}
              </Text>
            ) : rows.map(({ e, program, r }) => {
              const col = bandColor(r.completionRate);
              const statusC = e.status === 'finished' ? Colors.electric : Colors.semantic.warn;
              const sLabel = e.status === 'finished' ? t('report.completed', { defaultValue: 'Completed' }) : t('report.endedEarly', { defaultValue: 'Ended early' });
              return (
                <Pressable
                  key={e.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-report/${e.id}` as any); }}
                  style={({ pressed }) => [s.row, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[s.pctCircle, { borderColor: col }]}>
                    <Text style={[s.pctVal, { color: col }]}>{Math.round(r.completionRate * 100)}</Text>
                    <Text style={[s.pctSign, { color: col }]}>%</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
                    <Text style={[s.sub, { color: theme.textMuted }]} numberOfLines={1}>{fmt(r.startDate)} – {fmt(r.endDate)}</Text>
                    <View style={s.metaRow}>
                      <View style={[s.statusPill, { backgroundColor: statusC + '22' }]}>
                        <Text style={[s.statusText, { color: statusC }]}>{sLabel}</Text>
                      </View>
                      <Text style={[s.metaVal, { color: theme.textSecondary }]}>{t('history.sessionsOf', { done: r.done + r.substituted, total: r.plannedSessions, defaultValue: `${r.done + r.substituted}/${r.plannedSessions} sessions` })}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* status dropdown */}
      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setStatusOpen(false)}>
          <Pressable style={[s.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle}><View style={[s.sheetBar, { backgroundColor: theme.border }]} /></View>
            <Text style={[s.sheetTitle, { color: theme.text }]}>{t('history.statusFilter', { defaultValue: 'Status' })}</Text>
            {([['all', t('history.fAll', { defaultValue: 'All programs' })], ['finished', t('history.fCompleted', { defaultValue: 'Completed' })], ['abandoned', t('history.fEnded', { defaultValue: 'Ended early' })]] as [StatusFilter, string][]).map(([k, label]) => (
              <Pressable key={k} onPress={() => { Haptics.selectionAsync(); setStatus(k); setStatusOpen(false); }} style={({ pressed }) => [s.optRow, { backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
                <Text style={[s.optText, { color: theme.text }]}>{label}</Text>
                {status === k && <Ionicons name="checkmark" size={18} color={Colors.electric} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* date-range dropdown */}
      <Modal visible={dateOpen} transparent animationType="fade" onRequestClose={() => setDateOpen(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setDateOpen(false)}>
          <Pressable style={[s.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle}><View style={[s.sheetBar, { backgroundColor: theme.border }]} /></View>
            <Text style={[s.sheetTitle, { color: theme.text }]}>{t('history.dateFilter', { defaultValue: 'Date range' })}</Text>
            <View style={s.presetRow}>
              {([[30, t('history.pMonth', { defaultValue: 'Last month' })], [90, t('history.p3Months', { defaultValue: 'Last 3 months' })], [365, t('history.pYear', { defaultValue: 'Last year' })]] as [number, string][]).map(([d, l]) => (
                <Pressable key={d} onPress={() => { Haptics.selectionAsync(); setPreset(d); }} style={[s.preset, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[s.presetText, { color: theme.textSecondary }]} numberOfLines={1}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <DateTimeField label={t('history.from', { defaultValue: 'From' })} value={from} onChange={setFrom} theme={theme} optional dateOnly maxDate={to ? new Date(to) : new Date()} />
            <View style={{ height: 10 }} />
            <DateTimeField label={t('history.to', { defaultValue: 'To' })} value={to} onChange={setTo} theme={theme} optional dateOnly minDate={from ? new Date(from) : undefined} maxDate={new Date()} />
            <View style={s.sheetActions}>
              <Pressable onPress={() => { setFrom(null); setTo(null); }} style={[s.sheetBtnGhost, { borderColor: theme.border }]}>
                <Text style={[s.sheetBtnGhostText, { color: theme.textSecondary }]}>{t('history.clear', { defaultValue: 'Clear' })}</Text>
              </Pressable>
              <Pressable onPress={() => setDateOpen(false)} style={[s.sheetBtn, { backgroundColor: Colors.electric }]}>
                <Text style={s.sheetBtnText}>{t('history.apply', { defaultValue: 'Apply' })}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Diag({ icon, color, text, theme }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string; theme: any }) {
  return (
    <View style={s.diagRow}>
      <View style={[s.diagIcon, { backgroundColor: color + '22' }]}><Ionicons name={icon} size={15} color={color} /></View>
      <Text style={[s.diagText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: Fonts.semibold },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },

  dropRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  drop: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  dropText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.semibold },

  insights: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  insTitle: { fontSize: 16, fontFamily: Fonts.semibold, marginBottom: 6 },
  insLead: { fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 20, marginBottom: 14 },
  insTiles: { flexDirection: 'row', gap: 10 },
  insTile: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  insTileVal: { fontSize: 19, fontFamily: Fonts.bold },
  insTileLabel: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 3, textAlign: 'center' },
  insSection: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 18, marginBottom: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 6 },
  monthCol: { flex: 1, alignItems: 'center', gap: 4 },
  monthVal: { fontSize: 10, fontFamily: Fonts.medium },
  monthBar: { width: '64%', borderRadius: 5, minHeight: 14 },
  monthLabel: { fontSize: 10, fontFamily: Fonts.regular },
  diagWrap: { marginTop: 16, gap: 12 },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diagIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diagText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 19 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  pctCircle: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  pctVal: { fontSize: 15, fontFamily: Fonts.bold },
  pctSign: { fontSize: 9, fontFamily: Fonts.bold, marginTop: 3 },
  name: { fontSize: 15.5, fontFamily: Fonts.semibold },
  sub: { fontSize: 12.5, fontFamily: Fonts.regular, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaVal: { fontSize: 12.5, fontFamily: Fonts.medium },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
  sheetHandle: { alignItems: 'center', marginBottom: 8 },
  sheetBar: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 16, fontFamily: Fonts.semibold, marginBottom: 10 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10 },
  optText: { fontSize: 15, fontFamily: Fonts.medium },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  presetText: { fontSize: 13, fontFamily: Fonts.semibold },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sheetBtnGhost: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  sheetBtnGhostText: { fontSize: 14, fontFamily: Fonts.semibold },
  sheetBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
  sheetBtnText: { fontSize: 14, fontFamily: Fonts.semibold, color: '#04120B' },
});
