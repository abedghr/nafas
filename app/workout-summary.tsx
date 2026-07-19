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
import Colors from '@/constants/colors';

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

function formatVolume(kg: number): string {
  if (kg >= 1000) return kg.toLocaleString('en-US') + ' kg';
  return kg + ' kg';
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
  const { workoutLogs, workoutTemplates, addWorkoutTemplate, user, isDark } = useApp();

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
        today: todayBest ? `${todayBest.weight} kg x ${todayBest.reps}` : '-',
        lastTime: prevBest ? `${prevBest.weight} kg x ${prevBest.reps}` : '-',
        change: weightDiff !== null ? weightDiff : null,
      };
    });
  }, [currentLog, previousLog]);

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

  // 6 stats → clean 2×3 grid. Pre-workout moved to a hero chip (was a lone full-width tile).
  const stats = [
    { label: t('workoutSession.duration'), value: formatDuration(currentLog.durationMinutes), icon: 'time-outline' as const },
    { label: t('workoutSession.exercises'), value: String(currentLog.exercises.length), icon: 'barbell-outline' as const },
    { label: t('workoutSession.totalSets'), value: String(currentLog.totalSets), icon: 'layers-outline' as const },
    { label: t('workoutSession.completed'), value: `${currentLog.completedSets}${currentLog.skippedSets > 0 ? ` (${t('workoutSession.nSkipped', { n: currentLog.skippedSets })})` : ''}`, icon: 'checkmark-circle-outline' as const },
    { label: t('workoutSession.totalReps'), value: String(currentLog.totalReps), icon: 'repeat-outline' as const },
    { label: t('workoutSession.volume'), value: formatVolume(currentLog.totalVolumeKg), icon: 'trending-up-outline' as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
          <LinearGradient
            colors={['#00C89640', '#00C89610', 'transparent']}
            style={styles.heroBg}
          />
          <View style={styles.trophyContainer}>
            <LinearGradient
              colors={[Colors.primary, '#00A87A']}
              style={styles.trophyCircle}
            >
              <Ionicons name="trophy" size={40} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{t('workoutSession.workoutComplete')}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            {currentLog.name}
          </Text>
          <Text style={[styles.heroDate, { color: theme.textMuted }]}>
            {formatDate(currentLog.date)}{currentLog.startTime && !isNaN(new Date(currentLog.startTime).getTime()) ? ` · ${formatTime(currentLog.startTime)}` : ''}
          </Text>
          {currentLog.preWorkout && (
            <View style={[styles.preChip, { backgroundColor: Colors.primary + '1A', borderColor: Colors.primary + '40' }]}>
              <Ionicons name="flash" size={13} color={Colors.primary} />
              <Text style={[styles.preChipText, { color: Colors.primary }]}>{t('workoutSession.preWorkout')}</Text>
            </View>
          )}
        </Animated.View>

        {newPrs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <LinearGradient colors={['#FFD70026', '#FFD70008']} style={[styles.prCelebration, { borderColor: '#FFD70055' }]}>
              <View style={styles.prCelebHeader}>
                <Text style={styles.prCelebEmoji}>🎉</Text>
                <Text style={[styles.prCelebTitle, { color: '#FFD700' }]}>
                  {newPrs.length === 1 ? t('workoutSession.newPr') : t('workoutSession.newPrs', { count: newPrs.length })}
                </Text>
              </View>
              {newPrs.map((pr) => (
                <View key={pr.name} style={styles.prCelebRow}>
                  <Ionicons name="trophy" size={14} color="#FFD700" />
                  <Text style={[styles.prCelebName, { color: theme.text }]} numberOfLines={1}>{pr.name}</Text>
                  <Text style={[styles.prCelebWeight, { color: '#FFD700' }]}>{pr.weight} {t('workoutSession.kg')}</Text>
                  {pr.prev > 0 && (
                    <Text style={[styles.prCelebPrev, { color: theme.textMuted }]}>{t('workoutSession.prevBest', { weight: pr.prev })}</Text>
                  )}
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.workoutStats')}</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: theme.card }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name={stat.icon} size={18} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
              </View>
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
                    current={formatVolume(currentLog.totalVolumeKg)}
                    diff={comparison!.volumeDiff}
                    suffix=" kg"
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
                  {exerciseComparison.map((row, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: theme.background + '40' }]}>
                      <Text style={[styles.tableCell, styles.exerciseCol, { color: theme.text }]} numberOfLines={1}>{row.name}</Text>
                      <Text style={[styles.tableCell, styles.dataCol, { color: theme.textSecondary }]}>{row.today}</Text>
                      <Text style={[styles.tableCell, styles.dataCol, { color: theme.textMuted }]}>{row.lastTime}</Text>
                      <Text style={[styles.tableCell, styles.changeCol, {
                        color: row.change === null ? theme.textMuted : row.change > 0 ? '#4ADE80' : row.change < 0 ? '#F87171' : theme.textMuted
                      }]}>
                        {row.change === null ? '-' : row.change > 0 ? `+${row.change} kg` : `${row.change} kg`}
                      </Text>
                    </View>
                  ))}
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
                  colors={[Colors.primary, '#00A87A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badgeGradient}
                >
                  <Ionicons name="sparkles" size={14} color="#FFF" />
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
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={handleSaveTemplate}>
              <Ionicons name="bookmark-outline" size={20} color={Colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t('workoutSession.saveTemplate')}</Text>
            </TouchableOpacity>
          ) : savedNow ? (
            <View style={[styles.secondaryBtn, { borderColor: Colors.primary }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: Colors.primary }]}>{t('workoutPrep.saved')}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t('workoutSession.share')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', theme.background, theme.background]}
        style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}
      >
        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <LinearGradient
              colors={[Colors.primary, '#00A87A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneBtnGradient}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.doneBtnText}>{t('workoutSession.done')}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  const color = isPositive ? '#4ADE80' : isNegative ? '#F87171' : theme.textMuted;
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
    fontSize: 16,
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
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
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  heroDate: {
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
    fontSize: 12,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
    marginTop: 20,
  },
  prCelebration: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8 },
  prCelebHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  prCelebEmoji: { fontSize: 20 },
  prCelebTitle: { fontSize: 16, fontWeight: '800' as const },
  prCelebRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  prCelebName: { flex: 1, fontSize: 14, fontWeight: '600' as const },
  prCelebWeight: { fontSize: 15, fontWeight: '800' as const },
  prCelebPrev: { fontSize: 11, fontWeight: '500' as const },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '31%' as any,
    flexGrow: 1,
    minWidth: 100,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIconRow: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  comparisonHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
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
    fontSize: 13,
    fontWeight: '500' as const,
  },
  compCurrent: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  compDiffContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  compDiff: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600' as const,
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
  tableCell: {
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
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  insightText: {
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
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  doneBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
