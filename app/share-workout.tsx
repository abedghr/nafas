import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, LogExercise } from '@/lib/app-context';
import Colors from '@/constants/colors';

type CardStyle = 'dark' | 'gradient' | 'light';

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

function getExerciseBestSet(exercise: LogExercise): { weight: number; reps: number; name: string } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const set of exercise.sets) {
    if (set.status === 'done' && set.actual?.weight && set.actual?.reps) {
      if (!best || set.actual.weight > best.weight) {
        best = { weight: set.actual.weight, reps: set.actual.reps };
      }
    }
  }
  return best ? { ...best, name: exercise.name } : null;
}

interface CardStyleConfig {
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  accentColor: string;
}

function getCardStyleConfig(style: CardStyle, isDark: boolean): CardStyleConfig {
  if (style === 'dark') {
    return {
      backgroundColor: '#0A0A0F',
      textColor: '#FFFFFF',
      secondaryTextColor: '#9B9BB0',
      borderColor: '#2A2A3E',
      accentColor: '#00C896',
    };
  } else if (style === 'gradient') {
    return {
      backgroundColor: '#00C896',
      textColor: '#FFFFFF',
      secondaryTextColor: '#E0E0E0',
      borderColor: '#009B78',
      accentColor: '#FFFFFF',
    };
  } else {
    return {
      backgroundColor: '#F5F5FA',
      textColor: '#111118',
      secondaryTextColor: '#6B6B80',
      borderColor: '#E5E5EE',
      accentColor: '#00C896',
    };
  }
}

function ShareCard({
  style,
  currentLog,
  comparison,
  topLift,
  user,
  isDark,
}: {
  style: CardStyle;
  currentLog: any;
  comparison: any;
  topLift: any;
  user: any;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  const styleConfig = getCardStyleConfig(style, isDark);
  const exerciseNames = currentLog.exercises.map((e: any) => e.name).join(' · ');

  const isGradient = style === 'gradient';

  const cardContent = (
    <View style={[styles.cardInner, { backgroundColor: isGradient ? undefined : styleConfig.backgroundColor }]}>
      {/* Header with logo */}
      <View style={styles.cardHeader}>
        <Text style={[styles.nafasLogo, { color: styleConfig.accentColor }]}>نَفَس</Text>
      </View>

      {/* Title and date */}
      <Text style={[styles.workoutName, { color: styleConfig.textColor }]}>{currentLog.name}</Text>
      <Text style={[styles.dateTime, { color: styleConfig.secondaryTextColor }]}>
        {formatDate(currentLog.date)}{currentLog.startTime && !isNaN(new Date(currentLog.startTime).getTime()) ? ` · ${formatTime(currentLog.startTime)}` : ''}
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { borderTopColor: styleConfig.secondaryTextColor }]} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: styleConfig.textColor }]}>{formatDuration(currentLog.durationMinutes)}</Text>
          <Text style={[styles.statLabel, { color: styleConfig.secondaryTextColor }]}>{t('workoutSession.duration')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: styleConfig.textColor }]}>{formatVolume(currentLog.totalVolumeKg)}</Text>
          <Text style={[styles.statLabel, { color: styleConfig.secondaryTextColor }]}>{t('workoutSession.volume')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: styleConfig.textColor }]}>{t('workoutSession.setsValue', { n: currentLog.completedSets })}</Text>
          <Text style={[styles.statLabel, { color: styleConfig.secondaryTextColor }]}>{t('workoutSession.completed')}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { borderTopColor: styleConfig.secondaryTextColor }]} />

      {/* Exercises list */}
      <Text style={[styles.exercisesText, { color: styleConfig.textColor }]}>{exerciseNames}</Text>

      {/* Divider */}
      <View style={[styles.divider, { borderTopColor: styleConfig.secondaryTextColor }]} />

      {/* Top lift and comparison */}
      {topLift && (
        <Text style={[styles.topLiftText, { color: styleConfig.textColor }]}>
          {t('workoutSession.topLift', { name: topLift.name, weight: topLift.weight })}
        </Text>
      )}
      {comparison ? (
        <Text style={[styles.comparisonText, { color: styleConfig.accentColor }]}>
          {t('workoutSession.volumeVsLastSession', { arrow: comparison.volumePct >= 0 ? '▲' : '▼', pct: Math.abs(parseFloat(comparison.volumePct)).toFixed(1) })}
        </Text>
      ) : (
        <Text style={[styles.comparisonText, { color: styleConfig.accentColor }]}>{t('workoutSession.firstTime')}</Text>
      )}

      {/* Divider */}
      <View style={[styles.divider, { borderTopColor: styleConfig.secondaryTextColor }]} />

      {/* Username */}
      <Text style={[styles.usernameText, { color: styleConfig.secondaryTextColor }]}>@{user?.username || 'user'}</Text>
    </View>
  );

  if (isGradient) {
    return (
      <LinearGradient
        colors={['#00C896', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card]}
      >
        {cardContent}
      </LinearGradient>
    );
  }

  return <View style={[styles.card]}>{cardContent}</View>;
}

