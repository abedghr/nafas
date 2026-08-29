// All finished / ended programs across the account, newest first, with status
// and date-range filters and an insights panel over the filtered set. Each row
// opens that run's full report. (Per-program day history lives at ./[id].)
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';
import { buildReport, aggregateReports, gradeOf, type ProgramReport } from '@/lib/program-report';

type StatusFilter = 'all' | 'finished' | 'abandoned';
type RangeFilter = 'all' | '30' | '90' | '365';

const bandColor = (rate: number) => (rate >= 0.75 ? Colors.electric : rate >= 0.4 ? Colors.semantic.warn : Colors.semantic.danger);

export default function EndedProgramsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { programs, enrollments, workoutLogs, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [range, setRange] = useState<RangeFilter>('all');

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
    const now = Date.now();
    const cutoff = range === 'all' ? 0 : now - Number(range) * 86400000;
    return allRows
      .filter((x) => (status === 'all' ? true : x.e.status === status))
      .filter((x) => (range === 'all' ? true : new Date(x.r.endDate).getTime() >= cutoff))
      .sort((a, b) => new Date(b.r.endDate).getTime() - new Date(a.r.endDate).getTime());
  }, [allRows, status, range]);

  const insights = useMemo(() => aggregateReports(rows.map((x) => x.r)), [rows]);

  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('history.fAll', { defaultValue: 'All' }) },
    { key: 'finished', label: t('history.fCompleted', { defaultValue: 'Completed' }) },
    { key: 'abandoned', label: t('history.fEnded', { defaultValue: 'Ended early' }) },
  ];
  const rangeFilters: { key: RangeFilter; label: string }[] = [
    { key: 'all', label: t('history.rAll', { defaultValue: 'All time' }) },
    { key: '30', label: t('history.r30', { defaultValue: '30d' }) },
    { key: '90', label: t('history.r90', { defaultValue: '90d' }) },
    { key: '365', label: t('history.r365', { defaultValue: '1y' }) },
  ];

  const Pill = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={() => { Haptics.selectionAsync(); onPress(); }} style={[s.pill, { backgroundColor: on ? Colors.electric : theme.card, borderColor: on ? Colors.electric : theme.border }]}>
      <Text style={[s.pillText, { color: on ? '#03110D' : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );

  const maxMonth = Math.max(...insights.byMonth.map((m) => m.avgCompletion), 0.001);

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
            {/* filters */}
            <View style={s.filterGroup}>
              <View style={s.filterRow}>{statusFilters.map((f) => <Pill key={f.key} on={status === f.key} label={f.label} onPress={() => setStatus(f.key)} />)}</View>
              <View style={s.filterRow}>{rangeFilters.map((f) => <Pill key={f.key} on={range === f.key} label={f.label} onPress={() => setRange(f.key)} />)}</View>
            </View>

            {/* insights over the filtered set */}
            {rows.length >= 2 && (
              <View style={[s.insights, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[s.insTitle, { color: theme.text }]}>{t('history.insights', { defaultValue: 'Insights' })}</Text>

                <View style={s.insTiles}>
                  {[
                    { v: String(insights.runs), l: t('history.runs', { defaultValue: 'Runs' }) },
                    { v: pct(insights.avgCompletion), l: t('history.avgCompletion', { defaultValue: 'Avg completion' }) },
                    { v: String(insights.totalDone), l: t('history.sessionsDone', { defaultValue: 'Sessions' }) },
                  ].map((tl, i) => (
                    <View key={i} style={[s.insTile, { backgroundColor: theme.cardAlt }]}>
                      <Text style={[s.insTileVal, { color: theme.text }]}>{tl.v}</Text>
                      <Text style={[s.insTileLabel, { color: theme.textMuted }]} numberOfLines={1}>{tl.l}</Text>
                    </View>
                  ))}
                </View>

                {/* completion by month */}
                {insights.byMonth.length >= 2 && (
                  <>
                    <Text style={[s.insSection, { color: theme.textSecondary }]}>{t('history.byMonth', { defaultValue: 'Completion by month' })}</Text>
                    <View style={s.monthRow}>
                      {insights.byMonth.slice(-8).map((m) => {
                        const h = 14 + (m.avgCompletion / maxMonth) * 64;
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
                )}

                {/* diagnostics */}
                <View style={s.diagWrap}>
                  {insights.bestProgram && (
                    <View style={s.diagRow}>
                      <View style={[s.diagIcon, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="ribbon" size={15} color={Colors.electric} /></View>
                      <Text style={[s.diagText, { color: theme.textSecondary }]}>
                        {t('history.bestProgram', { name: insights.bestProgram.name, pct: pct(insights.bestProgram.avgCompletion), defaultValue: `Your best fit: ${insights.bestProgram.name} (${pct(insights.bestProgram.avgCompletion)} avg)` })}
                      </Text>
                    </View>
                  )}
                  {insights.strongest && insights.weakest && insights.strongest.key !== insights.weakest.key && (
                    <>
                      <View style={s.diagRow}>
                        <View style={[s.diagIcon, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="trending-up" size={15} color={Colors.electric} /></View>
                        <Text style={[s.diagText, { color: theme.textSecondary }]}>
                          {t('history.strongest', { month: insights.strongest.label, pct: pct(insights.strongest.avgCompletion), defaultValue: `Strongest in ${insights.strongest.label} (${pct(insights.strongest.avgCompletion)})` })}
                        </Text>
                      </View>
                      <View style={s.diagRow}>
                        <View style={[s.diagIcon, { backgroundColor: Colors.semantic.warn + '22' }]}><Ionicons name="trending-down" size={15} color={Colors.semantic.warn} /></View>
                        <Text style={[s.diagText, { color: theme.textSecondary }]}>
                          {t('history.weakest', { month: insights.weakest.label, pct: pct(insights.weakest.avgCompletion), defaultValue: `Dropped off in ${insights.weakest.label} (${pct(insights.weakest.avgCompletion)})` })}
                        </Text>
                      </View>
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
              const statusColor = e.status === 'finished' ? Colors.electric : Colors.semantic.warn;
              const statusLabel = e.status === 'finished' ? t('report.completed', { defaultValue: 'Completed' }) : t('report.endedEarly', { defaultValue: 'Ended early' });
              return (
                <Pressable
                  key={e.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-report/${e.id}` as any); }}
                  style={({ pressed }) => [s.row, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[s.gradeCircle, { borderColor: statusColor }]}>
                    <Text style={[s.gradeText, { color: statusColor }]}>{gradeOf(r.completionRate)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
                    <Text style={[s.sub, { color: theme.textMuted }]} numberOfLines={1}>{fmt(r.startDate)} – {fmt(r.endDate)}</Text>
                    <View style={s.metaRow}>
                      <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      <Text style={[s.metaVal, { color: theme.textSecondary }]}>{pct(r.completionRate)} · {r.done + r.substituted}/{r.plannedSessions}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: Fonts.semibold },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },

  filterGroup: { gap: 8, marginBottom: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontFamily: Fonts.semibold },

  insights: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  insTitle: { fontSize: 16, fontFamily: Fonts.semibold, marginBottom: 12 },
  insTiles: { flexDirection: 'row', gap: 10 },
  insTile: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  insTileVal: { fontSize: 20, fontFamily: Fonts.bold },
  insTileLabel: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 2 },
  insSection: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 16, marginBottom: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 104, gap: 6 },
  monthCol: { flex: 1, alignItems: 'center', gap: 4 },
  monthVal: { fontSize: 10, fontFamily: Fonts.medium },
  monthBar: { width: '64%', borderRadius: 5, minHeight: 14 },
  monthLabel: { fontSize: 10, fontFamily: Fonts.regular },
  diagWrap: { marginTop: 16, gap: 10 },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diagIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diagText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 19 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  gradeCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 16, fontFamily: Fonts.bold },
  name: { fontSize: 15.5, fontFamily: Fonts.semibold },
  sub: { fontSize: 12.5, fontFamily: Fonts.regular, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaVal: { fontSize: 12.5, fontFamily: Fonts.medium },
});
