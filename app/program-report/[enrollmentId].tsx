// End-of-program report — the journey recap shown when a program finishes
// (auto: all days decided; or manual end). Stats are derived live from the
// enrollment's completions (lib/program-report.ts); the AI narrative, once
// generated, is cached on enrollment.endReport.
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';
import { buildReport, compareRuns, reportContext, gradeOf, type ProgramReport, type DayAgg } from '@/lib/program-report';
import { workoutApi } from '@/src/features/workout/api';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProgramReportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const { programs, enrollments, workoutLogs, isDark, language, refreshEnrollments } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const enr = enrollments.find((e) => e.id === enrollmentId);
  const program = enr ? programs.find((p: any) => p.id === enr.programId) : undefined;

  const report = useMemo<ProgramReport | null>(
    () => (enr && program ? buildReport(enr, program, workoutLogs) : null),
    [enr, program, workoutLogs]
  );

  // other finished runs of the same program, for comparison
  const comparison = useMemo(() => {
    if (!report || !program) return null;
    const others = enrollments
      .filter((e) => e.programId === program.id && e.id !== enr!.id && e.status !== 'active')
      .map((e) => buildReport(e, program, workoutLogs));
    return compareRuns(report, others);
  }, [report, program, enrollments, workoutLogs, enr]);

  const genReport = async () => {
    if (!report || !enr) return;
    setAiLoading(true); setAiError(null);
    try {
      await workoutApi.generateReport(enr.id, reportContext(report, comparison, language));
      refreshEnrollments(); // pulls the enrollment back with endReport populated
    } catch (e: any) {
      const msg = String(e?.message || '');
      setAiError(/501|AI_UNAVAILABLE|not configured/i.test(msg)
        ? t('report.aiUnavailable', { defaultValue: 'AI analysis is not available yet.' })
        : t('report.aiError', { defaultValue: 'Could not generate the analysis. Try again.' }));
    } finally { setAiLoading(false); }
  };

  // auto-generate the AI analysis once for an ENDED run that has none yet.
  // (active/preview runs keep the manual button — don't burn a call on a partial journey.)
  const autoTriedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enr || !report) return;
    const ended = enr.status !== 'active';
    if (ended && !enr.endReport && !aiLoading && autoTriedRef.current !== enr.id) {
      autoTriedRef.current = enr.id;
      genReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enr?.id, enr?.status, enr?.endReport, report]);

  // outcome → colour
  const aggColor = (a: DayAgg): string => {
    switch (a) {
      case 'done': return Colors.electric;
      case 'substituted': return Colors.accent;
      case 'skipped': return Colors.semantic.danger;
      case 'partial': return Colors.semantic.warn;
      case 'rest': return theme.textSecondary;
      default: return theme.border; // pending
    }
  };
  const aggIcon = (a: DayAgg): keyof typeof Ionicons.glyphMap => {
    switch (a) {
      case 'done': return 'checkmark';
      case 'substituted': return 'swap-horizontal';
      case 'skipped': return 'close';
      case 'partial': return 'ellipsis-horizontal';
      case 'rest': return 'moon';
      default: return 'ellipse-outline';
    }
  };

  const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  if (!enr || !program || !report) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad + 8 }]}>
          <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('report.title', { defaultValue: 'Program report' })}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 48 }]}>
          {t('report.notFound', { defaultValue: 'This program run could not be found.' })}
        </Text>
      </View>
    );
  }

  const r = report;
  const grade = gradeOf(r.completionRate);
  // completion ring geometry
  const R = 54, SW = 12, C = 2 * Math.PI * R;
  const ringOffset = C * (1 - r.completionRate);
  const statusLabel = r.status === 'finished'
    ? t('report.completed', { defaultValue: 'Completed' })
    : r.status === 'abandoned'
      ? t('report.endedEarly', { defaultValue: 'Ended early' })
      : t('report.active', { defaultValue: 'Active' });
  const statusColor = r.status === 'finished' ? Colors.electric : r.status === 'abandoned' ? Colors.semantic.warn : theme.textSecondary;

  const multiWeek = r.byWeek.length > 1;

  const stat = (label: string, value: string, color: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={[s.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[s.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[s.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: theme.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{t('report.title', { defaultValue: 'Program report' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* ── hero ─────────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={[s.progName, { color: theme.text }]} numberOfLines={2}>{program.name}</Text>
          <Text style={[s.dateRange, { color: theme.textMuted }]}>
            {fmtDate(r.startDate)} – {fmtDate(r.endDate)}  ·  {t('report.nDays', { n: r.durationDays, defaultValue: `${r.durationDays} days` })}
          </Text>

          <View style={s.ringWrap}>
            <Svg width={(R + SW) * 2} height={(R + SW) * 2}>
              <Circle cx={R + SW} cy={R + SW} r={R} stroke={theme.border} strokeWidth={SW} fill="none" />
              <Circle
                cx={R + SW} cy={R + SW} r={R} stroke={Colors.electric} strokeWidth={SW} fill="none"
                strokeDasharray={C} strokeDashoffset={ringOffset} strokeLinecap="round"
                transform={`rotate(-90 ${R + SW} ${R + SW})`}
              />
            </Svg>
            <View style={s.ringCenter}>
              <Text style={[s.ringPct, { color: theme.text }]}>{pct(r.completionRate)}</Text>
              <Text style={[s.ringLabel, { color: theme.textMuted }]}>{t('report.complete', { defaultValue: 'complete' })}</Text>
            </View>
            <View style={[s.gradeBadge, { backgroundColor: Colors.electric }]}>
              <Text style={s.gradeText}>{grade}</Text>
            </View>
          </View>

          <Text style={[s.heroSub, { color: theme.textSecondary }]}>
            {t('report.doneOfPlanned', { done: r.done + r.substituted, total: r.plannedSessions, defaultValue: `${r.done + r.substituted} of ${r.plannedSessions} sessions trained` })}
          </Text>
        </View>

        {/* ── stat grid ────────────────────────────────────── */}
        <View style={s.grid}>
          {stat(t('report.done', { defaultValue: 'Done' }), String(r.done), Colors.electric, 'checkmark-circle')}
          {stat(t('report.substituted', { defaultValue: 'Swapped' }), String(r.substituted), Colors.accent, 'swap-horizontal')}
          {stat(t('report.skipped', { defaultValue: 'Skipped' }), String(r.skipped), Colors.semantic.danger, 'close-circle')}
          {stat(t('report.rest', { defaultValue: 'Rest' }), String(r.rest), theme.textSecondary, 'moon')}
          {stat(t('report.streak', { defaultValue: 'Best streak' }), String(r.longestStreak), Colors.accent, 'flame')}
          {stat(t('report.onTime', { defaultValue: 'On time' }), pct(r.onTimeRate), Colors.semantic.info, 'time')}
          {stat(t('report.volume', { defaultValue: 'Volume' }), `${(r.totalVolumeKg / 1000).toFixed(1)}t`, Colors.electric, 'barbell')}
          {stat(t('report.minutes', { defaultValue: 'Minutes' }), String(r.totalMinutes), Colors.semantic.info, 'stopwatch')}
        </View>

        {/* ── weekly performance ───────────────────────────── */}
        {multiWeek && (
          <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.sectionTitle, { color: theme.text }]}>{t('report.weekly', { defaultValue: 'Week by week' })}</Text>
            {r.byWeek.map((w) => {
              const isPeak = r.activePeak?.week === w.week && w.rate > 0;
              const isWeak = r.weakSpot?.week === w.week && r.activePeak?.week !== w.week;
              const barColor = isPeak ? Colors.electric : isWeak ? Colors.semantic.warn : theme.textSecondary;
              return (
                <View key={w.week} style={s.barRow}>
                  <Text style={[s.barLabel, { color: theme.textMuted }]}>{t('report.wk', { n: w.week + 1, defaultValue: `W${w.week + 1}` })}</Text>
                  <View style={[s.barTrack, { backgroundColor: theme.cardAlt }]}>
                    <View style={[s.barFill, { width: `${Math.max(4, w.rate * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[s.barVal, { color: theme.textSecondary }]}>{pct(w.rate)}</Text>
                </View>
              );
            })}
            {r.activePeak && r.weakSpot && r.activePeak.week !== r.weakSpot.week && (
              <Text style={[s.caption, { color: theme.textMuted }]}>
                {t('report.peakWeak', { peak: r.activePeak.week + 1, weak: r.weakSpot.week + 1, defaultValue: `Strongest in week ${r.activePeak.week + 1}, weakest in week ${r.weakSpot.week + 1}.` })}
              </Text>
            )}
          </View>
        )}

        {/* ── weekday pattern ──────────────────────────────── */}
        {r.byWeekday.some((d) => d.planned > 0) && (() => {
          const maxRate = Math.max(...r.byWeekday.map((d) => (d.planned ? d.done / d.planned : 0)), 0.001);
          const best = [...r.byWeekday].filter((d) => d.planned > 0).sort((a, b) => (b.done / b.planned) - (a.done / a.planned))[0];
          return (
            <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('report.byWeekday', { defaultValue: 'When you showed up' })}</Text>
              <View style={s.wdRow}>
                {r.byWeekday.filter((d) => d.planned > 0).map((d) => {
                  const rate = d.planned ? d.done / d.planned : 0;
                  const h = 12 + (rate / maxRate) * 56;
                  return (
                    <View key={d.weekday} style={s.wdCol}>
                      <View style={[s.wdBar, { height: h, backgroundColor: rate >= 0.5 ? Colors.electric : Colors.semantic.warn }]} />
                      <Text style={[s.wdLabel, { color: theme.textMuted }]}>{WD[d.weekday][0]}</Text>
                    </View>
                  );
                })}
              </View>
              {best && (
                <Text style={[s.caption, { color: theme.textMuted }]}>
                  {t('report.bestWeekday', { day: WD[best.weekday], defaultValue: `Most consistent on ${WD[best.weekday]}.` })}
                </Text>
              )}
            </View>
          );
        })()}

        {/* ── comparison vs prior runs ─────────────────────── */}
        {comparison && comparison.previous && (
          <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.cmpHead}>
              <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 0 }]}>{t('report.vsLast', { defaultValue: 'vs your last run' })}</Text>
              <View style={[s.rankPill, { backgroundColor: Colors.electric + '22' }]}>
                <Ionicons name="trophy" size={12} color={Colors.electric} />
                <Text style={[s.rankText, { color: Colors.electric }]}>{t('report.rank', { n: comparison.rankByCompletion, total: comparison.totalRuns, defaultValue: `#${comparison.rankByCompletion} of ${comparison.totalRuns}` })}</Text>
              </View>
            </View>
            {[
              { label: t('report.completion', { defaultValue: 'Completion' }), d: comparison.deltaCompletion, fmt: (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%` },
              { label: t('report.adherence', { defaultValue: 'Adherence' }), d: comparison.deltaAdherence, fmt: (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%` },
              { label: t('report.volume', { defaultValue: 'Volume' }), d: comparison.deltaVolume, fmt: (x: number) => `${x > 0 ? '+' : ''}${Math.round(x)} kg` },
            ].map((row) => row.d != null && (
              <View key={row.label} style={s.cmpRow}>
                <Text style={[s.cmpLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                <View style={s.cmpDelta}>
                  <Ionicons name={row.d >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={row.d >= 0 ? Colors.electric : Colors.semantic.danger} />
                  <Text style={[s.cmpVal, { color: row.d >= 0 ? Colors.electric : Colors.semantic.danger }]}>{row.fmt(row.d)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── AI insights (generated in Phase 3) ───────────── */}
        <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={s.cmpHead}>
            <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 0 }]}>{t('report.aiTitle', { defaultValue: 'AI analysis' })}</Text>
            <Ionicons name="sparkles" size={16} color={Colors.accent} />
          </View>
          {enr.endReport ? (
            <>
              <Text style={[s.aiSummary, { color: theme.textSecondary }]}>{enr.endReport.summary}</Text>
              {enr.endReport.highlights?.map((h, i) => (
                <View key={`h${i}`} style={s.aiRow}><Ionicons name="checkmark-circle" size={15} color={Colors.electric} /><Text style={[s.aiText, { color: theme.text }]}>{h}</Text></View>
              ))}
              {enr.endReport.suggestions?.map((h, i) => (
                <View key={`s${i}`} style={s.aiRow}><Ionicons name="arrow-forward-circle" size={15} color={Colors.accent} /><Text style={[s.aiText, { color: theme.text }]}>{h}</Text></View>
              ))}
            </>
          ) : (
            <>
              <Text style={[s.aiSummary, { color: theme.textMuted }]}>
                {t('report.aiPending', { defaultValue: 'A personalised analysis of your journey will appear here.' })}
              </Text>
              {aiError && <Text style={[s.aiSummary, { color: Colors.semantic.danger, marginTop: 8 }]}>{aiError}</Text>}
              <Pressable
                onPress={() => { if (!aiLoading) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); genReport(); } }}
                disabled={aiLoading}
                style={({ pressed }) => [s.aiBtn, { backgroundColor: Colors.accent, opacity: aiLoading ? 0.7 : pressed ? 0.9 : 1 }]}
              >
                {aiLoading ? <ActivityIndicator size="small" color="#04120B" /> : <Ionicons name="sparkles" size={16} color="#04120B" />}
                <Text style={s.aiBtnText}>{aiLoading ? t('report.aiGenerating', { defaultValue: 'Analysing your journey…' }) : t('report.aiGenerate', { defaultValue: 'Generate AI analysis' })}</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── journey timeline ─────────────────────────────── */}
        <Text style={[s.timelineHead, { color: theme.text }]}>{t('report.journey', { defaultValue: 'Your journey' })}</Text>
        <View style={s.timeline}>
          {r.journey.map((jd, i) => {
            const col = aggColor(jd.agg);
            const last = i === r.journey.length - 1;
            const title = jd.restDay ? t('programs.restDay', { defaultValue: 'Rest day' }) : (jd.name || t('report.workout', { defaultValue: 'Workout' }));
            return (
              <View key={jd.ordinal} style={s.tlRow}>
                <View style={s.tlGutter}>
                  <View style={[s.tlDot, { backgroundColor: col, borderColor: theme.background }]}>
                    <Ionicons name={aggIcon(jd.agg)} size={11} color={theme.background} />
                  </View>
                  {!last && <View style={[s.tlLine, { backgroundColor: theme.border }]} />}
                </View>
                <View style={[s.tlCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={s.tlTop}>
                    <Text style={[s.tlDay, { color: theme.textMuted }]}>{t('programs.dayN', { n: jd.ordinal + 1, defaultValue: `Day ${jd.ordinal + 1}` })}</Text>
                    <Text style={[s.tlDate, { color: theme.textMuted }]}>{fmtDate(jd.scheduledDate)}</Text>
                  </View>
                  <Text style={[s.tlTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                  {jd.sessions.length > 1 ? (
                    <View style={s.tlSessions}>
                      {jd.sessions.map((se) => {
                        const sc = aggColor(se.outcome as DayAgg);
                        return (
                          <View key={se.index} style={[s.sessChip, { backgroundColor: sc + '1F' }]}>
                            <View style={[s.sessDot, { backgroundColor: sc }]} />
                            <Text style={[s.sessName, { color: theme.textSecondary }]} numberOfLines={1}>{se.name}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : !jd.restDay ? (
                    <Text style={[s.tlOutcome, { color: col }]}>{t(`report.outcome_${jd.agg}`, { defaultValue: jd.agg })}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace('/programs' as any); }}
          style={({ pressed }) => [s.doneBtn, { backgroundColor: Colors.electric, opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={s.doneBtnText}>{t('report.backToPrograms', { defaultValue: 'Back to programs' })}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: Fonts.semibold },

  hero: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  progName: { fontSize: 22, fontFamily: Fonts.bold, textAlign: 'center', marginTop: 10 },
  dateRange: { fontSize: 13, fontFamily: Fonts.regular, marginTop: 4 },
  ringWrap: { marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 34, fontFamily: Fonts.bold },
  ringLabel: { fontSize: 12, fontFamily: Fonts.regular, marginTop: -2 },
  gradeBadge: { position: 'absolute', bottom: -2, right: '50%', marginRight: -58, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 16, fontFamily: Fonts.bold, color: '#04120B' },
  heroSub: { fontSize: 14, fontFamily: Fonts.medium, marginTop: 14, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: '47.5%', borderRadius: 16, borderWidth: 1, padding: 14, flexGrow: 1 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontFamily: Fonts.bold },
  statLabel: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },

  section: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 14 },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.semibold, marginBottom: 12 },
  caption: { fontSize: 12.5, fontFamily: Fonts.regular, marginTop: 10, lineHeight: 18 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  barLabel: { width: 30, fontSize: 12, fontFamily: Fonts.medium },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barVal: { width: 40, textAlign: 'right', fontSize: 12, fontFamily: Fonts.medium },

  wdRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 78, gap: 6 },
  wdCol: { flex: 1, alignItems: 'center', gap: 6 },
  wdBar: { width: '70%', borderRadius: 5, minHeight: 12 },
  wdLabel: { fontSize: 11, fontFamily: Fonts.medium },

  cmpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  rankText: { fontSize: 12, fontFamily: Fonts.semibold },
  cmpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  cmpLabel: { fontSize: 14, fontFamily: Fonts.regular },
  cmpDelta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cmpVal: { fontSize: 14, fontFamily: Fonts.semibold },

  aiSummary: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  aiText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 19 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderRadius: 12, paddingVertical: 13 },
  aiBtnText: { fontSize: 14, fontFamily: Fonts.semibold, color: '#04120B' },

  timelineHead: { fontSize: 18, fontFamily: Fonts.bold, marginTop: 22, marginBottom: 12 },
  timeline: {},
  tlRow: { flexDirection: 'row', gap: 12 },
  tlGutter: { alignItems: 'center', width: 24 },
  tlDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  tlLine: { width: 2, flex: 1, marginVertical: 2 },
  tlCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  tlTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tlDay: { fontSize: 11.5, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  tlDate: { fontSize: 12, fontFamily: Fonts.regular },
  tlTitle: { fontSize: 15, fontFamily: Fonts.semibold, marginTop: 3 },
  tlOutcome: { fontSize: 12.5, fontFamily: Fonts.medium, marginTop: 4, textTransform: 'capitalize' },
  tlSessions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sessChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, maxWidth: '100%' },
  sessDot: { width: 6, height: 6, borderRadius: 3 },
  sessName: { fontSize: 12, fontFamily: Fonts.medium, flexShrink: 1 },

  doneBtn: { marginTop: 24, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { fontSize: 15, fontFamily: Fonts.semibold, color: '#04120B' },
});