export default function ShareWorkoutScreen() {
  const { t } = useTranslation();
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { workoutLogs, user, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const [cardStyle, setCardStyle] = useState<CardStyle>('dark');

  const currentLog = useMemo(() => {
    return workoutLogs.find((l) => l.id === logId) || null;
  }, [workoutLogs, logId]);

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
    return { volumeDiff, volumePct };
  }, [currentLog, previousLog]);

  const topLift = useMemo(() => {
    if (!currentLog) return null;
    let best: any = null;
    for (const ex of currentLog.exercises) {
      const exBest = getExerciseBestSet(ex);
      if (exBest && (!best || exBest.weight > best.weight)) {
        best = exBest;
      }
    }
    return best;
  }, [currentLog]);

  const handlePostToCommunity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('workoutSession.comingSoon'), t('workoutSession.postToCommunitySoon'));
  };

  const handleSaveToGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('workoutSession.imageSaved'), t('workoutSession.imageSavedMessage'));
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPadding }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card Preview */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <ShareCard
            style={cardStyle}
            currentLog={currentLog}
            comparison={comparison}
            topLift={topLift}
            user={user}
            isDark={isDark}
          />
        </Animated.View>

        {/* Style Picker */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.stylePickerContainer}>
          <Text style={[styles.stylePickerLabel, { color: theme.text }]}>{t('workoutSession.cardStyle')}</Text>
          <View style={styles.stylePicker}>
            {(['dark', 'gradient', 'light'] as const).map((style) => (
              <TouchableOpacity
                key={style}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCardStyle(style);
                }}
                style={[
                  styles.styleButton,
                  cardStyle === style && { borderColor: Colors.primary, borderWidth: 2 },
                  cardStyle !== style && { borderWidth: 1, borderColor: theme.border },
                  { backgroundColor: cardStyle === style ? theme.card : theme.surface },
                ]}
              >
                <Text
                  style={[
                    styles.styleButtonText,
                    { color: cardStyle === style ? Colors.primary : theme.textSecondary },
                  ]}
                >
                  {t(`workoutSession.cardStyleOption.${style}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handlePostToCommunity}
            style={[
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: Colors.primary },
            ]}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>{t('workoutSession.postToCommunity')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveToGallery}
            style={[
              styles.actionButton,
              styles.secondaryButton,
              { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
            ]}
          >
            <Ionicons name="download-outline" size={20} color={theme.text} style={styles.buttonIcon} />
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>{t('workoutSession.saveToGallery')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            style={[
              styles.actionButton,
              { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
            ]}
          >
            <Ionicons name="checkmark-outline" size={20} color={theme.text} style={styles.buttonIcon} />
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>{t('workoutSession.done')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    marginTop: 32,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardInner: {
    padding: 24,
  },
  cardHeader: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  nafasLogo: {
    fontSize: 20,
    fontWeight: '600',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    marginBottom: 16,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  exercisesText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginVertical: 4,
  },
  topLiftText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  stylePickerContainer: {
    marginBottom: 24,
  },
  stylePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  stylePicker: {
    flexDirection: 'row',
    gap: 12,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryButton: {
    shadowColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {},
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
