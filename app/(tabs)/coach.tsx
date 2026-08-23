import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import ProgramTodayCard from '@/components/ProgramTodayCard';
import ProgramOverviewModal from '@/components/ProgramOverviewModal';
import { AppHeader, StatTile, ActivityRings, CountUp, Button } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import { toDisplayWeight, unitLabel, type WeightUnit } from '@/lib/units';
import Colors from '@/constants/colors';
import { aiTips } from '@/lib/mock-data';
import { workoutApi } from '@/src/features/workout/api';
import { CompleteProfileBanner } from '@/components/CompleteProfileBanner';

const { width: SW } = Dimensions.get('window');

function generateInsights(workouts: any[], streak: number, weeklyWorkouts: number, t: (key: string, opts?: any) => string) {
  const insights: { icon: string; color: string; title: string; text: string; type: 'positive' | 'warning' | 'info' }[] = [];
  if (workouts.length === 0) {
    insights.push({ icon: 'rocket-outline', color: Colors.primary, title: t('workoutTab.insightGetStartedTitle'), text: t('workoutTab.insightGetStartedText'), type: 'info' });
    return insights;
  }
  if (streak >= 7) {
    insights.push({ icon: 'flame', color: '#FF6B35', title: t('workoutTab.insightOnFireTitle'), text: t('workoutTab.insightOnFireText', { n: streak }), type: 'positive' });
  } else if (streak >= 3) {
    insights.push({ icon: 'trending-up', color: Colors.primary, title: t('workoutTab.insightMomentumTitle'), text: t('workoutTab.insightMomentumText', { n: streak }), type: 'positive' });
  } else {
    insights.push({ icon: 'alert-circle-outline', color: '#FFD93D', title: t('workoutTab.insightConsistentTitle'), text: t('workoutTab.insightConsistentText'), type: 'warning' });
  }
  const thisWeekVolume = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 3600000;
  }).reduce((a: number, w: any) => a + w.totalVolume, 0);
  const lastWeekVolume = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return diff >= 7 * 24 * 3600000 && diff < 14 * 24 * 3600000;
  }).reduce((a: number, w: any) => a + w.totalVolume, 0);
  if (lastWeekVolume > 0 && thisWeekVolume > lastWeekVolume) {
    const pct = Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100);
    insights.push({ icon: 'arrow-up-circle', color: Colors.primary, title: t('workoutTab.insightVolumeUpTitle'), text: t('workoutTab.insightVolumeUpText', { n: pct }), type: 'positive' });
  } else if (lastWeekVolume > 0 && thisWeekVolume < lastWeekVolume * 0.7) {
    insights.push({ icon: 'arrow-down-circle', color: '#FF4458', title: t('workoutTab.insightVolumeDropTitle'), text: t('workoutTab.insightVolumeDropText'), type: 'warning' });
  }
  const muscleGroups: Record<string, number> = {};
  workouts.slice(0, 10).forEach(w => {
    w.exercises?.forEach((e: any) => {
      const name = e.name?.toLowerCase() || '';
      if (name.includes('bench') || name.includes('press') || name.includes('fly') || name.includes('push')) muscleGroups['Push'] = (muscleGroups['Push'] || 0) + 1;
      if (name.includes('pull') || name.includes('row') || name.includes('curl') || name.includes('deadlift')) muscleGroups['Pull'] = (muscleGroups['Pull'] || 0) + 1;
      if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('calf')) muscleGroups['Legs'] = (muscleGroups['Legs'] || 0) + 1;
    });
  });
  const groups = Object.entries(muscleGroups);
  if (groups.length > 0) {
    const sorted = groups.sort((a, b) => b[1] - a[1]);
    const weakest = groups.length > 1 ? sorted[sorted.length - 1] : null;
    if (weakest && weakest[1] < sorted[0][1] * 0.5) {
      const groupLabel = t(`workoutTab.muscleGroup${weakest[0]}`);
      insights.push({ icon: 'body-outline', color: '#48CAE4', title: t('workoutTab.insightBalanceTitle'), text: t('workoutTab.insightBalanceText', { group: groupLabel }), type: 'info' });
    }
  }
  return insights;
}

