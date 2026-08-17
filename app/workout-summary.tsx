import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, WorkoutLog, LogExercise, templateSig } from '@/lib/app-context';
import { toDisplayWeight, unitLabel, type WeightUnit } from '@/lib/units';
import Colors from '@/constants/colors';
import { Display, StatTile, CountUp, Button } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import { Spring } from '@/constants/motion';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const d = new Date(timeStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatVolume(kg: number, unit: WeightUnit): string {
  const v = toDisplayWeight(kg, unit);
  if (v >= 1000) return v.toLocaleString('en-US') + ' ' + unitLabel(unit);
  return v + ' ' + unitLabel(unit);
}

function getExerciseBestSet(exercise: LogExercise): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const set of exercise.sets) {
    if (set.status === 'done' && set.actual?.weight && set.actual?.reps) {
      if (!best || set.actual.weight > best.weight) {
        best = { weight: set.actual.weight, reps: set.actual.reps };
      }
    }
  }
  return best;
}

export default function WorkoutSummaryScreen() {
  const { t } = useTranslation();
  const { logId, newPrs: newPrsParam } = useLocalSearchParams<{ logId: string; newPrs?: string }>();
  const { workoutLogs, workoutTemplates, addWorkoutTemplate, user, isDark, weightUnit } = useApp();

  // new PRs detected at finish time (passed by live-workout)
  const newPrs = useMemo<{ name: string; weight: number; reps: number; prev: number }[]>(() => {
    try { return newPrsParam ? JSON.parse(String(newPrsParam)) : []; } catch { return []; }
  }, [newPrsParam]);
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const currentLog = useMemo(() => {
    return workoutLogs.find((l) => l.id === logId) || null;
  }, [workoutLogs, logId]);

  const previousLog = useMemo(() => {
    if (!currentLog) return null;
    const sameName = workoutLogs
      .filter((l) => l.name === currentLog.name && l.id !== currentLog.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sameName.length > 0 ? sameName[0] : null;
  }, [workoutLogs, currentLog]);

  const comparison = useMemo(() => {
    if (!currentLog || !previousLog) return null;
    const volumeDiff = currentLog.totalVolumeKg - previousLog.totalVolumeKg;
    const volumePct = previousLog.totalVolumeKg > 0
      ? ((volumeDiff / previousLog.totalVolumeKg) * 100).toFixed(1)
      : '0';
    const durationDiff = currentLog.durationMinutes - previousLog.durationMinutes;
    const setsDiff = currentLog.completedSets - previousLog.completedSets;
    return { volumeDiff, volumePct, durationDiff, setsDiff };
  }, [currentLog, previousLog]);

  const exerciseComparison = useMemo(() => {
    if (!currentLog || !previousLog) return [];
    return currentLog.exercises.map((ex) => {
      const prevEx = previousLog.exercises.find((p) => p.name === ex.name);
      const todayBest = getExerciseBestSet(ex);
      const prevBest = prevEx ? getExerciseBestSet(prevEx) : null;
      const weightDiff = todayBest && prevBest ? todayBest.weight - prevBest.weight : null;
      return {
        name: ex.name,
        today: todayBest ? `${toDisplayWeight(todayBest.weight, weightUnit)} ${unitLabel(weightUnit)} x ${todayBest.reps}` : '-',
        lastTime: prevBest ? `${toDisplayWeight(prevBest.weight, weightUnit)} ${unitLabel(weightUnit)} x ${prevBest.reps}` : '-',
        change: weightDiff !== null ? weightDiff : null,
        comboId: ex.comboId,
        comboLabel: ex.comboLabel,
        comboUnbroken: ex.comboUnbroken,
      };
    });
  }, [currentLog, previousLog, weightUnit]);

  // the exercise shape a template would store from this log
  const templateExercises = useMemo(
    () => (currentLog?.exercises ?? []).map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      restSeconds: 90,
      sets: ex.sets.map((s) => s.planned),
    })),
    [currentLog],
  );
  // already-saved? (e.g. loaded from a template and finished unchanged) → hide the offer
  const alreadySaved = useMemo(
    () => !!currentLog && workoutTemplates.some(
      (tpl) => templateSig(tpl.name, tpl.exercises) === templateSig(currentLog.name, templateExercises),
    ),
    [workoutTemplates, currentLog, templateExercises],
  );
  const [savedNow, setSavedNow] = React.useState(false);
  const showSaveTemplate = !alreadySaved && !savedNow;

  const handleSaveTemplate = () => {
    if (!currentLog || !user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWorkoutTemplate({
      userId: user.id,
      name: currentLog.name,
      createdAt: new Date().toISOString(),
      exercises: templateExercises,
    });
    setSavedNow(true);
  };

  const handleShare = () => {
    if (!currentLog) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/share-workout?logId=${currentLog.id}` as any);
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/coach');
  };

  if (!currentLog) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPadding }]}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('workoutSession.workoutNotFound')}</Text>
          <TouchableOpacity onPress={handleDone} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('workoutSession.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Big kinetic totals. Mono Type.stat numbers wrapped in CountUp; StatTile grid.
  // Same computed values as before — only the presentation changed.
  const statNumStyle = { ...Type.stat, color: theme.text };
  const statTiles: { icon: keyof typeof Ionicons.glyphMap; label: string; node: React.ReactNode }[] = [
    {
      icon: 'time-outline',
      label: t('workoutSession.duration'),
      node: <CountUp value={currentLog.durationMinutes} format={(n) => formatDuration(Math.round(n))} style={statNumStyle} />,
    },
    {
      icon: 'barbell-outline',
      label: t('workoutSession.exercises'),
      node: <CountUp value={currentLog.exercises.length} style={statNumStyle} />,
    },
    {
      icon: 'layers-outline',
      label: t('workoutSession.totalSets'),
      node: <CountUp value={currentLog.totalSets} style={statNumStyle} />,
    },
    {
      icon: 'checkmark-circle-outline',
      label: t('workoutSession.completed'),
      node: (
        <View style={styles.completedRow}>
          <CountUp value={currentLog.completedSets} style={statNumStyle} />
          {currentLog.skippedSets > 0 && (
            <Text style={[styles.skipNote, { color: theme.textMuted }]}>
              {t('workoutSession.nSkipped', { n: currentLog.skippedSets })}
            </Text>
          )}
        </View>
      ),
    },
    {
      icon: 'repeat-outline',
      label: t('workoutSession.totalReps'),
      node: <CountUp value={currentLog.totalReps} style={statNumStyle} />,
    },
    {
      icon: 'trending-up-outline',
      label: t('workoutSession.volume'),
      node: <CountUp value={currentLog.totalVolumeKg} format={(n) => formatVolume(n, weightUnit)} style={statNumStyle} />,
    },
  ];
  // mixed-measure totals (only shown when the session had holds / distance work)
  const totalHoldSec = currentLog.exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((a, s: any) => a + (s.status === 'done' && s.actual?.type === 'hold' ? (s.actual.durationSeconds || 0) : 0), 0), 0);
  const totalDistanceM = currentLog.exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((a, s: any) => a + (s.status === 'done' ? (s.actual?.distanceMeters || 0) : 0), 0), 0);
  if (totalHoldSec > 0) statTiles.push({
    icon: 'hourglass-outline', label: t('workoutSession.holdTime', { defaultValue: 'Hold time' }),
    node: <CountUp value={totalHoldSec} format={(n) => (n >= 60 ? `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}` : `${Math.round(n)}s`)} style={statNumStyle} />,
  });
  if (totalDistanceM > 0) statTiles.push({
    icon: 'walk-outline', label: t('workoutSession.distance', { defaultValue: 'Distance' }),
    node: <CountUp value={totalDistanceM} format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(2)} km` : `${Math.round(n)} m`)} style={statNumStyle} />,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
          <LinearGradient
            colors={[Colors.electric + '30', Colors.electric + '10', 'transparent']}
            style={styles.heroBg}
          />
          <View style={styles.trophyContainer}>
            <LinearGradient
              colors={[Colors.electric, Colors.electricPressed]}
              style={styles.trophyCircle}
            >
              <Ionicons name="trophy" size={40} color="#04120B" />
            </LinearGradient>
          </View>
          <Display variant="d2" color={theme.text} style={styles.heroTitle}>{t('workoutSession.workoutComplete')}</Display>
          <Text style={[styles.heroSubtitle, { color: theme.text }]}>
            {currentLog.name}
          </Text>
          <Text style={[styles.heroDate, { color: theme.textMuted }]}>
            {formatDate(currentLog.date)}{currentLog.startTime && !isNaN(new Date(currentLog.startTime).getTime()) ? ` · ${formatTime(currentLog.startTime)}` : ''}
          </Text>
          {currentLog.preWorkout && (
            <View style={[styles.preChip, { backgroundColor: Colors.electric + '1A', borderColor: Colors.electric + '40' }]}>
              <Ionicons name="flash" size={13} color={Colors.electric} />
              <Text style={[styles.preChipText, { color: Colors.electric }]}>{t('workoutSession.preWorkout')}</Text>
            </View>
          )}
        </Animated.View>

        {newPrs.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(Spring.bouncy.damping).stiffness(Spring.bouncy.stiffness).mass(Spring.bouncy.mass)}
          >
            <LinearGradient colors={[Colors.electric + '26', Colors.electric + '08']} style={[styles.prCelebration, { borderColor: Colors.electric + '55' }]}>
              <View style={styles.prCelebHeader}>
                <Text style={styles.prCelebEmoji}>🎉</Text>
                <Text style={[styles.prCelebTitle, { color: Colors.electric }]}>
                  {newPrs.length === 1 ? t('workoutSession.newPr') : t('workoutSession.newPrs', { count: newPrs.length })}
                </Text>
              </View>
              {newPrs.map((pr) => (
                <View key={pr.name} style={styles.prCelebRow}>
                  <Ionicons name="trophy" size={14} color={Colors.electric} />
                  <Text style={[styles.prCelebName, { color: theme.text }]} numberOfLines={1}>{pr.name}</Text>
                  <Text style={[styles.prCelebWeight, { color: Colors.electric }]}>{toDisplayWeight(pr.weight, weightUnit)} {unitLabel(weightUnit)}</Text>
                  {pr.prev > 0 && (
                    <Text style={[styles.prCelebPrev, { color: theme.textMuted }]}>{t('workoutSession.prevBest', { weight: toDisplayWeight(pr.prev, weightUnit), unit: unitLabel(weightUnit) })}</Text>
                  )}
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.workoutStats')}</Text>
          <View style={styles.statsGrid}>
            {statTiles.map((st, i) => (
              <StatTile key={i} icon={st.icon} label={st.label} value={st.node} style={styles.statTile} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.progressComparison')}</Text>
          {!previousLog ? (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.firstTimeRow}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={[styles.firstTimeText, { color: theme.text }]}>
                  {t('workoutSession.firstTimeWorkout')}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.comparisonHeader, { color: theme.textSecondary }]}>
                  {t('workoutSession.vsLastNamed', { name: currentLog.name, date: formatDate(previousLog.date) })}
                </Text>
                <View style={styles.comparisonRows}>
                  <ComparisonRow
                    label={t('workoutSession.volume')}
                    current={formatVolume(currentLog.totalVolumeKg, weightUnit)}
                    diff={toDisplayWeight(comparison!.volumeDiff, weightUnit)}
                    suffix={` ${unitLabel(weightUnit)}`}
                    pct={comparison!.volumePct}
                    theme={theme}
                  />
                  <ComparisonRow
                    label={t('workoutSession.duration')}
                    current={formatDuration(currentLog.durationMinutes)}
                    diff={comparison!.durationDiff}
                    suffix=" min"
                    invertColor
                    theme={theme}
                  />
                  <ComparisonRow
                    label={t('workoutSession.setsDone')}
                    current={`${currentLog.completedSets} / ${currentLog.totalSets}`}
                    diff={comparison!.setsDiff}
                    suffix=" set"
                    theme={theme}
                  />
                </View>
              </View>

              {exerciseComparison.length > 0 && (
                <View style={[styles.card, { backgroundColor: theme.card, marginTop: 12 }]}>
                  <Text style={[styles.tableTitle, { color: theme.text }]}>{t('workoutSession.perExerciseBreakdown')}</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.exerciseCol, { color: theme.textMuted }]}>{t('workoutSession.exercise')}</Text>
                    <Text style={[styles.tableHeaderCell, styles.dataCol, { color: theme.textMuted }]}>{t('workoutSession.today')}</Text>
                    <Text style={[styles.tableHeaderCell, styles.dataCol, { color: theme.textMuted }]}>{t('workoutSession.last')}</Text>
                    <Text style={[styles.tableHeaderCell, styles.changeCol, { color: theme.textMuted }]}>{t('workoutSession.change')}</Text>
                  </View>
                  {exerciseComparison.map((row, i) => {
                    const comboStart = row.comboId && row.comboId !== exerciseComparison[i - 1]?.comboId;
                    return (
                    <React.Fragment key={i}>
                    {comboStart && (
                      <View style={styles.comboHeadRow}>
                        <View style={[styles.comboBadge, { backgroundColor: Colors.accent + '18' }]}>
                          <Ionicons name="git-merge-outline" size={10} color={Colors.accent} />
                          <Text style={[styles.comboBadgeText, { color: Colors.accent }]}>{t('workoutSession.combo')}</Text>
                        </View>
                        {row.comboUnbroken && (
                          <View style={[styles.comboBadge, { backgroundColor: Colors.electric + '18' }]}>
                            <Text style={[styles.comboBadgeText, { color: Colors.electric }]}>{t('workoutSession.unbroken')}</Text>
                          </View>
                        )}
                        <Text style={[styles.comboHeadLabel, { color: theme.textSecondary }]} numberOfLines={1}>{row.comboLabel}</Text>
                      </View>
                    )}
                    <View style={[styles.tableRow, i % 2 === 0 && { backgroundColor: theme.background + '40' }]}>
                      <Text style={[styles.tableCell, styles.exerciseCol, { color: theme.text }, row.comboId && { paddingLeft: 10 }]} numberOfLines={1}>{row.name}</Text>
                      <Text style={[styles.tableCell, styles.dataCol, { color: theme.textSecondary }]}>{row.today}</Text>
                      <Text style={[styles.tableCell, styles.dataCol, { color: theme.textMuted }]}>{row.lastTime}</Text>
                      <Text style={[styles.tableCell, styles.changeCol, {
                        color: row.change === null ? theme.textMuted : row.change > 0 ? Colors.electric : row.change < 0 ? Colors.semantic.danger : theme.textMuted
                      }]}>
                        {row.change === null ? '-' : row.change > 0 ? `+${toDisplayWeight(row.change, weightUnit)} ${unitLabel(weightUnit)}` : `${toDisplayWeight(row.change, weightUnit)} ${unitLabel(weightUnit)}`}
                      </Text>
                    </View>
                    </React.Fragment>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </Animated.View>

        {currentLog.aiInsight ? (
          <Animated.View entering={FadeInDown.delay(550).duration(600)}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.aiInsight')}</Text>
            <LinearGradient
              colors={[theme.card, '#1C1C2E']}
              style={styles.insightCard}
            >
              <View style={styles.insightBadge}>
                <LinearGradient
                  colors={[Colors.electric, Colors.electricPressed]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badgeGradient}
                >
                  <Ionicons name="sparkles" size={14} color="#04120B" />
                  <Text style={styles.badgeText}>{t('workoutSession.aiCoach')}</Text>
                </LinearGradient>
              </View>
              <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                {currentLog.aiInsight}
              </Text>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {/* actions live in-flow (not a floating bar) so nothing overlaps the content */}
        <Animated.View entering={FadeInDown.delay(650).duration(500)} style={[styles.buttonRow, { marginTop: 24 }]}>
          {showSaveTemplate ? (
            <Button variant="ghost" icon="bookmark-outline" label={t('workoutSession.saveTemplate')} onPress={handleSaveTemplate} style={styles.actionBtn} />
          ) : savedNow ? (
            <View style={[styles.savedChip, { borderColor: Colors.electric }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.electric} />
              <Text style={[styles.savedChipText, { color: Colors.electric }]}>{t('workoutPrep.saved')}</Text>
            </View>
          ) : null}
          <Button variant="ghost" icon="share-outline" label={t('workoutSession.share')} onPress={handleShare} style={styles.actionBtn} />
        </Animated.View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', theme.background, theme.background]}
        style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}
      >
        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <Button variant="primary" label={t('workoutSession.done')} playIcon="checkmark" onPress={handleDone} />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function ComparisonRow({ label, current, diff, suffix, pct, invertColor, theme }: {
  label: string;
  current: string;
  diff: number;
  suffix: string;
  pct?: string;
  invertColor?: boolean;
  theme: typeof Colors.dark;
}) {
  const isPositive = invertColor ? diff < 0 : diff > 0;
  const isNegative = invertColor ? diff > 0 : diff < 0;
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '';
  const color = isPositive ? Colors.electric : isNegative ? Colors.semantic.danger : theme.textMuted;
  const sign = diff > 0 ? '+' : '';

  return (
    <View style={styles.compRow}>
      <Text style={[styles.compLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.compCurrent, { color: theme.text }]}>{current}</Text>
      <View style={styles.compDiffContainer}>
        <Text style={[styles.compDiff, { color }]}>
          {arrow} {sign}{Math.abs(diff)}{suffix}
          {pct ? ` (${sign}${pct}%)` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.electric,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backBtnText: {
    color: '#04120B',
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  trophyContainer: {
    marginBottom: 16,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    marginTop: 6,
  },
  heroDate: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  preChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  preChipText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginBottom: 12,
    marginTop: 20,
  },
  prCelebration: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8 },
  prCelebHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  prCelebEmoji: { fontSize: 20 },
  prCelebTitle: { fontFamily: Fonts.bold, fontSize: 16 },
  prCelebRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  prCelebName: { flex: 1, fontFamily: Fonts.semibold, fontSize: 14 },
  prCelebWeight: { fontFamily: Fonts.monoBold, fontSize: 15 },
  prCelebPrev: { fontFamily: Fonts.medium, fontSize: 11 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  skipNote: {
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  firstTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  firstTimeText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    flex: 1,
  },
  comparisonHeader: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    marginBottom: 16,
  },
  comparisonRows: {
    gap: 14,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compLabel: {
    width: 80,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  compCurrent: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  compDiffContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  compDiff: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  tableTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  tableHeaderCell: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseCol: {
    flex: 2,
  },
  dataCol: {
    flex: 1.5,
  },
  changeCol: {
    flex: 1,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  comboHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4 },
  comboBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  comboBadgeText: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' },
  comboHeadLabel: { flex: 1, fontFamily: Fonts.semibold, fontSize: 11 },
  tableCell: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  insightCard: {
    borderRadius: 16,
    padding: 18,
  },
  insightBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: '#04120B',
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  insightText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
  },
  savedChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    height: 48,
  },
  savedChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
});
