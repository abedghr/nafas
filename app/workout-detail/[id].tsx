import React, { useMemo, useCallback } from 'react';
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
import { useApp, WorkoutLog, LogExercise } from '@/lib/app-context';
import { confirmDialog, alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

export default function WorkoutDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutLogs, deleteWorkoutLog, addWorkoutTemplate, user, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const currentLog = useMemo(() => {
    return workoutLogs.find((l) => l.id === id) || null;
  }, [workoutLogs, id]);

  const previousLog = useMemo(() => {
    if (!currentLog) return null;
    const sameName = workoutLogs
      .filter((l) => l.name === currentLog.name && l.id !== currentLog.id && new Date(l.date).getTime() < new Date(currentLog.date).getTime())
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
    const repsDiff = currentLog.totalReps - previousLog.totalReps;
    return { volumeDiff, volumePct, durationDiff, setsDiff, repsDiff };
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
        today: todayBest ? `${todayBest.weight}kg x ${todayBest.reps}` : '-',
        lastTime: prevBest ? `${prevBest.weight}kg x ${prevBest.reps}` : '-',
        change: weightDiff,
      };
    });
  }, [currentLog, previousLog]);

  const handleUseAsTemplate = useCallback(() => {
    if (!currentLog || !user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWorkoutTemplate({
      userId: user.id,
      name: currentLog.name,
      createdAt: new Date().toISOString(),
      exercises: currentLog.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        restSeconds: 90,
        sets: ex.sets.map((s) => s.planned),
      })),
    });
    alertDialog(t('workoutSession.templateSaved'), t('workoutSession.templateSavedMessage', { name: currentLog.name }));
  }, [currentLog, user, addWorkoutTemplate, t]);

  const handleShare = useCallback(() => {
    if (!currentLog) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/share-workout?logId=${currentLog.id}` as any);
  }, [currentLog]);

  const handleDelete = useCallback(async () => {
    if (!currentLog) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (await confirmDialog({ title: t('workoutSession.deleteWorkout'), message: t('workoutSession.deleteWorkoutConfirm', { name: currentLog.name }), destructive: true, confirmText: t('workoutSession.delete'), cancelText: t('workoutSession.cancel') })) {
      deleteWorkoutLog(currentLog.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  }, [currentLog, deleteWorkoutLog, t]);

  if (!currentLog) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPadding }]}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('workoutSession.workoutNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
            <Text style={styles.goBackBtnText}>{t('workoutSession.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = [
    { label: t('workoutSession.duration'), value: formatDuration(currentLog.durationMinutes), icon: 'time-outline' as const },
    { label: t('workoutSession.volume'), value: formatVolume(currentLog.totalVolumeKg), icon: 'trending-up-outline' as const },
    { label: t('workoutSession.sets'), value: `${currentLog.completedSets}/${currentLog.totalSets}`, icon: 'layers-outline' as const },
    { label: t('workoutSession.reps'), value: String(currentLog.totalReps), icon: 'repeat-outline' as const },
  ];

  const muscleGroups = Array.from(new Set(currentLog.exercises.map(e => e.muscleGroup)));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={2}>
                {currentLog.name}
              </Text>
              <Text style={[styles.headerDate, { color: theme.textSecondary }]}>
                {formatDate(currentLog.date)}{(() => {
                  const s = currentLog.startTime && !isNaN(new Date(currentLog.startTime).getTime()) ? formatTime(currentLog.startTime) : '';
                  const e = currentLog.endTime && !isNaN(new Date(currentLog.endTime).getTime()) ? formatTime(currentLog.endTime) : '';
                  return s ? ` · ${s}${e ? ` - ${e}` : ''}` : '';
                })()}
              </Text>
            </View>
          </View>

          {muscleGroups.length > 0 && (
            <View style={styles.muscleTagRow}>
              {muscleGroups.map((muscle) => (
                <View key={muscle} style={[styles.muscleTag, { backgroundColor: Colors.primary + '18' }]}>
                  <Text style={[styles.muscleTagText, { color: Colors.primary }]}>{muscle}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
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

        <Animated.View entering={FadeInDown.delay(350).duration(600)}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.exercises')}</Text>
          {currentLog.exercises.map((exercise, exIdx) => (
            <View key={exIdx} style={[styles.exerciseCard, { backgroundColor: theme.card }]}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameRow}>
                  <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
                </View>
                <View style={[styles.muscleSmallTag, { backgroundColor: Colors.primary + '15' }]}>
                  <Text style={[styles.muscleSmallText, { color: Colors.primary }]}>{exercise.muscleGroup}</Text>
                </View>
              </View>

              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderCell, styles.setCol, { color: theme.textMuted }]}>{t('workoutSession.set')}</Text>
                <Text style={[styles.setHeaderCell, styles.plannedCol, { color: theme.textMuted }]}>{t('workoutSession.planned')}</Text>
                <Text style={[styles.setHeaderCell, styles.actualCol, { color: theme.textMuted }]}>{t('workoutSession.actual')}</Text>
                <Text style={[styles.setHeaderCell, styles.statusCol, { color: theme.textMuted }]}>{t('workoutSession.status')}</Text>
              </View>

              {exercise.sets.map((set, setIdx) => {
                const getSetStr = (s: any) => {
                  if (s?.weight && s?.reps) return `${s.weight}kg x ${s.reps}`;
                  if (s?.durationSeconds) return `${s.durationSeconds}s`;
                  if (s?.repsPerInterval && s?.totalIntervals) return `${s.repsPerInterval}×${s.totalIntervals}`;
                  return '-';
                };
                const plannedStr = getSetStr(set.planned);
                const actualStr = getSetStr(set.actual);
                const isDone = set.status === 'done';
                const isSkipped = set.status === 'skipped';
                const note = set.actual?.note || set.planned?.note || '';

                return (
                  <View key={setIdx} style={[styles.setRowWrap, setIdx % 2 === 0 && { backgroundColor: theme.background + '40' }]}>
                    <View style={styles.setRow}>
                      <Text style={[styles.setCell, styles.setCol, { color: theme.textSecondary }]}>{setIdx + 1}</Text>
                      <Text style={[styles.setCell, styles.plannedCol, { color: theme.textMuted }]}>{plannedStr}</Text>
                      <Text style={[styles.setCell, styles.actualCol, { color: isDone ? theme.text : theme.textMuted }]}>{actualStr}</Text>
                      <View style={[styles.statusCol, { alignItems: 'center' }]}>
                        {isDone ? (
                          <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                        ) : isSkipped ? (
                          <Ionicons name="close-circle" size={18} color="#F87171" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
                        )}
                      </View>
                    </View>
                    {note ? (
                      <View style={styles.setNoteRow}>
                        <Ionicons name="document-text-outline" size={12} color={theme.textMuted} style={{ marginTop: 1 }} />
                        <Text style={[styles.setNoteText, { color: theme.textSecondary }]}>{note}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </Animated.View>

        {currentLog.aiInsight ? (
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
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

        {comparison && previousLog ? (
          <Animated.View entering={FadeInDown.delay(600).duration(600)}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('workoutSession.progressComparison')}</Text>
            <View style={[styles.compCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.compSubheader, { color: theme.textSecondary }]}>
                {t('workoutSession.vsDate', { date: formatDate(previousLog.date) })}
              </Text>
              <View style={styles.compRows}>
                <CompRow label={t('workoutSession.volume')} diff={comparison.volumeDiff} suffix=" kg" pct={comparison.volumePct} theme={theme} />
                <CompRow label={t('workoutSession.duration')} diff={comparison.durationDiff} suffix=" min" invertColor theme={theme} />
                <CompRow label={t('workoutSession.sets')} diff={comparison.setsDiff} suffix="" theme={theme} />
                <CompRow label={t('workoutSession.reps')} diff={comparison.repsDiff} suffix="" theme={theme} />
              </View>
            </View>

            {exerciseComparison.length > 0 && (
              <View style={[styles.compCard, { backgroundColor: theme.card, marginTop: 12 }]}>
                <Text style={[styles.compTableTitle, { color: theme.text }]}>{t('workoutSession.perExerciseBestSet')}</Text>
                <View style={styles.compTableHeader}>
                  <Text style={[styles.compTableHeaderCell, styles.exCol, { color: theme.textMuted }]}>{t('workoutSession.exercise')}</Text>
                  <Text style={[styles.compTableHeaderCell, styles.valCol, { color: theme.textMuted }]}>{t('workoutSession.thisCol')}</Text>
                  <Text style={[styles.compTableHeaderCell, styles.valCol, { color: theme.textMuted }]}>{t('workoutSession.prevCol')}</Text>
                  <Text style={[styles.compTableHeaderCell, styles.chgCol, { color: theme.textMuted }]}>{t('workoutSession.plusMinus')}</Text>
                </View>
                {exerciseComparison.map((row, i) => (
                  <View key={i} style={[styles.compTableRow, i % 2 === 0 && { backgroundColor: theme.background + '40' }]}>
                    <Text style={[styles.compTableCell, styles.exCol, { color: theme.text }]} numberOfLines={1}>{row.name}</Text>
                    <Text style={[styles.compTableCell, styles.valCol, { color: theme.textSecondary }]}>{row.today}</Text>
                    <Text style={[styles.compTableCell, styles.valCol, { color: theme.textMuted }]}>{row.lastTime}</Text>
                    <Text style={[styles.compTableCell, styles.chgCol, {
                      color: row.change === null ? theme.textMuted : row.change > 0 ? '#4ADE80' : row.change < 0 ? '#F87171' : theme.textMuted,
                    }]}>
                      {row.change === null ? '-' : row.change > 0 ? `+${row.change}` : `${row.change}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        {/* actions in-flow (no floating bar) so nothing overlaps the comparison table */}
        <Animated.View entering={FadeInDown.delay(650).duration(500)} style={[styles.buttonRow, { marginTop: 24 }]}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border }]} onPress={handleUseAsTemplate}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.primary} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>{t('workoutSession.useAsTemplate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border }]} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>{t('workoutSession.share')}</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(750).duration(500)}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#F87171" />
            <Text style={styles.deleteBtnText}>{t('workoutSession.deleteWorkout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function CompRow({ label, diff, suffix, pct, invertColor, theme }: {
  label: string;
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
    <View style={styles.compRowContainer}>
      <Text style={[styles.compRowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.compRowValue, { color }]}>
        {arrow} {sign}{Math.abs(diff)}{suffix}
        {pct ? ` (${sign}${pct}%)` : ''}
      </Text>
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
  goBackBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goBackBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  muscleTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    marginLeft: 38,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '47%' as any,
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIconRow: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
    marginTop: 20,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  muscleSmallTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  muscleSmallText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  setHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
    marginBottom: 2,
  },
  setHeaderCell: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setCol: {
    width: 36,
    textAlign: 'center',
  },
  plannedCol: {
    flex: 1,
  },
  actualCol: {
    flex: 1,
  },
  statusCol: {
    width: 44,
    textAlign: 'center',
  },
  setRowWrap: {
    borderRadius: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  setCell: {
    fontSize: 13,
  },
  setNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 36,
    paddingRight: 8,
    paddingBottom: 8,
    marginTop: -2,
  },
  setNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 16,
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
  compCard: {
    borderRadius: 16,
    padding: 16,
  },
  compSubheader: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  compRows: {
    gap: 12,
  },
  compRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compRowLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  compRowValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  compTableTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  compTableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  compTableHeaderCell: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exCol: {
    flex: 2,
  },
  valCol: {
    flex: 1.2,
  },
  chgCol: {
    flex: 0.8,
    textAlign: 'right',
  },
  compTableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  compTableCell: {
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8717115',
  },
  deleteBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