function InsightCard({ insight, index }: { insight: ReturnType<typeof generateInsights>[0]; index: number }) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <View style={[s.insightCard, { backgroundColor: theme.card }]}>
        <View style={[s.insightIcon, { backgroundColor: insight.color + '18' }]}>
          <Ionicons name={insight.icon as any} size={20} color={insight.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.insightTitle, { color: theme.text }]}>{insight.title}</Text>
          <Text style={[s.insightText, { color: theme.textSecondary }]}>{insight.text}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function WorkoutHistoryItem({ workout, index }: { workout: any; index: number }) {
  const { t } = useTranslation();
  const { isDark, weightUnit } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const typeIcons: Record<string, string> = {
    'Push Day': 'arrow-up-circle-outline', 'Pull Day': 'arrow-down-circle-outline',
    'Leg Day': 'walk-outline', 'Upper Body': 'body-outline', 'Full Body': 'fitness-outline',
    'Cardio': 'heart-outline', 'Custom': 'create-outline',
  };
  return (
    <Animated.View entering={FadeInRight.duration(300).delay(index * 60)}>
      <View style={[s.historyItem, { backgroundColor: theme.card }]}>
        <View style={[s.historyIcon, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name={(typeIcons[workout.type] || 'barbell-outline') as any} size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.historyTitle, { color: theme.text }]}>{workout.type}</Text>
          <Text style={[s.historyMeta, { color: theme.textMuted }]}>
            {t('workoutTab.exercisesCount', { n: workout.exercises?.length || 0 })}  ·  {t('workoutTab.minutesShort', { n: workout.duration })}  ·  {workout.totalVolume > 0 ? t('workoutTab.volumeK', { n: (toDisplayWeight(workout.totalVolume, weightUnit) / 1000).toFixed(1), unit: unitLabel(weightUnit) }) : ''}
          </Text>
        </View>
        <Text style={[s.historyDate, { color: theme.textMuted }]}>{workout.date}</Text>
      </View>
    </Animated.View>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatVolume(kg: number, unit: WeightUnit) {
  if (kg <= 0) return `0 ${unitLabel(unit)}`;
  return `${toDisplayWeight(kg, unit).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${unitLabel(unit)}`;
}

function RecentWorkoutCard({ log, index }: { log: any; index: number }) {
  const { t } = useTranslation();
  const { isDark, weightUnit } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    log.exercises?.forEach((ex: any) => {
      if (ex.muscleGroup) groups.add(ex.muscleGroup);
    });
    return Array.from(groups).slice(0, 3);
  }, [log.exercises]);

  const dateLabel = useMemo(() => {
    const d = new Date(log.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('workoutTab.today');
    if (d.toDateString() === yesterday.toDateString()) return t('workoutTab.yesterday');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [log.date, t]);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 70)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/workout-detail/${log.id}`);
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <View style={[s.recentCard, { backgroundColor: theme.card }]}>
          <View style={s.recentCardTop}>
            <View style={[s.recentCardIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.recentCardName, { color: theme.text }]} numberOfLines={1}>{log.name}</Text>
              <Text style={[s.recentCardDate, { color: theme.textMuted }]}>{dateLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </View>
          <View style={s.recentCardStats}>
            <View style={s.recentCardStat}>
              <Ionicons name="time-outline" size={14} color={theme.textMuted} />
              <Text style={[s.recentCardStatText, { color: theme.textSecondary }]}>{formatDuration(log.durationMinutes)}</Text>
            </View>
            <View style={s.recentCardStat}>
              <Ionicons name="barbell-outline" size={14} color={theme.textMuted} />
              <Text style={[s.recentCardStatText, { color: theme.textSecondary }]}>{formatVolume(log.totalVolumeKg, weightUnit)}</Text>
            </View>
          </View>
          {muscleGroups.length > 0 && (
            <View style={s.recentCardTags}>
              {muscleGroups.map(g => (
                <View key={g} style={[s.muscleTag, { backgroundColor: Colors.primary + '12' }]}>
                  <Text style={[s.muscleTagText, { color: Colors.primary }]}>{g}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function CoachScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, workouts, weeklyWorkouts, streak, user, workoutLogs, activeSession, weightUnit, programs, activeEnrollment } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights'>('dashboard');
  const [showStart, setShowStart] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [tipIndex] = useState(Math.floor(Math.random() * aiTips.length));

  // Insights/summary run off the real server-backed logs (normalized to the
  // shape the helpers expect), not the legacy in-memory `workouts` array.
  const logsAsWorkouts = useMemo(() => workoutLogs.map((l: any) => ({
    date: String(l.date || '').split('T')[0],
    duration: l.durationMinutes || 0,
    totalVolume: l.totalVolumeKg || 0,
    exercises: l.exercises || [],
  })), [workoutLogs]);

  const totalVolume = logsAsWorkouts.reduce((acc, w) => acc + w.totalVolume, 0);
  const totalWorkoutCount = logsAsWorkouts.length;
  const avgDuration = totalWorkoutCount > 0 ? Math.round(logsAsWorkouts.reduce((a, w) => a + w.duration, 0) / totalWorkoutCount) : 0;
  const insights = useMemo(() => generateInsights(logsAsWorkouts, streak, weeklyWorkouts, t), [logsAsWorkouts, streak, weeklyWorkouts, t]);
  const topPad = Platform.OS === 'web' ? 67 + 16 : insets.top + 12;

  const weeklyVolumeFromLogs = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return workoutLogs
      .filter(l => new Date(l.date) >= weekAgo)
      .reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  }, [workoutLogs]);

  const recentLogs = useMemo(() => workoutLogs.slice(0, 5), [workoutLogs]);

  // Personal records — server-derived from full history; refresh when logs change
  // AND on focus (deletes are async; returning to this screen re-reads the server).
  const [prs, setPrs] = useState<{ name: string; weight: number; reps: number; date: string }[]>([]);
  const refreshPrs = useCallback(() => { workoutApi.prs(5).then(setPrs).catch(() => {}); }, []);
  useEffect(refreshPrs, [workoutLogs.length, refreshPrs]);
  useFocusEffect(refreshPrs);

  const sessionElapsed = useMemo(() => {
    if (!activeSession) return '';
    const elapsed = Math.floor((Date.now() - activeSession.startTimestamp) / 60000);
    return formatDuration(elapsed);
  }, [activeSession]);

  const tabs = [
    { id: 'dashboard' as const, label: t('workoutTab.tabDashboard'), icon: 'grid-outline' },
    { id: 'insights' as const, label: t('workoutTab.tabInsights'), icon: 'analytics-outline' },
  ];

  const recommendations = useMemo(() => {
    const recs: { icon: string; text: string; color: string }[] = [];
    if (user?.goal === 'build_muscle') {
      recs.push({ icon: 'nutrition-outline', text: t('workoutTab.recMuscleProtein'), color: Colors.primary });
      recs.push({ icon: 'bed-outline', text: t('workoutTab.recMuscleSleep'), color: '#48CAE4' });
      recs.push({ icon: 'barbell-outline', text: t('workoutTab.recMuscleOverload'), color: '#FFD93D' });
    } else if (user?.goal === 'lose_weight') {
      recs.push({ icon: 'flame-outline', text: t('workoutTab.recLoseDeficit'), color: '#FF6B35' });
      recs.push({ icon: 'walk-outline', text: t('workoutTab.recLoseWalking'), color: Colors.primary });
      recs.push({ icon: 'water-outline', text: t('workoutTab.recLoseWater'), color: '#48CAE4' });
    } else {
      recs.push({ icon: 'fitness-outline', text: t('workoutTab.recGeneralMix'), color: Colors.primary });
      recs.push({ icon: 'timer-outline', text: t('workoutTab.recGeneralRest'), color: '#FFD93D' });
      recs.push({ icon: 'heart-outline', text: t('workoutTab.recGeneralHeartRate'), color: '#FF4458' });
    }
    return recs;
  }, [user?.goal, t]);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: topPad }}>
          <AppHeader
            style={s.header}
            name={user?.name || t('workoutTab.athlete')}
            greeting={new Date().getHours() < 12 ? t('workoutTab.goodMorning') : new Date().getHours() < 18 ? t('workoutTab.goodAfternoon') : t('workoutTab.goodEvening')}
            actionIcon="calendar-outline"
            onAction={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); activeEnrollment ? setShowOverview(true) : router.push('/programs' as any); }}
          />

          <CompleteProfileBanner />

          <View style={s.tabRow}>
            {tabs.map(tab => (
              <Pressable
                key={tab.id}
                onPress={() => { setActiveTab(tab.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[s.tab, activeTab === tab.id && { backgroundColor: Colors.primary + '18' }]}
              >
                <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? Colors.primary : theme.textMuted} />
                <Text style={[s.tabText, { color: activeTab === tab.id ? Colors.primary : theme.textMuted }]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'dashboard' && (
            <View style={{ gap: 16, paddingTop: 6 }}>
              {activeSession && (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push('/live-workout' as any);
                    }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                  >
                    <LinearGradient
                      colors={['#FF6B35', '#FF8C5E']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.resumeBanner}
                    >
                      <View style={s.resumeBannerPulse}>
                        <View style={s.resumeBannerDot} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.resumeBannerTitle}>{t('workoutTab.workoutInProgress')}</Text>
                        <Text style={s.resumeBannerSub}>{activeSession.workoutName} · {sessionElapsed}</Text>
                      </View>
                      <View style={s.resumeBannerBtn}>
                        <Text style={s.resumeBannerBtnText}>{t('workoutTab.resume')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              )}

              {activeEnrollment ? (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <ProgramTodayCard />
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/programs' as any); }}
                    style={({ pressed }) => [s.noProgramCard, { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 }]}
                  >
                    <View style={[s.aiSmallBadge, { backgroundColor: Colors.electric + '22', width: 34, height: 34 }]}>
                      <Ionicons name="flag-outline" size={17} color={Colors.electric} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.planPreviewTitle, { color: theme.text }]}>{t('programs.noActiveProgram', { defaultValue: 'No active program' })}</Text>
                      <Text style={[s.planPreviewSub, { color: theme.textMuted }]}>{t('programs.startOneToTrack', { defaultValue: 'Start a program to follow day by day' })}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.duration(450).delay(80)} style={{ paddingHorizontal: 20 }}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai-coach' as any); }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                >
                  <LinearGradient colors={[Colors.electric, '#48CAE4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.aiCoachCard}>
                    <View style={s.aiCoachIcon}><Ionicons name="sparkles" size={22} color="#04120B" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.aiCoachTitle}>{t('aiCoach.cardTitle', { defaultValue: 'AI Coach' })}</Text>
                      <Text style={s.aiCoachSub}>{t('aiCoach.cardSub', { defaultValue: 'Chat to build a program from your goal, history or a file' })}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#04120B" />
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500)} style={{ paddingHorizontal: 20 }}>
                <Button
                  variant="ghost"
                  icon="library-outline"
                  label={t('workoutTab.myWorkouts')}
                  onPress={() => router.push('/saved-workouts' as any)}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(120)}>
                <View style={[s.ringsCard, { backgroundColor: theme.card }]}>
                  <ActivityRings
                    size={116}
                    rings={[
                      { value: Math.min(1, weeklyWorkouts / 5), color: Colors.ring.green },
                      { value: Math.min(1, weeklyVolumeFromLogs / 20000), color: Colors.ring.amber },
                      { value: Math.min(1, streak / 7), color: Colors.ring.blue },
                    ]}
                  />
                  <View style={s.ringsLegend}>
                    {[
                      { color: Colors.ring.green, node: <CountUp value={weeklyWorkouts} style={s.legendVal} />, label: t('workoutTab.statThisWeek') },
                      { color: Colors.ring.amber, node: <CountUp value={weeklyVolumeFromLogs} format={(n) => formatVolume(n, weightUnit)} style={s.legendVal} />, label: t('workoutTab.statVolume') },
                      { color: Colors.ring.blue, node: <CountUp value={streak} format={(n) => `${Math.round(n)}d`} style={s.legendVal} />, label: t('workoutTab.statStreak') },
                    ].map((r, i) => (
                      <View key={i} style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: r.color }]} />
                        {r.node}
                        <Text style={[s.legendLabel, { color: theme.textMuted }]} numberOfLines={1}>{r.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>

              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/programs' as any); }}
                style={({ pressed }) => [s.programsCard, { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[s.programsCardIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.programsCardTitle, { color: theme.text }]}>{t('programs.programsCardTitle')}</Text>
                  <Text style={[s.programsCardSub, { color: theme.textMuted }]}>{t('programs.programsCardSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>

              {prs.length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.personalRecords')}</Text>
                  <View style={[s.prCard, { backgroundColor: theme.card }]}>
                    {prs.map((pr, i) => (
                      <Pressable
                        key={pr.name}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/exercise-progress?name=${encodeURIComponent(pr.name)}` as any); }}
                        style={({ pressed }) => [s.prRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[s.prRank, { backgroundColor: i === 0 ? '#FFD70022' : theme.surface }]}>
                          {i === 0
                            ? <Ionicons name="trophy" size={14} color="#FFD700" />
                            : <Text style={[s.prRankText, { color: theme.textMuted }]}>{i + 1}</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.prName, { color: theme.text }]} numberOfLines={1}>{pr.name}</Text>
                          <Text style={[s.prDate, { color: theme.textMuted }]}>
                            {new Date(pr.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                        <Text style={[s.prWeight, { color: Colors.primary }]}>{toDisplayWeight(pr.weight, weightUnit)} {unitLabel(weightUnit)}</Text>
                        <Text style={[s.prReps, { color: theme.textMuted }]}> × {pr.reps}</Text>
                        <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.recentWorkouts')}</Text>
              {recentLogs.length === 0 ? (
                <View style={[s.emptyCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="barbell-outline" size={36} color={theme.textMuted} />
                  <Text style={[s.emptyTitle, { color: theme.textMuted }]}>{t('workoutTab.noWorkoutsYet')}</Text>
                  <Text style={[s.emptySub, { color: theme.textMuted }]}>{t('workoutTab.noWorkoutsYetSub')}</Text>
                </View>
              ) : (
                recentLogs.map((log, i) => (
                  <RecentWorkoutCard key={log.id} log={log} index={i} />
                ))
              )}
            </View>
          )}

          {activeTab === 'insights' && (
            <View>
              <View style={[s.insightsHeader, { backgroundColor: theme.card }]}>
                <LinearGradient colors={[Colors.primary, '#48CAE4']} style={s.insightsIcon}>
                  <Ionicons name="analytics" size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.insightsTitle, { color: theme.text }]}>{t('workoutTab.smartInsights')}</Text>
                  <Text style={[s.insightsSub, { color: theme.textMuted }]}>{t('workoutTab.aiAnalyzedFrom', { n: totalWorkoutCount })}</Text>
                </View>
              </View>
              {insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}

              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.performanceSummary')}</Text>
              <View style={[s.perfCard, { backgroundColor: theme.card }]}>
                {[
                  { label: t('workoutTab.perfTotalWorkouts'), value: totalWorkoutCount.toString(), icon: 'fitness-outline', color: Colors.primary },
                  { label: t('workoutTab.perfTotalVolume'), value: totalVolume > 0 ? t('workoutTab.volumeK', { n: (toDisplayWeight(totalVolume, weightUnit) / 1000).toFixed(1), unit: unitLabel(weightUnit) }) : formatVolume(0, weightUnit), icon: 'barbell-outline', color: Colors.accent },
                  { label: t('workoutTab.perfBestStreak'), value: t('workoutTab.daysValue', { n: streak }), icon: 'flame-outline', color: '#FFD93D' },
                  { label: t('workoutTab.perfAvgDuration'), value: t('workoutTab.minutesShort', { n: avgDuration }), icon: 'time-outline', color: '#48CAE4' },
                ].map((item, i) => (
                  <View key={i} style={[s.perfRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                      <Text style={[s.perfLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                    </View>
                    <Text style={[s.perfValue, { color: theme.text }]}>{item.value}</Text>
                  </View>
                ))}
              </View>

              {logsAsWorkouts.length >= 3 && (
                <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                  <View style={[s.weekChart, { backgroundColor: theme.card }]}>
                    <Text style={[s.weekChartTitle, { color: theme.text }]}>{t('workoutTab.thisWeekActivity')}</Text>
                    <View style={s.weekBars}>
                      {[
                        { key: 'Mon', label: t('workoutTab.weekdayMon') },
                        { key: 'Tue', label: t('workoutTab.weekdayTue') },
                        { key: 'Wed', label: t('workoutTab.weekdayWed') },
                        { key: 'Thu', label: t('workoutTab.weekdayThu') },
                        { key: 'Fri', label: t('workoutTab.weekdayFri') },
                        { key: 'Sat', label: t('workoutTab.weekdaySat') },
                        { key: 'Sun', label: t('workoutTab.weekdaySun') },
                      ].map((day, i) => {
                        const now = new Date();
                        const dayOfWeek = now.getDay();
                        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                        const targetDate = new Date(now);
                        targetDate.setDate(now.getDate() + mondayOffset + i);
                        const dateStr = targetDate.toISOString().split('T')[0];
                        const hasWorkout = logsAsWorkouts.some(w => w.date === dateStr);
                        const isToday = dateStr === now.toISOString().split('T')[0];
                        return (
                          <View key={day.key} style={s.weekBarCol}>
                            <View style={[s.weekBar, { backgroundColor: hasWorkout ? Colors.primary : theme.cardAlt, height: hasWorkout ? 40 : 16 }]} />
                            <Text style={[s.weekBarLabel, { color: isToday ? Colors.primary : theme.textMuted, fontFamily: isToday ? 'Rubik_600SemiBold' : 'Rubik_400Regular' }]}>{day.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              )}

              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.aiRecommendations')}</Text>
              {recommendations.map((rec, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(300).delay(400 + i * 60)}>
                  <View style={[s.recCard, { backgroundColor: theme.card }]}>
                    <View style={[s.recIcon, { backgroundColor: rec.color + '15' }]}>
                      <Ionicons name={rec.icon as any} size={18} color={rec.color} />
                    </View>
                    <Text style={[s.recText, { color: theme.textSecondary }]}>{rec.text}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* fixed start-workout FAB */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowStart(true); }}
        style={({ pressed }) => [s.fab, { bottom: insets.bottom + 78, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        accessibilityLabel={t('workoutTab.startWorkout')}
      >
        <Ionicons name="play" size={22} color="#04120B" />
        <Text style={s.fabText}>{t('workoutTab.startWorkout')}</Text>
      </Pressable>

      <ProgramOverviewModal visible={showOverview} onClose={() => setShowOverview(false)} />

      {/* start-workout chooser: program vs new */}
      <Modal visible={showStart} transparent animationType="fade" onRequestClose={() => setShowStart(false)}>
        <Pressable style={s.startOverlay} onPress={() => setShowStart(false)}>
          <Pressable style={[s.startSheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.startHandle}><View style={[s.startHandleBar, { backgroundColor: theme.border }]} /></View>
            <Text style={[s.startSheetTitle, { color: theme.text }]}>{t('workoutTab.startWorkout')}</Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowStart(false); router.push((activeEnrollment ? `/program/${activeEnrollment.programId}` : '/programs') as any); }}
              style={({ pressed }) => [s.startOpt, { borderColor: Colors.electric + '55', backgroundColor: pressed ? theme.cardAlt : theme.card }]}
            >
              <View style={[s.startOptIcon, { backgroundColor: Colors.electric + '18' }]}><Ionicons name="flag" size={20} color={Colors.electric} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.startOptTitle, { color: theme.text }]}>{t('workoutTab.startFromProgram', { defaultValue: 'Program' })}</Text>
                <Text style={[s.startOptSub, { color: theme.textMuted }]}>{activeEnrollment ? t('workoutTab.startFromProgramActiveSub', { defaultValue: 'Continue your active program' }) : t('workoutTab.startFromProgramSub', { defaultValue: 'Pick a program to follow' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowStart(false); router.push('/prepare-workout' as any); }}
              style={({ pressed }) => [s.startOpt, { borderColor: theme.border, backgroundColor: pressed ? theme.cardAlt : theme.card }]}
            >
              <View style={[s.startOptIcon, { backgroundColor: theme.cardAlt }]}><Ionicons name="add" size={22} color={theme.text} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.startOptTitle, { color: theme.text }]}>{t('workoutTab.startNewWorkout', { defaultValue: 'New workout' })}</Text>
                <Text style={[s.startOptSub, { color: theme.textMuted }]}>{t('workoutTab.startNewWorkoutSub', { defaultValue: 'Build a one-off session' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 28, fontFamily: 'Rubik_700Bold' },
  headerSub: { fontSize: 13, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  aiBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Rubik_700Bold' },
  aiSmallBadge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  startCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 8 },
  startCardInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  startLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Rubik_500Medium' },
  startTitle: { color: '#fff', fontSize: 24, fontFamily: 'Rubik_700Bold', marginBottom: 4 },
  startSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Rubik_400Regular', lineHeight: 18 },
  startPlayBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  startStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 },
  startStat: { flex: 1, alignItems: 'center' },
  startStatValue: { color: '#fff', fontSize: 18, fontFamily: 'Rubik_700Bold' },
  startStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  startStatDivider: { width: 1, height: 24, marginHorizontal: 8 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  tabText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  statCardWrap: { width: (SW - 50) / 2 },
  statCard: { borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Rubik_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  aiTipCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16 },
  aiTipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  aiTipBadge: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aiTipTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  aiTipText: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 21 },
  sectionTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  programsCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  programsCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  programsCardTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  programsCardSub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  prCard: { marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 14 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  prRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prRankText: { fontSize: 12, fontFamily: 'Rubik_700Bold' },
  prName: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  prDate: { fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  prWeight: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  prReps: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  recCard: {
    marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  recIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recText: { flex: 1, fontSize: 13, fontFamily: 'Rubik_400Regular', lineHeight: 19 },
  planPreview: { marginHorizontal: 20, borderRadius: 16, padding: 16, borderWidth: 1 },
  planPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  planPreviewTitle: { flex: 1, fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  planPreviewName: { fontSize: 18, fontFamily: 'Rubik_700Bold', marginBottom: 4 },
  planPreviewSub: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8,
    borderRadius: 14, padding: 14, gap: 12,
  },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  historyMeta: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  historyDate: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  emptyCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  emptySub: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  insightsHeader: {
    marginHorizontal: 20, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16,
  },
  insightsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  insightsSub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  insightCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insightTitle: { fontSize: 14, fontFamily: 'Rubik_600SemiBold', marginBottom: 2 },
  insightText: { fontSize: 13, fontFamily: 'Rubik_400Regular', lineHeight: 19 },
  perfCard: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  perfLabel: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  perfValue: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  weekChart: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16 },
  weekChartTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 16 },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekBarCol: { alignItems: 'center', gap: 6, flex: 1 },
  weekBar: { width: 20, borderRadius: 6, minHeight: 8 },
  weekBarLabel: { fontSize: 11 },
  inbodyHeader: {
    marginHorizontal: 20, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4,
  },
  addTestBtn: {},
  addTestBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addTestBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  inbodyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  inbodyStatWrap: { width: (SW - 50) / 2 },
  inbodyStat: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  inbodyStatIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inbodyStatValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  inbodyStatLabel: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  inbodyDate: { fontSize: 12, fontFamily: 'Rubik_400Regular', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  inbodyHistoryItem: {
    marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inbodyHistDate: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  inbodyHistStats: { flexDirection: 'row', gap: 12 },
  inbodyHistStat: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  deltaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4,
  },
  deltaText: { fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  historyCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14,
  },
  historyCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  latestBadgeText: { fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  historyTimeAgo: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  historyMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  historyMetric: { alignItems: 'center', gap: 2 },
  historyMetricVal: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  historyDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  totalProgressCard: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16,
  },
  totalProgressHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  totalProgressTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  totalProgressSub: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  totalProgressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  totalProgressItem: { alignItems: 'center', gap: 4 },
  totalProgressLabel: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  totalProgressValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  totalProgressDivider: { width: 1, height: 32 },
  noProgramCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16 },
  aiCoachCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16 },
  aiCoachIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  aiCoachTitle: { color: '#04120B', fontSize: 16, fontFamily: 'Rubik_700Bold' },
  aiCoachSub: { color: 'rgba(4,18,11,0.75)', fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2, lineHeight: 16 },
  fab: {
    position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.electric, paddingLeft: 18, paddingRight: 22, height: 54, borderRadius: 27,
    shadowColor: Colors.electric, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  fabText: { color: '#04120B', fontSize: 15, fontFamily: 'Rubik_700Bold', fontWeight: '800' },
  startOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  startSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 36, gap: 12 },
  startHandle: { alignItems: 'center', paddingBottom: 6 },
  startHandleBar: { width: 40, height: 4, borderRadius: 2 },
  startSheetTitle: { ...Type.h1, marginBottom: 2 },
  startOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  startOptIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  startOptTitle: { ...Type.bodyMed, fontWeight: '700' },
  startOptSub: { ...Type.caption, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '85%' },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  planSubtitle: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  planDayCard: { borderRadius: 14, padding: 14 },
  planDayHeader: { marginBottom: 10 },
  planDayName: { fontSize: 13, fontFamily: 'Rubik_700Bold', marginBottom: 2 },
  planDayFocus: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  planExerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  planExDot: { width: 6, height: 6, borderRadius: 3 },
  planExText: { fontSize: 13, fontFamily: 'Rubik_400Regular' },
  fieldLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  fieldInput: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: 'Rubik_500Medium', borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  resumeBanner: {
    marginHorizontal: 20, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  resumeBannerPulse: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  resumeBannerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff',
  },
  resumeBannerTitle: { color: '#fff', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  resumeBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  resumeBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  resumeBannerBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  heroSection: {
    marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  heroBadge: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  heroGreeting: { fontSize: 13, fontFamily: 'Rubik_400Regular' },
  heroName: { fontSize: 20, fontFamily: 'Rubik_700Bold', marginTop: 2 },
  heroMotivation: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 20, marginBottom: 16 },
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15, borderRadius: 14, marginBottom: 10,
  },
  primaryCtaText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_700Bold' },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  secondaryCtaText: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  ringsCard: { flexDirection: 'row', alignItems: 'center', gap: 20, marginHorizontal: 20, padding: 18, borderRadius: 20 },
  ringsLegend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendVal: { fontFamily: 'SpaceMono_700Bold', fontSize: 15, color: '#fff' },
  legendLabel: { fontFamily: 'Rubik_500Medium', fontSize: 12, flexShrink: 1 },
  quickStatsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  quickStatWrap: { flex: 1 },
  quickStatCard: { borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  quickStatIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickStatValue: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  quickStatLabel: { fontSize: 10, fontFamily: 'Rubik_500Medium' },
  recentCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14,
  },
  recentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  recentCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentCardName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  recentCardDate: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  recentCardStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  recentCardStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentCardStatText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  recentCardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  muscleTagText: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
});
