import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, WorkoutTemplate, WorkoutLog } from '@/lib/app-context';
import Colors from '@/constants/colors';

type Tab = 'templates' | 'history';

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

  const handleDeleteTemplate = useCallback((template: WorkoutTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('workoutSession.deleteTemplate'),
      t('workoutSession.deleteTemplateConfirm', { name: template.name }),
      [
        { text: t('workoutSession.cancel'), style: 'cancel' },
        {
          text: t('workoutSession.delete'),
          style: 'destructive',
          onPress: () => {
            deleteWorkoutTemplate(template.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('workoutSession.myWorkouts')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.tabContainer}>
        <View style={[styles.tabBar, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]}
            onPress={() => setActiveTab('templates')}
          >
            <LinearGradient
              colors={activeTab === 'templates' ? [Colors.primary, '#00A87A'] : ['transparent', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Ionicons
                name="bookmark-outline"
                size={16}
                color={activeTab === 'templates' ? '#FFF' : theme.textMuted}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'templates' ? '#FFF' : theme.textMuted }
              ]}>
                {t('workoutSession.templates')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <LinearGradient
              colors={activeTab === 'history' ? [Colors.primary, '#00A87A'] : ['transparent', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={activeTab === 'history' ? '#FFF' : theme.textMuted}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'history' ? '#FFF' : theme.textMuted }
              ]}>
                {t('workoutSession.history')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'templates' ? (
          sortedTemplates.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
                <Ionicons name="bookmark-outline" size={36} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>{t('workoutSession.noTemplatesYet')}</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                {t('workoutSession.noTemplatesSubtext')}
              </Text>
            </Animated.View>
          ) : (
            sortedTemplates.map((template, index) => {
              const muscles = getMuscleGroups(template.exercises);
              return (
                <Animated.View
                  key={template.id}
                  entering={FadeInDown.delay(150 + index * 80).duration(500)}
                >
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.card }]}
                    onPress={() => handleTemplatePress(template)}
                    onLongPress={() => handleDeleteTemplate(template)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {template.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteTemplate(template)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {template.workoutType && (
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={[styles.tag, { backgroundColor: Colors.accent + '18' }]}>
                          <Text style={[styles.tagText, { color: Colors.accent }]}>{template.workoutType}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textMuted }]}>
                          {formatDate(template.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="list-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textMuted }]}>
                          {t('workoutSession.exerciseCount', { count: template.exercises.length })}
                        </Text>
                      </View>
                    </View>

                    {muscles.length > 0 && (
                      <View style={styles.tagRow}>
                        {muscles.map((muscle) => (
                          <View key={muscle} style={[styles.tag, { backgroundColor: Colors.primary + '18' }]}>
                            <Text style={[styles.tagText, { color: Colors.primary }]}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )
        ) : (
          sortedLogs.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
                <Ionicons name="fitness-outline" size={36} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>{t('workoutSession.noWorkoutsYet')}</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                {t('workoutSession.noWorkoutsSubtext')}
              </Text>
            </Animated.View>
          ) : (
            sortedLogs.map((log, index) => {
              const muscles = getMuscleGroups(log.exercises);
              return (
                <Animated.View
                  key={log.id}
                  entering={FadeInDown.delay(150 + index * 80).duration(500)}
                >
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.card }]}
                    onPress={() => handleLogPress(log)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {log.name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </View>

                    {log.workoutType && (
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={[styles.tag, { backgroundColor: Colors.accent + '18' }]}>
                          <Text style={[styles.tagText, { color: Colors.accent }]}>{log.workoutType}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textMuted }]}>
                          {formatDate(log.date)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textMuted }]}>
                          {formatDuration(log.durationMinutes)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logStatsRow}>
                      <View style={[styles.logStat, { backgroundColor: theme.background + '80' }]}>
                        <Text style={[styles.logStatValue, { color: theme.text }]}>
                          {formatVolume(log.totalVolumeKg)}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.volume')}</Text>
                      </View>
                      <View style={[styles.logStat, { backgroundColor: theme.background + '80' }]}>
                        <Text style={[styles.logStatValue, { color: theme.text }]}>
                          {log.exercises.length}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.exercises')}</Text>
                      </View>
                      <View style={[styles.logStat, { backgroundColor: theme.background + '80' }]}>
                        <Text style={[styles.logStatValue, { color: theme.text }]}>
                          {log.completedSets}/{log.totalSets}
                        </Text>
                        <Text style={[styles.logStatLabel, { color: theme.textMuted }]}>{t('workoutSession.sets')}</Text>
                      </View>
                    </View>

                    {muscles.length > 0 && (
                      <View style={styles.tagRow}>
                        {muscles.map((muscle) => (
                          <View key={muscle} style={[styles.tag, { backgroundColor: Colors.primary + '18' }]}>
                            <Text style={[styles.tagText, { color: Colors.primary }]}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 11,
    overflow: 'hidden',
  },
  tabButtonActive: {},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  logStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  logStat: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  logStatValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  logStatLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
