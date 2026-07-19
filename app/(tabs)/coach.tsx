import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
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

function generateAIPlan(goal: string, interests: string[], t: (key: string, opts?: any) => string) {
  const D = {
    mon: t('workoutTab.dayMonday'), tue: t('workoutTab.dayTuesday'), wed: t('workoutTab.dayWednesday'),
    thu: t('workoutTab.dayThursday'), fri: t('workoutTab.dayFriday'), satSun: t('workoutTab.daySatSun'),
  };
  const plans: Record<string, { name: string; days: { day: string; focus: string; exercises: string[] }[] }> = {
    build_muscle: {
      name: t('workoutTab.planHypertrophyName'),
      days: [
        { day: D.mon, focus: t('workoutTab.focusPushChestShoulders'), exercises: ['Bench Press 4x8-10', 'Overhead Press 3x10', 'Incline DB Press 3x12', 'Lateral Raises 3x15', 'Tricep Dips 3x12'] },
        { day: D.tue, focus: t('workoutTab.focusPullBackBiceps'), exercises: ['Deadlift 4x6-8', 'Pull Ups 4x8-10', 'Barbell Row 3x10', 'Face Pulls 3x15', 'Bicep Curls 3x12'] },
        { day: D.wed, focus: t('workoutTab.focusRestActiveRecovery'), exercises: ['Light stretching', '15-20 min walk', 'Foam rolling'] },
        { day: D.thu, focus: t('workoutTab.focusLegsCore'), exercises: ['Squats 4x8-10', 'Romanian Deadlift 3x10', 'Leg Press 3x12', 'Calf Raises 4x15', 'Plank 3x60s'] },
        { day: D.fri, focus: t('workoutTab.focusUpperBodyPower'), exercises: ['Bench Press 5x5', 'Barbell Row 5x5', 'Overhead Press 4x8', 'Pull Ups 4x8', 'Cable Flyes 3x15'] },
        { day: D.satSun, focus: t('workoutTab.focusRest'), exercises: ['Full recovery', 'Meal prep', 'Light mobility work'] },
      ],
    },
    lose_weight: {
      name: t('workoutTab.planFatBurnerName'),
      days: [
        { day: D.mon, focus: t('workoutTab.focusFullBodyCircuit'), exercises: ['Squats 3x15', 'Push Ups 3x15', 'Rows 3x15', 'Lunges 3x12/leg', 'Plank 3x45s'] },
        { day: D.tue, focus: t('workoutTab.focusHiitCardio'), exercises: ['30s sprints x 8', 'Burpees 4x10', 'Jump Squats 4x12', 'Mountain Climbers 4x20', 'Cool-down walk 10min'] },
        { day: D.wed, focus: t('workoutTab.focusUpperBodyCore'), exercises: ['Bench Press 3x12', 'Pull Ups 3x10', 'Shoulder Press 3x12', 'Russian Twists 3x20', 'Bicycle Crunches 3x20'] },
        { day: D.thu, focus: t('workoutTab.focusActiveRecovery'), exercises: ['30 min walk/jog', 'Yoga/stretching 20 min', 'Foam rolling'] },
        { day: D.fri, focus: t('workoutTab.focusLowerBodyHiit'), exercises: ['Deadlift 3x10', 'Leg Press 3x15', 'Walking Lunges 3x12', 'Box Jumps 4x8', 'Tabata finisher 4 min'] },
        { day: D.satSun, focus: t('workoutTab.focusLightActivity'), exercises: ['Outdoor walk 30+ min', 'Light sports/swimming', 'Stretching'] },
      ],
    },
    improve_fitness: {
      name: t('workoutTab.planGeneralFitnessName'),
      days: [
        { day: D.mon, focus: t('workoutTab.focusStrengthConditioning'), exercises: ['Squats 3x10', 'Bench Press 3x10', 'Rows 3x10', '20 min moderate cardio'] },
        { day: D.tue, focus: t('workoutTab.focusCardioMobility'), exercises: ['30 min run/bike', 'Dynamic stretching', 'Core work 15 min'] },
        { day: D.wed, focus: t('workoutTab.focusUpperBody'), exercises: ['Overhead Press 3x10', 'Pull Ups 3x8', 'Dips 3x10', 'Face Pulls 3x15', 'Farmer Walks 3x40m'] },
        { day: D.thu, focus: t('workoutTab.focusRest'), exercises: ['Light walk', 'Stretching', 'Recovery'] },
        { day: D.fri, focus: t('workoutTab.focusLowerBody'), exercises: ['Deadlift 3x8', 'Leg Press 3x12', 'Lunges 3x10', 'Calf Raises 3x15', 'Plank 3x60s'] },
        { day: D.satSun, focus: t('workoutTab.focusActiveFun'), exercises: ['Sports/outdoor activity', 'Light cardio', 'Mobility work'] },
      ],
    },
    learn_skill: {
      name: t('workoutTab.planSkillBuilderName'),
      days: [
        { day: D.mon, focus: t('workoutTab.focusSkillPractice'), exercises: ['Handstand work 20 min', 'L-Sit progressions 4x20s', 'Pull Ups 4x6-8', 'Core work 15 min'] },
        { day: D.tue, focus: t('workoutTab.focusStrengthBase'), exercises: ['Dips 4x8', 'Rows 4x10', 'Push Ups 4x15', 'Squats 3x10'] },
        { day: D.wed, focus: t('workoutTab.focusActiveRecovery'), exercises: ['Stretching 30 min', 'Wrist conditioning', 'Light cardio 20 min'] },
        { day: D.thu, focus: t('workoutTab.focusSkillStrength'), exercises: ['Muscle-up progressions 5x3', 'Front lever work 4x10s', 'Hollow body holds 4x30s', 'Planche leans 4x15s'] },
        { day: D.fri, focus: t('workoutTab.focusFullBody'), exercises: ['Deadlift 3x8', 'Overhead Press 3x10', 'Pull Ups 4x8', 'Pistol squat practice 3x5'] },
        { day: D.satSun, focus: t('workoutTab.focusPlayRest'), exercises: ['Free skill practice', 'Flexibility work', 'Full rest day'] },
      ],
    },
  };
  return plans[goal] || plans.improve_fitness;
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
  const { isDark } = useApp();
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
            {t('workoutTab.exercisesCount', { n: workout.exercises?.length || 0 })}  ·  {t('workoutTab.minutesShort', { n: workout.duration })}  ·  {workout.totalVolume > 0 ? t('workoutTab.volumeK', { n: (workout.totalVolume / 1000).toFixed(1) }) : ''}
          </Text>
        </View>
        <Text style={[s.historyDate, { color: theme.textMuted }]}>{workout.date}</Text>
      </View>
    </Animated.View>
  );
}

