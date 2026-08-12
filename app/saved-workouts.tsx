import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, WorkoutTemplate, WorkoutLog } from '@/lib/app-context';
import { confirmDialog } from '@/lib/dialog';
import { Display, Chip, EmptyState } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import Colors from '@/constants/colors';

type Tab = 'templates' | 'history';

// Branded gradient used as the photo-led fallback tile on each card (matches PhotoTile).
const TILE_GRADIENT = ['#1A3A30', '#0C201A'] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return kg.toLocaleString('en-US') + ' kg';
  return kg + ' kg';
}

function getMuscleGroups(exercises: { muscleGroup: string }[]): string[] {
  const groups = new Set(exercises.map(e => e.muscleGroup));
  return Array.from(groups);
}

export default function SavedWorkoutsScreen() {
  const { t } = useTranslation();
  const { workoutTemplates, deleteWorkoutTemplate, workoutLogs, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  const handleDeleteTemplate = useCallback(async (template: WorkoutTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (await confirmDialog({ title: t('workoutSession.deleteTemplate'), message: t('workoutSession.deleteTemplateConfirm', { name: template.name }), destructive: true, confirmText: t('workoutSession.delete'), cancelText: t('workoutSession.cancel') })) {
      deleteWorkoutTemplate(template.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [deleteWorkoutTemplate, t]);

  const handleTemplatePress = useCallback((template: WorkoutTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/prepare-workout?templateId=${template.id}` as any);
  }, []);

  const handleLogPress = useCallback((log: WorkoutLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/workout-detail/${log.id}` as any);
  }, []);

  const sortedTemplates = [...workoutTemplates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'templates', label: t('workoutSession.templates'), icon: 'bookmark-outline' },
    { id: 'history', label: t('workoutSession.history'), icon: 'time-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>
          {t('workoutSession.myWorkouts')}
        </Display>
        <View style={styles.iconBtn} />
      </View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.tabContainer}>
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabButton, active && { backgroundColor: Colors.electric }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.id); }}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? '#04120B' : theme.textMuted}
                />
                <Text style={[styles.tabText, { color: active ? '#04120B' : theme.textMuted }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'templates' ? (
          sortedTemplates.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <EmptyState
                icon="bookmark-outline"
                title={t('workoutSession.noTemplatesYet')}
                subtitle={t('workoutSession.noTemplatesSubtext')}
              />
            </Animated.View>
          ) : (
            sortedTemplates.map((template, index) => {
              const muscles = getMuscleGroups(template.exercises);
              return (
                <Animated.View
                  key={template.id}
                  entering={FadeInDown.delay(150 + index * 80).duration(500)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => handleTemplatePress(template)}
                    onLongPress={() => handleDeleteTemplate(template)}
                  >
                    <View style={styles.cardTop}>
                      <LinearGradient
                        colors={TILE_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.thumb}
                      >
                        <Ionicons name="barbell" size={24} color={Colors.electric} />
                      </LinearGradient>

                      <View style={styles.cardTitleCol}>
                        <Display variant="d3" color={theme.text} numberOfLines={1}>
                          {template.name}
                        </Display>
                        <View style={styles.metaRow}>
                          <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted }]}>
                            {formatDate(template.createdAt)}
                          </Text>
                          <Text style={[styles.metaDot, { color: theme.textMuted }]}>·</Text>
                          <Ionicons name="list-outline" size={13} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted }]}>
                            {t('workoutSession.exerciseCount', { count: template.exercises.length })}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleDeleteTemplate(template)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.trashBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                      </Pressable>
                    </View>

                    {(template.workoutType || muscles.length > 0) && (
                      <View style={styles.chipRow}>
                        {template.workoutType && (
                          <View style={[styles.typePill, { backgroundColor: Colors.electric + '1A' }]}>
                            <Text style={[styles.typePillText, { color: Colors.electric }]}>
                              {template.workoutType}
                            </Text>
                          </View>
                        )}
                        {muscles.map((muscle) => (
                          <Chip key={muscle} label={muscle} />
                        ))}
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })
          )
        ) : (
          sortedLogs.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <EmptyState
                icon="fitness-outline"
                title={t('workoutSession.noWorkoutsYet')}
                subtitle={t('workoutSession.noWorkoutsSubtext')}
              />
            </Animated.View>
          ) : (
            sortedLogs.map((log, index) => {
              const muscles = getMuscleGroups(log.exercises);
              return (
                <Animated.View
                  key={log.id}
                  entering={FadeInDown.delay(150 + index * 80).duration(500)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => handleLogPress(log)}
                  >
                    <View style={styles.cardTop}>
                      <LinearGradient
                        colors={TILE_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.thumb}
                      >
                        <Ionicons name="checkmark-circle" size={24} color={Colors.electric} />
                      </LinearGradient>

                      <View style={styles.cardTitleCol}>
                        <Display variant="d3" color={theme.text} numberOfLines={1}>
                          {log.name}
                        </Display>
                        <View style={styles.metaRow}>
                          <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted }]}>
                            {formatDate(log.date)}
                          </Text>
                          <Text style={[styles.metaDot, { color: theme.textMuted }]}>·</Text>
                          <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted }]}>
                            {formatDuration(log.durationMinutes)}
                          </Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </View>

                    <View style={styles.logStatsRow}>
                      <View style={[styles.logStat, { backgroundColor: theme.cardAlt }]}>
                        <Text style={[styles.logStatValue, { color: theme.text }]}>
                          {formatVolume(log.totalVolumeKg)}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.volume')}</Text>
                      </View>
                      <View style={[styles.logStat, { backgroundColor: theme.cardAlt }]}>
                        <Text style={[styles.logStatValue, { color: theme.text }]}>
                          {log.exercises.length}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.exercises')}</Text>
                      </View>
                      <View style={[styles.logStat, { backgroundColor: theme.cardAlt }]}>
                        <Text style={[styles.logStatValue, { color: Colors.electric }]}>
                          {log.completedSets}/{log.totalSets}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.sets')}</Text>
                      </View>
                    </View>

                    {(log.workoutType || muscles.length > 0) && (
                      <View style={styles.chipRow}>
                        {log.workoutType && (
                          <View style={[styles.typePill, { backgroundColor: Colors.electric + '1A' }]}>
                            <Text style={[styles.typePillText, { color: Colors.electric }]}>
                              {log.workoutType}
                            </Text>
                          </View>
                        )}
                        {muscles.map((muscle) => (
                          <Chip key={muscle} label={muscle} />
                        ))}
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleCol: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  metaDot: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginHorizontal: 1,
  },
  trashBtn: {
    padding: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  typePill: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  logStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  logStat: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  logStatValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  logStatLabel: {
    ...Type.caption,
  },
});