function PlanModal({ visible, onClose, plan }: { visible: boolean; onClose: () => void; plan: ReturnType<typeof generateAIPlan> | null }) {
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  if (!plan) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.aiSmallBadge}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                </LinearGradient>
                <Text style={[s.modalTitle, { color: theme.text }]}>{plan.name}</Text>
              </View>
              <Text style={[s.planSubtitle, { color: theme.textMuted }]}>{t('workoutTab.aiGeneratedWeeklyPlan')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
            {plan.days.map((day, i) => (
              <Animated.View key={day.day} entering={FadeInDown.duration(300).delay(i * 60)}>
                <View style={[s.planDayCard, { backgroundColor: theme.card }]}>
                  <View style={s.planDayHeader}>
                    <Text style={[s.planDayName, { color: Colors.primary }]}>{day.day}</Text>
                    <Text style={[s.planDayFocus, { color: theme.text }]}>{day.focus}</Text>
                  </View>
                  {day.exercises.map((ex, j) => (
                    <View key={j} style={s.planExerciseRow}>
                      <View style={[s.planExDot, { backgroundColor: Colors.primary }]} />
                      <Text style={[s.planExText, { color: theme.textSecondary }]}>{ex}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatVolume(kg: number) {
  if (kg <= 0) return '0 kg';
  return `${kg.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg`;
}

function RecentWorkoutCard({ log, index }: { log: any; index: number }) {
  const { t } = useTranslation();
  const { isDark } = useApp();
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
              <Text style={[s.recentCardStatText, { color: theme.textSecondary }]}>{formatVolume(log.totalVolumeKg)}</Text>
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
  const { isDark, workouts, weeklyWorkouts, streak, user, workoutLogs, activeSession } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights'>('dashboard');
  const [showPlanModal, setShowPlanModal] = useState(false);
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
  const plan = useMemo(() => generateAIPlan(user?.goal || 'improve_fitness', user?.interests || [], t), [user?.goal, user?.interests, t]);
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
  const [prs, setPrs] = useState<{ name: string; weight: number; reps: number; date: string }[]>([]);
  useEffect(() => { workoutApi.prs(5).then(setPrs).catch(() => {}); }, [workoutLogs.length]);

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
          <View style={s.header}>
            <View>
              <View style={s.headerTitleRow}>
                <LinearGradient colors={[Colors.primary, '#48CAE4']} style={s.aiBadge}>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                  <Text style={s.aiBadgeText}>AI</Text>
                </LinearGradient>
                <Text style={[s.headerTitle, { color: theme.text }]}>{t('workoutTab.headerTitle')}</Text>
              </View>
              <Text style={[s.headerSub, { color: theme.textMuted }]}>{t('workoutTab.headerSub')}</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPlanModal(true); }}
              style={[s.headerBtn, { backgroundColor: theme.card }]}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>

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
            <View>
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

              <Animated.View entering={FadeInDown.duration(500)}>
                <View style={[s.heroSection, { backgroundColor: theme.card }]}>
                  <View style={s.heroTopRow}>
                    <LinearGradient colors={[Colors.primary, '#48CAE4']} style={s.heroBadge}>
                      <Ionicons name="sparkles" size={18} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.heroGreeting, { color: theme.textMuted }]}>
                        {new Date().getHours() < 12 ? t('workoutTab.goodMorning') : new Date().getHours() < 18 ? t('workoutTab.goodAfternoon') : t('workoutTab.goodEvening')}
                      </Text>
                      <Text style={[s.heroName, { color: theme.text }]}>{user?.name || t('workoutTab.athlete')}</Text>
                    </View>
                  </View>
                  <Text style={[s.heroMotivation, { color: theme.textSecondary }]}>
                    {streak >= 3 ? t('workoutTab.heroStreakMotivation', { n: streak }) : t('workoutTab.heroReadyMotivation')}
                  </Text>

                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/prepare-workout' as any); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={s.primaryCta}
                    >
                      <Ionicons name="flash" size={20} color="#fff" />
                      <Text style={s.primaryCtaText}>{t('workoutTab.startWorkout')}</Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved-workouts' as any); }}
                    style={({ pressed }) => [s.secondaryCta, { borderColor: Colors.primary + '40', opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Ionicons name="library-outline" size={18} color={Colors.primary} />
                    <Text style={[s.secondaryCtaText, { color: Colors.primary }]}>{t('workoutTab.myWorkouts')}</Text>
                  </Pressable>
                </View>
              </Animated.View>

              <View style={s.quickStatsRow}>
                {[
                  { icon: 'flame-outline' as const, label: t('workoutTab.statThisWeek'), value: weeklyWorkouts.toString(), color: Colors.accent },
                  { icon: 'barbell-outline' as const, label: t('workoutTab.statVolume'), value: weeklyVolumeFromLogs > 0 ? formatVolume(weeklyVolumeFromLogs) : '0 kg', color: Colors.primary },
                  { icon: 'flash-outline' as const, label: t('workoutTab.statStreak'), value: `${streak}d`, color: '#FFD93D' },
                ].map((stat, i) => (
                  <Animated.View key={stat.label} entering={FadeInDown.duration(400).delay(100 + i * 80)} style={s.quickStatWrap}>
                    <View style={[s.quickStatCard, { backgroundColor: theme.card }]}>
                      <View style={[s.quickStatIcon, { backgroundColor: stat.color + '15' }]}>
                        <Ionicons name={stat.icon} size={18} color={stat.color} />
                      </View>
                      <Text style={[s.quickStatValue, { color: theme.text }]}>{stat.value}</Text>
                      <Text style={[s.quickStatLabel, { color: theme.textMuted }]}>{stat.label}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>

              {prs.length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.personalRecords')}</Text>
                  <View style={[s.prCard, { backgroundColor: theme.card }]}>
                    {prs.map((pr, i) => (
                      <View key={pr.name} style={[s.prRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
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
                        <Text style={[s.prWeight, { color: Colors.primary }]}>{pr.weight} {t('workoutSession.kg')}</Text>
                        <Text style={[s.prReps, { color: theme.textMuted }]}> × {pr.reps}</Text>
                      </View>
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
                  { label: t('workoutTab.perfTotalVolume'), value: totalVolume > 0 ? t('workoutTab.volumeK', { n: (totalVolume / 1000).toFixed(1) }) : '0 kg', icon: 'barbell-outline', color: Colors.accent },
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

              <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPlanModal(true); }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <LinearGradient colors={['#1C1C2E', '#232338']} style={[s.planPreview, { borderColor: Colors.primary + '30' }]}>
                    <View style={s.planPreviewHeader}>
                      <LinearGradient colors={[Colors.primary, '#48CAE4']} style={s.aiSmallBadge}>
                        <Ionicons name="sparkles" size={12} color="#fff" />
                      </LinearGradient>
                      <Text style={[s.planPreviewTitle, { color: theme.text }]}>{t('workoutTab.aiWeeklyPlan')}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </View>
                    <Text style={[s.planPreviewName, { color: Colors.primary }]}>{plan.name}</Text>
                    <Text style={[s.planPreviewSub, { color: theme.textMuted }]}>{t('workoutTab.planPreviewSub', { n: plan.days.length })}</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </View>
      </ScrollView>

      <PlanModal visible={showPlanModal} onClose={() => setShowPlanModal(false)} plan={plan} />
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
  sectionTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
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
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16,
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
