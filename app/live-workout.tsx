import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
  TextInput, Alert, Dimensions, Switch, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import { toDisplayWeight, fromDisplayWeight, unitLabel } from '@/lib/units';
import Colors from '@/constants/colors';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { workoutApi } from '@/src/features/workout/api';
import ComboBuilderModal, { componentToSetConfig, type ComboBuildResult } from '@/components/ComboBuilderModal';
import ExerciseRow from '@/components/ExerciseRow';
import ExerciseFilterBar from '@/components/ExerciseFilterBar';
import { matchExercise } from '@/lib/exercise-search';
import * as Crypto from 'expo-crypto';
import type { SetConfig, ActiveSession, LogExercise, LogSetData } from '@/lib/app-context';

const { width: SW } = Dimensions.get('window');
const PREP_SECONDS = 10;

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`; // drop leading hours until an hour in
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type SessionExercise = ActiveSession['exercises'][number];
type SessionSet = SessionExercise['sets'][number];

function RepsSetRow({ set, setIndex, onMarkDone, onSkip, onUpdateActual, onReopen, theme }: {
  set: SessionSet;
  setIndex: number;
  onMarkDone: () => void;
  onSkip: () => void;
  onUpdateActual: (actual: SetConfig) => void;
  onReopen: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { weightUnit } = useApp();
  const narrow = width < 380;
  const [editReps, setEditReps] = useState(String(set.actual.reps || set.config.reps || ''));
  const [editWeight, setEditWeight] = useState(() => {
    const kg = set.actual.weight ?? set.config.weight;
    return kg == null ? '' : String(toDisplayWeight(kg, weightUnit));
  });

  const isDone = set.status === 'done';
  const isSkipped = set.status === 'skipped';
  const isInProgress = set.status === 'in_progress';
  const bgColor = isDone ? Colors.primary + '10' : isSkipped ? theme.surface + '80' : isInProgress ? Colors.primary + '08' : 'transparent';
  const borderColor = isInProgress ? Colors.primary + '40' : 'transparent';

  const complete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const parsedWeight = parseFloat(editWeight);
    onUpdateActual({
      ...set.actual,
      reps: parseInt(editReps) || set.config.reps || 0,
      weight: parsedWeight ? fromDisplayWeight(parsedWeight, weightUnit) : set.config.weight || 0,
    });
    onMarkDone();
  };

  const confirmSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Alert.alert is a no-op on react-native-web → use window.confirm there.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('workoutSession.skipSetConfirm', { n: setIndex + 1 }))) onSkip();
      return;
    }
    Alert.alert(t('workoutSession.skipSet'), t('workoutSession.skipSetConfirm', { n: setIndex + 1 }), [
      { text: t('workoutSession.cancel'), style: 'cancel' },
      { text: t('workoutSession.skip'), style: 'destructive', onPress: onSkip },
    ]);
  };

  // done / skipped → compact summary row; tap to reopen for editing
  if (isDone || isSkipped) {
    return (
      <Pressable onPress={onReopen} style={[styles.setRow, { backgroundColor: bgColor }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name={isDone ? 'checkmark-circle' : 'close-circle'} size={20} color={isDone ? Colors.primary : theme.textMuted} />
          <Text style={[styles.setLabel, { color: isSkipped ? theme.textMuted : theme.text }, isSkipped && styles.strikethrough]}>
            {t('workoutSession.setN', { n: setIndex + 1 })}
          </Text>
        </View>
        <View style={styles.setRowRight}>
          {!isSkipped && (
            <Text style={[styles.setValue, { color: theme.textSecondary }]}>
              {set.actual.reps} × {toDisplayWeight(set.actual.weight || 0, weightUnit)} {unitLabel(weightUnit)}
            </Text>
          )}
          <View style={[styles.doneBadge, { backgroundColor: isDone ? Colors.primary + '20' : theme.surface }]}>
            <Text style={[styles.doneBadgeText, { color: isDone ? Colors.primary : theme.textMuted }]}>{isDone ? t('workoutSession.done') : t('workoutSession.skip')}</Text>
          </View>
          <Ionicons name="pencil" size={13} color={theme.textMuted} style={{ marginLeft: 2 }} />
        </View>
      </Pressable>
    );
  }

  // pending → inline inputs, one-tap confirm. On narrow screens the controls drop to a 2nd line.
  const controls = (
    <View style={[styles.inlineEditRow, narrow && styles.inlineEditRowWide]}>
      <View style={styles.inlineField}>
        <Text style={[styles.inlineUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
        <TextInput
          style={[styles.inlineInput, narrow && styles.inlineInputWide, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          value={editReps} onChangeText={setEditReps} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
        />
      </View>
      <Text style={[styles.editX, { color: theme.textMuted }]}>×</Text>
      <View style={styles.inlineField}>
        <Text style={[styles.inlineUnit, { color: theme.textMuted }]}>{unitLabel(weightUnit)}</Text>
        <TextInput
          style={[styles.inlineInput, narrow && styles.inlineInputWide, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
        />
      </View>
      <Pressable onPress={complete} hitSlop={12} style={[styles.doneBtn, narrow && styles.doneBtnWide, { backgroundColor: Colors.primary }]}>
        <Ionicons name="checkmark" size={18} color="#fff" />
      </Pressable>
      <Pressable onPress={confirmSkip} hitSlop={12} style={styles.skipBtn}>
        <Ionicons name="close" size={18} color="#F87171" />
      </Pressable>
    </View>
  );

  if (narrow) {
    return (
      <View style={[styles.setRowCol, { backgroundColor: bgColor, borderLeftColor: borderColor, borderLeftWidth: isInProgress ? 3 : 0 }]}>
        <View style={styles.setRowLeft}>
          <View style={[styles.setCircle, { borderColor: theme.border }]}>
            <Text style={[styles.setCircleText, { color: theme.textMuted }]}>{setIndex + 1}</Text>
          </View>
          <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.setN', { n: setIndex + 1 })}</Text>
        </View>
        {controls}
      </View>
    );
  }

  return (
    <View style={[styles.setRow, { backgroundColor: bgColor, borderLeftColor: borderColor, borderLeftWidth: isInProgress ? 3 : 0 }]}>
      <View style={styles.setRowLeft}>
        <View style={[styles.setCircle, { borderColor: theme.border }]}>
          <Text style={[styles.setCircleText, { color: theme.textMuted }]}>{setIndex + 1}</Text>
        </View>
        <Text style={[styles.setLabel, { color: theme.text }]} numberOfLines={1}>{t('workoutSession.setN', { n: setIndex + 1 })}</Text>
      </View>
      {controls}
    </View>
  );
}

function HoldSetRow({ set, setIndex, onMarkDone, onSkip, onUpdateActual, onReopen, theme }: {
  set: SessionSet;
  setIndex: number;
  onMarkDone: () => void;
  onSkip: () => void;
  onUpdateActual: (actual: SetConfig) => void;
  onReopen: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const [phase, setPhase] = useState<'idle' | 'prep' | 'active'>('idle');
  const [prepRemaining, setPrepRemaining] = useState(PREP_SECONDS);
  const [holdRemaining, setHoldRemaining] = useState(set.config.durationSeconds || 30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const isDone = set.status === 'done';
  const isSkipped = set.status === 'skipped';

  const startPrep = () => {
    setPhase('prep');
    setPrepRemaining(PREP_SECONDS);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let count = PREP_SECONDS;
    timerRef.current = setInterval(() => {
      count--;
      setPrepRemaining(count);
      if (count <= 3 && count > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (count <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startHold();
      }
    }, 1000);
  };

  const startHold = () => {
    setPhase('active');
    const dur = set.config.durationSeconds || 30;
    setHoldRemaining(dur);
    let remaining = dur;
    timerRef.current = setInterval(() => {
      remaining--;
      setHoldRemaining(remaining);
      if (remaining <= 3 && remaining > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('idle');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUpdateActual({ ...set.actual, durationSeconds: dur });
        onMarkDone();
      }
    }, 1000);
  };

  const finishEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const dur = set.config.durationSeconds || 30;
    const elapsed = dur - holdRemaining;
    setPhase('idle');
    onUpdateActual({ ...set.actual, durationSeconds: elapsed });
    onMarkDone();
  };

  const cancelPrep = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
  };

  if (phase === 'prep') {
    return (
      <View style={[styles.timerFullCard, { backgroundColor: Colors.accent + '08', borderColor: Colors.accent + '30' }]}>
        <Text style={[styles.timerPhaseLabel, { color: Colors.accent }]}>{t('workoutSession.getReady')}</Text>
        <Text style={[styles.timerBigNumber, { color: Colors.accent }]}>{prepRemaining}</Text>
        <Text style={[styles.timerSubLabel, { color: theme.textMuted }]}>{t('workoutSession.holdStartsIn', { n: prepRemaining })}</Text>
        <Pressable onPress={cancelPrep} style={[styles.timerSecondaryBtn, { borderColor: theme.border }]}>
          <Text style={[styles.timerSecondaryBtnText, { color: theme.textSecondary }]}>{t('workoutSession.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'active') {
    const dur = set.config.durationSeconds || 30;
    const progress = 1 - holdRemaining / dur;
    return (
      <View style={[styles.timerFullCard, { backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '30' }]}>
        <Text style={[styles.timerPhaseLabel, { color: Colors.primary }]}>{t('workoutSession.hold')}</Text>
        <Text style={[styles.timerBigNumber, { color: Colors.primary }]}>{formatCountdown(holdRemaining)}</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: Colors.primary }]} />
        </View>
        <Pressable onPress={finishEarly} style={[styles.timerPrimaryBtn, { backgroundColor: Colors.primary }]}>
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.timerPrimaryBtnText}>{t('workoutSession.doneEarly')}</Text>
        </Pressable>
      </View>
    );
  }

  if (isDone) {
    return (
      <Pressable onPress={onReopen} style={[styles.setRow, { backgroundColor: Colors.primary + '10' }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.hold')}</Text>
          <Text style={[styles.setValue, { color: theme.textSecondary }]}>
            {t('workoutSession.secondsValue', { n: set.actual.durationSeconds || 0 })}{set.actual.weight ? ` · ${toDisplayWeight(set.actual.weight, weightUnit)} ${unitLabel(weightUnit)}` : ''}
          </Text>
        </View>
        <View style={styles.setRowRight}>
          <View style={[styles.doneBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.doneBadgeText, { color: Colors.primary }]}>{t('workoutSession.done')}</Text>
          </View>
          <Ionicons name="pencil" size={13} color={theme.textMuted} style={{ marginLeft: 2 }} />
        </View>
      </Pressable>
    );
  }

  if (isSkipped) {
    return (
      <Pressable onPress={onReopen} style={[styles.setRow, { backgroundColor: theme.surface + '80' }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          <Text style={[styles.setLabel, { color: theme.textMuted, textDecorationLine: 'line-through' }]}>{t('workoutSession.hold')}</Text>
        </View>
        <Ionicons name="pencil" size={13} color={theme.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.setRow, { justifyContent: 'space-between' }]}>
      <View style={styles.setRowLeft}>
        <View style={[styles.setCircle, { borderColor: theme.border }]}>
          <Text style={[styles.setCircleText, { color: theme.textMuted }]}>{setIndex + 1}</Text>
        </View>
        <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.hold')}</Text>
        <Text style={[styles.setValue, { color: theme.textSecondary }]}>
          {t('workoutSession.secondsValue', { n: set.config.durationSeconds || 0 })}{set.config.weight ? ` · ${toDisplayWeight(set.config.weight, weightUnit)} ${unitLabel(weightUnit)}` : ''}
        </Text>
      </View>
      <View style={styles.setRowRight}>
        <Pressable
          onPress={startPrep}
          style={[styles.holdStartBtn, { backgroundColor: Colors.accent + '18' }]}
        >
          <Ionicons name="timer-outline" size={14} color={Colors.accent} />
          <Text style={[styles.holdStartText, { color: Colors.accent }]}>{t('workoutSession.start')}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && window.confirm(t('workoutSession.skipSetConfirm', { n: setIndex + 1 }))) onSkip();
              return;
            }
            Alert.alert(t('workoutSession.setOptions'), '', [
              { text: t('workoutSession.skipSet'), style: 'destructive', onPress: onSkip },
              { text: t('workoutSession.cancel'), style: 'cancel' },
            ]);
          }}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function EmomSetRow({ set, setIndex, onMarkDone, onSkip, onUpdateActual, onReopen, theme }: {
  set: SessionSet;
  setIndex: number;
  onMarkDone: () => void;
  onSkip: () => void;
  onUpdateActual: (actual: SetConfig) => void;
  onReopen: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const totalIntervals = set.config.totalIntervals || 10;
  const intervalSec = set.config.intervalSeconds || 60;
  const repsPerInterval = set.config.repsPerInterval || 10;

  const [phase, setPhase] = useState<'idle' | 'prep' | 'active' | 'finished'>('idle');
  const [prepRemaining, setPrepRemaining] = useState(PREP_SECONDS);
  const [currentInterval, setCurrentInterval] = useState(1);
  const [intervalRemaining, setIntervalRemaining] = useState(intervalSec);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentIntervalRef = useRef(1);
  const completedRef = useRef(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const isDone = set.status === 'done';
  const isSkipped = set.status === 'skipped';

  const startPrep = () => {
    setPhase('prep');
    setPrepRemaining(PREP_SECONDS);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let count = PREP_SECONDS;
    timerRef.current = setInterval(() => {
      count--;
      setPrepRemaining(count);
      if (count <= 3 && count > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (count <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startIntervalTimer();
      }
    }, 1000);
  };

  const startIntervalTimer = () => {
    setPhase('active');
    currentIntervalRef.current = 1;
    completedRef.current = 0;
    setCurrentInterval(1);
    setCompletedIntervals(0);
    setIntervalRemaining(intervalSec);

    let remaining = intervalSec;
    let curInterval = 1;

    timerRef.current = setInterval(() => {
      remaining--;
      setIntervalRemaining(remaining);

      if (remaining <= 3 && remaining > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (remaining <= 0) {
        completedRef.current++;
        setCompletedIntervals(completedRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (completedRef.current >= totalIntervals) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('finished');
          onUpdateActual({ ...set.actual, totalIntervals: completedRef.current, repsPerInterval });
          onMarkDone();
          return;
        }

        curInterval++;
        currentIntervalRef.current = curInterval;
        setCurrentInterval(curInterval);
        remaining = intervalSec;
        setIntervalRemaining(remaining);
      }
    }, 1000);
  };

  const skipInterval = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    completedRef.current++;
    setCompletedIntervals(completedRef.current);

    if (completedRef.current >= totalIntervals) {
      setPhase('finished');
      onUpdateActual({ ...set.actual, totalIntervals: completedRef.current, repsPerInterval });
      onMarkDone();
      return;
    }

    const nextInterval = currentIntervalRef.current + 1;
    currentIntervalRef.current = nextInterval;
    setCurrentInterval(nextInterval);
    setIntervalRemaining(intervalSec);

    let remaining = intervalSec;
    timerRef.current = setInterval(() => {
      remaining--;
      setIntervalRemaining(remaining);
      if (remaining <= 3 && remaining > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (remaining <= 0) {
        completedRef.current++;
        setCompletedIntervals(completedRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (completedRef.current >= totalIntervals) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('finished');
          onUpdateActual({ ...set.actual, totalIntervals: completedRef.current, repsPerInterval });
          onMarkDone();
          return;
        }
        const next = currentIntervalRef.current + 1;
        currentIntervalRef.current = next;
        setCurrentInterval(next);
        remaining = intervalSec;
        setIntervalRemaining(remaining);
      }
    }, 1000);
  };

  const finishEmom = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('finished');
    onUpdateActual({ ...set.actual, totalIntervals: completedRef.current, repsPerInterval });
    onMarkDone();
  };

  const cancelPrep = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
  };

  if (phase === 'prep') {
    return (
      <View style={[styles.timerFullCard, { backgroundColor: Colors.accent + '08', borderColor: Colors.accent + '30' }]}>
        <Text style={[styles.timerPhaseLabel, { color: Colors.accent }]}>{t('workoutSession.getReady')}</Text>
        <Text style={[styles.timerBigNumber, { color: Colors.accent }]}>{prepRemaining}</Text>
        <Text style={[styles.timerSubLabel, { color: theme.textMuted }]}>
          {t('workoutSession.emomPrepSubtitle', { reps: repsPerInterval, sec: intervalSec, intervals: totalIntervals })}
        </Text>
        <Pressable onPress={cancelPrep} style={[styles.timerSecondaryBtn, { borderColor: theme.border }]}>
          <Text style={[styles.timerSecondaryBtnText, { color: theme.textSecondary }]}>{t('workoutSession.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'active') {
    const progress = 1 - intervalRemaining / intervalSec;
    const overallProgress = (completedIntervals + progress) / totalIntervals;
    // Per-minute reps override via minutes[] (same exercise every minute).
    const curReps = set.config.minutes?.[currentInterval - 1] ?? repsPerInterval;
    return (
      <View style={[styles.emomActiveCard, { backgroundColor: theme.card, borderColor: Colors.primary + '30' }]}>
        <View style={styles.emomHeader}>
          <View style={[styles.emomIntervalBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.emomIntervalText, { color: Colors.primary }]}>
              {t('workoutSession.intervalProgress', { current: currentInterval, total: totalIntervals })}
            </Text>
          </View>
          <Text style={[styles.emomRepsGoal, { color: theme.textMuted }]}>
            {t('workoutSession.repsValue', { n: curReps })}
          </Text>
        </View>
        <View style={styles.emomTimerCenter}>
          <Text style={[styles.emomTimerBig, { color: theme.text }]}>{formatCountdown(intervalRemaining)}</Text>
        </View>

        <View style={styles.emomProgressSection}>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: Colors.primary }]} />
          </View>
          <View style={[styles.emomOverallBar, { backgroundColor: theme.surface, marginTop: 6 }]}>
            <View style={[styles.progressBar, { width: `${overallProgress * 100}%`, backgroundColor: Colors.accent }]} />
          </View>
          <Text style={[styles.emomOverallLabel, { color: theme.textMuted }]}>
            {t('workoutSession.intervalsCompleted', { completed: completedIntervals, total: totalIntervals })}
          </Text>
        </View>

        <View style={styles.emomBtnRow}>
          <Pressable onPress={skipInterval} style={[styles.emomActionBtn, { backgroundColor: Colors.accent + '15' }]}>
            <Ionicons name="play-skip-forward" size={16} color={Colors.accent} />
            <Text style={[styles.emomActionBtnText, { color: Colors.accent }]}>{t('workoutSession.skip')}</Text>
          </Pressable>
          <Pressable onPress={finishEmom} style={[styles.emomActionBtn, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="checkmark" size={16} color={Colors.primary} />
            <Text style={[styles.emomActionBtnText, { color: Colors.primary }]}>{t('workoutSession.finish')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isDone) {
    return (
      <Pressable onPress={onReopen} style={[styles.setRow, { backgroundColor: Colors.primary + '10' }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.emom')}</Text>
          <Text style={[styles.setValue, { color: theme.textSecondary }]}>
            {repsPerInterval}×{totalIntervals}
          </Text>
        </View>
        <View style={styles.setRowRight}>
          <View style={[styles.doneBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.doneBadgeText, { color: Colors.primary }]}>{t('workoutSession.done')}</Text>
          </View>
          <Ionicons name="pencil" size={13} color={theme.textMuted} style={{ marginLeft: 2 }} />
        </View>
      </Pressable>
    );
  }

  if (isSkipped) {
    return (
      <Pressable onPress={onReopen} style={[styles.setRow, { backgroundColor: theme.surface + '80' }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          <Text style={[styles.setLabel, { color: theme.textMuted, textDecorationLine: 'line-through' }]}>{t('workoutSession.emom')}</Text>
        </View>
        <Ionicons name="pencil" size={13} color={theme.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.setRow, { justifyContent: 'space-between' }]}>
      <View style={styles.setRowLeft}>
        <View style={[styles.setCircle, { borderColor: theme.border }]}>
          <Text style={[styles.setCircleText, { color: theme.textMuted }]}>{setIndex + 1}</Text>
        </View>
        <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.emom')}</Text>
        <Text style={[styles.setValue, { color: theme.textSecondary }]}>
          {t('workoutSession.emomConfig', { reps: repsPerInterval, intervals: totalIntervals, sec: intervalSec })}
        </Text>
      </View>
      <View style={styles.setRowRight}>
        <Pressable
          onPress={startPrep}
          style={[styles.holdStartBtn, { backgroundColor: Colors.accent + '18' }]}
        >
          <Ionicons name="play" size={14} color={Colors.accent} />
          <Text style={[styles.holdStartText, { color: Colors.accent }]}>{t('workoutSession.start')}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && window.confirm(t('workoutSession.skipSetConfirm', { n: setIndex + 1 }))) onSkip();
              return;
            }
            Alert.alert(t('workoutSession.setOptions'), '', [
              { text: t('workoutSession.skipSet'), style: 'destructive', onPress: onSkip },
              { text: t('workoutSession.cancel'), style: 'cancel' },
            ]);
          }}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function SetRowItem({ set, setIndex, exerciseIndex, onMarkDone, onSkip, onUpdateActual, onReopen, theme }: {
  set: SessionSet;
  setIndex: number;
  exerciseIndex: number;
  onMarkDone: () => void;
  onSkip: () => void;
  onUpdateActual: (actual: SetConfig) => void;
  onReopen: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const setType = set.config.type;
  const note = set.actual.note ?? set.config.note ?? '';
  const [noteOpen, setNoteOpen] = useState(!!note);
  const row =
    setType === 'reps' ? <RepsSetRow set={set} setIndex={setIndex} onMarkDone={onMarkDone} onSkip={onSkip} onUpdateActual={onUpdateActual} onReopen={onReopen} theme={theme} />
    : setType === 'hold' ? <HoldSetRow set={set} setIndex={setIndex} onMarkDone={onMarkDone} onSkip={onSkip} onUpdateActual={onUpdateActual} onReopen={onReopen} theme={theme} />
    : setType === 'emom' ? <EmomSetRow set={set} setIndex={setIndex} onMarkDone={onMarkDone} onSkip={onSkip} onUpdateActual={onUpdateActual} onReopen={onReopen} theme={theme} />
    : null;
  return (
    <View>
      {row}
      {noteOpen ? (
        <View style={styles.noteEditWrap}>
          <View style={styles.noteEditHead}>
            <Ionicons name="document-text-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.noteEditLabel, { color: theme.textMuted }]}>{t('workoutSession.note')}</Text>
            <Pressable onPress={() => setNoteOpen(!!note)} hitSlop={8} style={styles.noteDone}>
              <Ionicons name="checkmark" size={14} color={Colors.primary} />
            </Pressable>
          </View>
          <TextInput
            style={[styles.noteInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={note}
            onChangeText={(v) => onUpdateActual({ ...set.actual, note: v })}
            placeholder={t('workoutSession.addNoteOptional')}
            placeholderTextColor={theme.textMuted}
            autoFocus
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>
      ) : note ? (
        <Pressable onPress={() => setNoteOpen(true)} style={styles.noteRow}>
          <Ionicons name="document-text-outline" size={12} color={theme.textMuted} style={{ marginTop: 1 }} />
          <Text style={[styles.noteText, { color: theme.textSecondary }]} numberOfLines={3}>{note}</Text>
          <Ionicons name="pencil" size={11} color={theme.textMuted} />
        </Pressable>
      ) : (
        <Pressable onPress={() => setNoteOpen(true)} hitSlop={6} style={styles.noteRow}>
          <Ionicons name="add" size={12} color={theme.textMuted} />
          <Text style={[styles.noteText, { color: theme.textMuted }]}>{t('workoutSession.note')}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ExerciseMenuModal({ visible, onClose, onAddSet, onSkipAll, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, theme }: {
  visible: boolean;
  onClose: () => void;
  onAddSet: () => void;
  onSkipAll: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={[styles.menuSheet, { backgroundColor: theme.card }]}>
          {canMoveUp && (
            <>
              <Pressable onPress={() => { onMoveUp(); onClose(); }} style={styles.menuItem}>
                <Ionicons name="arrow-up" size={20} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>{t('workoutSession.moveUp')}</Text>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            </>
          )}
          {canMoveDown && (
            <>
              <Pressable onPress={() => { onMoveDown(); onClose(); }} style={styles.menuItem}>
                <Ionicons name="arrow-down" size={20} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>{t('workoutSession.moveDown')}</Text>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            </>
          )}
          <Pressable
            onPress={() => { onAddSet(); onClose(); }}
            style={styles.menuItem}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('workoutSession.addSet')}</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => { onSkipAll(); onClose(); }}
            style={styles.menuItem}
          >
            <Ionicons name="play-skip-forward-outline" size={20} color={Colors.accent} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('workoutSession.skipAllSets')}</Text>
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => { onDelete(); onClose(); }}
            style={styles.menuItem}
          >
            <Ionicons name="trash-outline" size={20} color="#FF4458" />
            <Text style={[styles.menuItemText, { color: '#FF4458' }]}>{t('workoutSession.deleteExercise')}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function ExercisePickerModal({ visible, onClose, onSelect, customExercises, theme }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (ex: { id: string; name: string; muscleGroup: string; defaultSetType: string }) => void;
  customExercises: any[];
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const allExercises = useMemo(() => {
    const lib = exerciseLibrary.map(e => ({ ...e, isCustom: false }));
    const custom = customExercises.map(e => ({
      id: e.id, name: e.name, muscleGroup: e.muscleGroup,
      defaultSetType: e.defaultSetType, isCustom: true,
    }));
    return [...lib, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (equipment) list = list.filter(e => e.equipment === equipment);
    if (muscle) list = list.filter(e => (e.primaryMuscle || e.muscleGroup) === muscle);
    if (search.trim()) list = list.filter(e => matchExercise(search, e));
    return list;
  }, [allExercises, equipment, muscle, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('workoutSession.addExercise')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('workoutSession.searchExercises')}
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <ExerciseFilterBar
            equipment={equipment}
            muscle={muscle}
            onEquipment={setEquipment}
            onMuscle={setMuscle}
            resultCount={filtered.length}
            theme={theme}
          />
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 }}>
            {filtered.map((ex, i) => (
              <ExerciseRow
                key={ex.id + i}
                ex={ex}
                theme={theme}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(ex);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── EMOM combo body: one interval timer cycling through the components ────────
// Minute m (0-based) → component m % len, cycle floor(m / len) → target from
// rounds[cycle].entries[m % len]. The rounds structure itself is untouched here;
// on finish the parent marks cycles done/skipped so finish-expansion logs them.
function ComboEmomBody({ combo, onFinishEmom, theme }: {
  combo: SessionExercise;
  onFinishEmom: (completedMinutes: number) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const components = combo.components || [];
  const rounds = combo.rounds || [];
  const compLen = Math.max(1, components.length);
  const totalMinutes = compLen * rounds.length;
  const intervalSec = combo.intervalSeconds || 60;

  // resume from the first not-yet-finished cycle (e.g. after a reopen)
  const firstPending = rounds.findIndex(r => r.status === 'pending' || r.status === 'in_progress');
  const startMinute = firstPending > 0 ? firstPending * compLen : 0;

  const [phase, setPhase] = useState<'idle' | 'prep' | 'active'>('idle');
  const [paused, setPaused] = useState(false);
  const [minute, setMinute] = useState(startMinute); // 0-based current minute
  const [remaining, setRemaining] = useState(intervalSec);
  const [prepRemaining, setPrepRemaining] = useState(PREP_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const minuteRef = useRef(startMinute);
  const remainingRef = useRef(intervalSec);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  // name + target for minute m, read straight from the combo-native rounds data
  const minuteInfo = (m: number) => {
    const cycle = Math.floor(m / compLen);
    const ci = m % compLen;
    const entry = rounds[cycle]?.entries[ci];
    const name = components[ci]?.name || '';
    const ty = entry?.type ?? 'reps';
    let target = ty === 'hold'
      ? `${t('workoutSession.hold')} ${t('workoutSession.secondsValue', { n: entry?.durationSeconds || 0 })}`
      : t('workoutSession.repsValue', { n: (ty === 'emom' ? entry?.repsPerInterval : entry?.reps) || 0 });
    if (entry?.weight) target += ` · ${toDisplayWeight(entry.weight, weightUnit)} ${unitLabel(weightUnit)}`;
    return { name, target };
  };

  const finish = (completedMinutes: number) => {
    stopTimer();
    setPhase('idle');
    onFinishEmom(completedMinutes);
  };

  const advanceMinute = () => {
    const next = minuteRef.current + 1;
    if (next >= totalMinutes) { finish(next); return; }
    minuteRef.current = next;
    setMinute(next);
    remainingRef.current = intervalSec;
    setRemaining(intervalSec);
  };

  const tick = () => {
    remainingRef.current -= 1;
    const rem = remainingRef.current;
    setRemaining(rem);
    if (rem <= 3 && rem > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (rem <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      advanceMinute();
    }
  };

  const startActive = () => {
    setPhase('active');
    setPaused(false);
    remainingRef.current = intervalSec;
    setRemaining(intervalSec);
    stopTimer();
    timerRef.current = setInterval(tick, 1000);
  };

  const startPrep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('prep');
    setPrepRemaining(PREP_SECONDS);
    minuteRef.current = startMinute;
    setMinute(startMinute);
    let count = PREP_SECONDS;
    stopTimer();
    timerRef.current = setInterval(() => {
      count--;
      setPrepRemaining(count);
      if (count <= 3 && count > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (count <= 0) {
        stopTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startActive();
      }
    }, 1000);
  };

  const cancelPrep = () => { stopTimer(); setPhase('idle'); };

  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (paused) { timerRef.current = setInterval(tick, 1000); setPaused(false); }
    else { stopTimer(); setPaused(true); }
  };

  // manual "done minute" → jump to the next minute immediately
  const doneMinute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    advanceMinute();
  };

  // finish early: minutes fully completed count as done, the rest get skipped
  const finishEarly = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finish(minuteRef.current);
  };

  if (phase === 'prep') {
    const first = minuteInfo(startMinute);
    return (
      <View style={[styles.timerFullCard, { backgroundColor: Colors.accent + '08', borderColor: Colors.accent + '30' }]}>
        <Text style={[styles.timerPhaseLabel, { color: Colors.accent }]}>{t('workoutSession.getReady')}</Text>
        <Text style={[styles.timerBigNumber, { color: Colors.accent }]}>{prepRemaining}</Text>
        <Text style={[styles.timerSubLabel, { color: theme.textMuted }]}>
          {t('workoutSession.everyMinute')} · {first.name} — {first.target}
        </Text>
        <Pressable onPress={cancelPrep} style={[styles.timerSecondaryBtn, { borderColor: theme.border }]}>
          <Text style={[styles.timerSecondaryBtnText, { color: theme.textSecondary }]}>{t('workoutSession.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'active') {
    const cur = minuteInfo(minute);
    const nxt = minute + 1 < totalMinutes ? minuteInfo(minute + 1) : null;
    const progress = 1 - remaining / intervalSec;
    const overallProgress = (minute + progress) / Math.max(1, totalMinutes);
    return (
      <View style={[styles.emomActiveCard, { backgroundColor: theme.card, borderColor: Colors.primary + '30' }]}>
        <View style={styles.emomHeader}>
          <View style={[styles.emomIntervalBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.emomIntervalText, { color: Colors.primary }]}>
              {t('workoutSession.minuteX', { n: minute + 1 })} / {totalMinutes}
            </Text>
          </View>
          <Text style={[styles.emomRepsGoal, { color: theme.textMuted }]}>{cur.target}</Text>
        </View>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 8 }} numberOfLines={1}>
          {cur.name}
        </Text>

        <View style={styles.emomTimerCenter}>
          <Text style={[styles.emomTimerBig, { color: theme.text }]}>{formatCountdown(remaining)}</Text>
        </View>
        {nxt && (
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500', textAlign: 'center' }} numberOfLines={1}>
            {t('workoutSession.nextUp', { name: nxt.name })}
          </Text>
        )}

        <View style={styles.emomProgressSection}>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: Colors.primary }]} />
          </View>
          <View style={[styles.emomOverallBar, { backgroundColor: theme.surface, marginTop: 6 }]}>
            <View style={[styles.progressBar, { width: `${overallProgress * 100}%`, backgroundColor: Colors.accent }]} />
          </View>
          <Text style={[styles.emomOverallLabel, { color: theme.textMuted }]}>
            {t('workoutSession.intervalsCompleted', { completed: minute, total: totalMinutes })}
          </Text>
        </View>

        <View style={styles.emomBtnRow}>
          <Pressable onPress={togglePause} style={[styles.emomActionBtn, { backgroundColor: theme.surface }]}>
            <Ionicons name={paused ? 'play' : 'pause'} size={16} color={theme.text} />
            {paused && <Text style={[styles.emomActionBtnText, { color: theme.text }]}>{t('workoutSession.start')}</Text>}
          </Pressable>
          <Pressable onPress={doneMinute} style={[styles.emomActionBtn, { backgroundColor: Colors.accent + '15' }]}>
            <Ionicons name="play-skip-forward" size={16} color={Colors.accent} />
            <Text style={[styles.emomActionBtnText, { color: Colors.accent }]}>{t('workoutSession.skip')}</Text>
          </Pressable>
          <Pressable onPress={finishEarly} style={[styles.emomActionBtn, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="checkmark" size={16} color={Colors.primary} />
            <Text style={[styles.emomActionBtnText, { color: Colors.primary }]}>{t('workoutSession.finish')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // idle: if every cycle is finished → done summary (tap to redo); else summary + start
  const allDone = rounds.length > 0 && rounds.every(r => r.status === 'done' || r.status === 'skipped');
  if (allDone) {
    return (
      <Pressable onPress={startPrep} style={[styles.setRow, { justifyContent: 'space-between', backgroundColor: Colors.primary + '10' }]}>
        <View style={styles.setRowLeft}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.emom')}</Text>
          <Text style={[styles.setValue, { color: theme.textSecondary }]}>{totalMinutes} × {intervalSec}{t('workoutSession.sec')}</Text>
        </View>
        <View style={styles.setRowRight}>
          <View style={[styles.doneBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.doneBadgeText, { color: Colors.primary }]}>{t('workoutSession.done')}</Text>
          </View>
          <Ionicons name="refresh" size={14} color={theme.textMuted} style={{ marginLeft: 2 }} />
        </View>
      </Pressable>
    );
  }
  return (
    <View style={[styles.setRow, { justifyContent: 'space-between' }]}>
      <View style={styles.setRowLeft}>
        <Text style={[styles.setLabel, { color: theme.text }]}>{t('workoutSession.emom')}</Text>
        <Text style={[styles.setValue, { color: theme.textSecondary }]}>
          {totalMinutes} × {intervalSec}{t('workoutSession.sec')}
        </Text>
      </View>
      <Pressable onPress={startPrep} style={[styles.holdStartBtn, { backgroundColor: Colors.accent + '18' }]}>
        <Ionicons name="play" size={14} color={Colors.accent} />
        <Text style={[styles.holdStartText, { color: Colors.accent }]}>{t('workoutSession.start')}</Text>
      </Pressable>
    </View>
  );
}

// ── Combo set card (multiple movements per round, done back-to-back) ──────────
function ComboCard({ combo, onUpdateEntry, onRoundDone, onRoundSkip, onRoundReopen, onAddRound, onFinishEmom, onDelete, collapsed, onToggleCollapse, theme }: {
  combo: SessionExercise;
  onUpdateEntry: (roundIdx: number, compIdx: number, patch: Partial<SetConfig>) => void;
  onRoundDone: (roundIdx: number) => void;
  onRoundSkip: (roundIdx: number) => void;
  onRoundReopen: (roundIdx: number) => void;
  onAddRound: () => void;
  onFinishEmom: (completedMinutes: number) => void;
  onDelete: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const components = combo.components || [];
  const rounds = combo.rounds || [];
  const isEmom = (combo.mode ?? 'circuit') === 'emom'; // no mode = circuit (backward compat)
  const hasPending = rounds.some(r => r.status === 'pending' || r.status === 'in_progress');

  return (
    <View style={[styles.exCard, { backgroundColor: theme.card, borderWidth: 1, borderColor: Colors.accent + '30' }]}>
      <View style={styles.exCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.comboTitleRow}>
            <View style={[styles.comboChip, { backgroundColor: Colors.accent + '18' }]}>
              <Ionicons name="git-merge-outline" size={11} color={Colors.accent} />
              <Text style={[styles.comboChipText, { color: Colors.accent }]}>{t('workoutSession.combo')}</Text>
            </View>
            {isEmom && (
              <View style={[styles.comboChip, { backgroundColor: Colors.primary + '18' }]}>
                <Text style={[styles.comboChipText, { color: Colors.primary }]}>
                  {t('workoutSession.emom')} · {combo.intervalSeconds || 60}{t('workoutSession.sec')}
                </Text>
              </View>
            )}
            {!isEmom && combo.unbroken && (
              <View style={[styles.comboChip, { backgroundColor: Colors.primary + '18' }]}>
                <Text style={[styles.comboChipText, { color: Colors.primary }]}>{t('workoutSession.unbroken')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.exCardName, { color: theme.text, marginTop: 4 }]}>{combo.name}</Text>
          {collapsed && (
            <Text style={[styles.collapsedSummary, { color: theme.textMuted }]}>
              {t('workoutPrep.comboSummary', { r: rounds.length, m: components.length })}
            </Text>
          )}
        </View>
        <Pressable onPress={onToggleCollapse} hitSlop={8} style={styles.menuBtn}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={theme.textMuted} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.menuBtn}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {!collapsed && (
      <>
      {rounds.map((round, ri) => {
        const isDone = round.status === 'done';
        const isSkipped = round.status === 'skipped';
        // done/skipped → compact summary, tap to reopen
        if (isDone || isSkipped) {
          return (
            <Pressable key={ri} onPress={() => onRoundReopen(ri)} style={[styles.comboRound, { backgroundColor: isDone ? Colors.primary + '10' : theme.surface + '80' }]}>
              <View style={styles.comboRoundHead}>
                <Ionicons name={isDone ? 'checkmark-circle' : 'close-circle'} size={18} color={isDone ? Colors.primary : theme.textMuted} />
                <Text style={[styles.comboRoundLabel, { color: isSkipped ? theme.textMuted : theme.text }, isSkipped && styles.strikethrough]}>
                  {t('workoutSession.roundN', { n: ri + 1 })}
                </Text>
                {!isSkipped && (
                  <Text style={[styles.comboRoundSummary, { color: theme.textSecondary }]} numberOfLines={1}>
                    {components.map((c, ci) => {
                      const e = round.entries[ci];
                      const ty = e?.type ?? 'reps';
                      if (ty === 'hold') return `${e?.durationSeconds || 0}s`;
                      if (ty === 'emom') return `${e?.repsPerInterval || 0}×${e?.totalIntervals || 0}`;
                      return `${e?.reps || 0}${e?.weight ? '×' + toDisplayWeight(e.weight, weightUnit) : ''}`;
                    }).join(' · ')}
                  </Text>
                )}
                <Ionicons name="pencil" size={13} color={theme.textMuted} />
              </View>
            </Pressable>
          );
        }
        // emom mode: pending cycles are driven by the interval timer below
        if (isEmom) return null;
        // pending → editable component rows
        return (
          <View key={ri} style={[styles.comboRound, { backgroundColor: 'transparent' }]}>
            <View style={styles.comboRoundHead}>
              <View style={[styles.setCircle, { borderColor: theme.border }]}>
                <Text style={[styles.setCircleText, { color: theme.textMuted }]}>{ri + 1}</Text>
              </View>
              <Text style={[styles.comboRoundLabel, { color: theme.text, flex: 1 }]}>{t('workoutSession.roundN', { n: ri + 1 })}</Text>
              <Pressable onPress={() => onRoundDone(ri)} hitSlop={10} style={[styles.doneBtn, { backgroundColor: Colors.primary, marginLeft: 0 }]}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </Pressable>
              <Pressable onPress={() => onRoundSkip(ri)} hitSlop={10} style={styles.skipBtn}>
                <Ionicons name="close" size={18} color="#F87171" />
              </Pressable>
            </View>
            {components.map((c, ci) => {
              const entry = round.entries[ci];
              const ty = entry?.type ?? 'reps';
              const inputStyle = [styles.inlineInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }];
              return (
                <View key={ci} style={styles.comboCompRow}>
                  <Text style={[styles.comboCompName, { color: theme.textSecondary }]} numberOfLines={1}>{c.name}</Text>
                  <View style={styles.comboCompFields}>
                    {ty === 'hold' ? (
                      <>
                        <TextInput
                          style={inputStyle}
                          value={String(entry?.durationSeconds ?? '')}
                          onChangeText={(v) => onUpdateEntry(ri, ci, { durationSeconds: parseInt(v) || 0 })}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                        />
                        <Text style={[styles.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.sec')}</Text>
                      </>
                    ) : ty === 'emom' ? (
                      <>
                        <TextInput
                          style={inputStyle}
                          value={String(entry?.repsPerInterval ?? '')}
                          onChangeText={(v) => onUpdateEntry(ri, ci, { repsPerInterval: parseInt(v) || 0 })}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                        />
                        <Text style={[styles.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                        <TextInput
                          style={inputStyle}
                          value={String(entry?.totalIntervals ?? '')}
                          onChangeText={(v) => onUpdateEntry(ri, ci, { totalIntervals: parseInt(v) || 0 })}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                        />
                        <Text style={[styles.comboCompUnit, { color: theme.textMuted }]}>×</Text>
                      </>
                    ) : (
                      <>
                        <TextInput
                          style={inputStyle}
                          value={String(entry?.reps ?? '')}
                          onChangeText={(v) => onUpdateEntry(ri, ci, { reps: parseInt(v) || 0 })}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                        />
                        <Text style={[styles.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                      </>
                    )}
                    <TextInput
                      style={inputStyle}
                      value={String(toDisplayWeight(entry?.weight || 0, weightUnit) || '')}
                      onChangeText={(v) => onUpdateEntry(ri, ci, { weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
                      keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                    />
                    <Text style={[styles.comboCompUnit, { color: theme.textMuted }]}>{unitLabel(weightUnit)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {isEmom ? (
        hasPending && <ComboEmomBody combo={combo} onFinishEmom={onFinishEmom} theme={theme} />
      ) : (
        <Pressable onPress={onAddRound} style={styles.comboAddRound}>
          <Ionicons name="add" size={16} color={Colors.accent} />
          <Text style={[styles.comboAddRoundText, { color: Colors.accent }]}>{t('workoutSession.addRound')}</Text>
        </Pressable>
      )}
      </>
      )}
    </View>
  );
}

function getDefaultSetConfig(type: SetConfig['type']): SetConfig {
  switch (type) {
    case 'reps': return { type: 'reps', reps: 10, weight: 0 };
    case 'hold': return { type: 'hold', durationSeconds: 30 };
    case 'emom': return { type: 'emom', repsPerInterval: 10, intervalSeconds: 60, totalIntervals: 10 };
  }
}

function generateAiInsight(
  totalSets: number, completedSets: number, durationMinutes: number,
  totalVolumeKg: number, totalReps: number, exercises: ActiveSession['exercises']
): string {
  const completionRate = totalSets > 0 ? completedSets / totalSets : 0;
  let insight = `Great session! You completed ${completedSets}/${totalSets} sets in ${durationMinutes} minutes`;
  if (totalVolumeKg > 0) insight += ` with ${totalVolumeKg.toLocaleString()}kg total volume`;
  insight += '.';

  if (completionRate > 0.9) {
    insight += ' Excellent completion rate! Consider increasing weights next session.';
  } else if (completionRate < 0.5) {
    insight += ' Try adjusting your weights or rest periods for better completion.';
  }

  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.status === 'done' && s.config.type === 'reps' && s.actual.reps && s.config.reps && s.actual.reps > s.config.reps) {
        insight += ` PR on ${ex.name}: ${s.actual.reps} reps vs planned ${s.config.reps}!`;
        break;
      }
    }
  }

  return insight;
}

export default function LiveWorkoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const theme = Colors.dark;

  const { activeSession, setActiveSession, addWorkoutLog, customExercises, user, weightUnit } = useApp();
  const [session, setSession] = useState<ActiveSession | null>(activeSession);
  const [elapsed, setElapsed] = useState('00:00');
  const [restTimer, setRestTimer] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [restExerciseName, setRestExerciseName] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [menuExerciseIndex, setMenuExerciseIndex] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session) {
      router.back();
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      setElapsed(formatTime(Date.now() - session.startTimestamp));
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.startTimestamp]);

  useEffect(() => {
    if (!session) return;
    autoSaveRef.current = setInterval(() => {
      setActiveSession(session);
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [session, setActiveSession]);

  // "Last time" per exercise — what you lifted the previous time you did it
  const [lastPerf, setLastPerf] = useState<Record<string, { date: string; weight: number; reps: number }>>({});
  const exerciseNamesKey = session?.exercises.map(e => e.name).join(',') ?? '';
  useEffect(() => {
    const names = exerciseNamesKey ? exerciseNamesKey.split(',') : [];
    if (!names.length) return;
    workoutApi.lastPerformance(names).then(setLastPerf).catch(() => {});
  }, [exerciseNamesKey]);

  const startRestTimer = useCallback((seconds: number, exerciseName: string) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer(seconds);
    setRestTotal(seconds);
    setRestExerciseName(exerciseName);
    restTimerRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const skipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer(0);
  }, []);

  const extendRest = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestTimer(prev => Math.max(0, prev + delta));
    setRestTotal(prev => Math.max(0, prev + delta));
  }, []);

  const updateSession = useCallback((updater: (s: ActiveSession) => ActiveSession) => {
    setSession(prev => {
      if (!prev) return prev;
      return updater(prev);
    });
  }, []);

  const markSetDone = useCallback((exIdx: number, setIdx: number) => {
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], status: 'done' };
      ex.sets = sets;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
    if (session) {
      const ex = session.exercises[exIdx];
      if (ex.restSeconds > 0) {
        startRestTimer(ex.restSeconds, ex.name);
      }
    }
  }, [session, updateSession, startRestTimer]);

  const skipSet = useCallback((exIdx: number, setIdx: number) => {
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], status: 'skipped' };
      ex.sets = sets;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  // reopen a done/skipped set for editing — status back to pending, actual values kept
  const reopenSet = useCallback((exIdx: number, setIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], status: 'pending' };
      ex.sets = sets;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const updateSetActual = useCallback((exIdx: number, setIdx: number, actual: SetConfig) => {
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], actual };
      ex.sets = sets;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const togglePreWorkout = useCallback(() => {
    updateSession(s => ({ ...s, preWorkout: !s.preWorkout }));
  }, [updateSession]);

  const addSetToExercise = useCallback((exIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets = [...ex.sets, { config: { ...lastSet.config }, actual: { ...lastSet.config }, status: 'pending' }];
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const skipAllSets = useCallback((exIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      ex.sets = ex.sets.map(st => st.status === 'pending' ? { ...st, status: 'skipped' as const } : st);
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const moveExercise = useCallback((exIdx: number, dir: -1 | 1) => {
    updateSession(s => {
      const j = exIdx + dir;
      if (j < 0 || j >= s.exercises.length) return s;
      const exercises = [...s.exercises];
      [exercises[exIdx], exercises[j]] = [exercises[j], exercises[exIdx]];
      return { ...s, exercises };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [updateSession]);

  const deleteExercise = useCallback((exIdx: number) => {
    Alert.alert(t('workoutSession.deleteExercise'), t('workoutSession.removeExerciseConfirm'), [
      { text: t('workoutSession.cancel'), style: 'cancel' },
      {
        text: t('workoutSession.delete'), style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateSession(s => ({
            ...s,
            exercises: s.exercises.filter((_, i) => i !== exIdx),
          }));
        },
      },
    ]);
  }, [updateSession]);

  const addExercise = useCallback((ex: { id: string; name: string; muscleGroup: string; defaultSetType: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const defaultConfig = getDefaultSetConfig(ex.defaultSetType as SetConfig['type']);
    updateSession(s => ({
      ...s,
      exercises: [...s.exercises, {
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        restSeconds: 90,
        sets: [
          { config: { ...defaultConfig }, actual: { ...defaultConfig }, status: 'pending' },
          { config: { ...defaultConfig }, actual: { ...defaultConfig }, status: 'pending' },
          { config: { ...defaultConfig }, actual: { ...defaultConfig }, status: 'pending' },
        ],
      }],
    }));
  }, [updateSession]);

  // ── combo sets ────────────────────────────────────────────────────────────
  const addCombo = useCallback((data: ComboBuildResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = data.components.map(c => c.name).join(' + ');
    updateSession(s => ({
      ...s,
      exercises: [...s.exercises, {
        exerciseId: 'combo-' + Crypto.randomUUID(),
        name: label,
        muscleGroup: 'Combo',
        restSeconds: data.restSeconds,
        sets: [],
        combo: true,
        unbroken: data.unbroken,
        mode: data.mode ?? 'circuit',
        intervalSeconds: data.intervalSeconds ?? 60,
        components: data.components.map(c => ({ exerciseId: c.exerciseId, name: c.name, muscleGroup: c.muscleGroup })),
        rounds: Array.from({ length: Math.max(1, data.rounds) }, () => ({
          status: 'pending' as const,
          entries: data.components.map(c => componentToSetConfig(c)),
        })),
      }],
    }));
  }, [updateSession]);

  // EMOM combo finished (fully or early): mark cycles that were started as done,
  // the untouched rest as skipped — finish-expansion then logs them per component.
  const finishComboEmom = useCallback((exIdx: number, completedMinutes: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const compLen = Math.max(1, (ex.components || []).length);
      ex.rounds = (ex.rounds || []).map((r, ri) => {
        if (r.status === 'done' || r.status === 'skipped') return r;
        // cycle ri covers minutes [ri*compLen, (ri+1)*compLen)
        return { ...r, status: (completedMinutes > ri * compLen ? 'done' : 'skipped') as 'done' | 'skipped' };
      });
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const updateRoundEntry = useCallback((exIdx: number, roundIdx: number, compIdx: number, patch: Partial<SetConfig>) => {
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const rounds = [...(ex.rounds || [])];
      const round = { ...rounds[roundIdx], entries: rounds[roundIdx].entries.map((e, i) => i === compIdx ? { ...e, ...patch } : e) };
      rounds[roundIdx] = round;
      ex.rounds = rounds;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const setRoundStatus = useCallback((exIdx: number, roundIdx: number, status: 'done' | 'skipped' | 'pending') => {
    Haptics.impactAsync(status === 'done' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const rounds = [...(ex.rounds || [])];
      rounds[roundIdx] = { ...rounds[roundIdx], status };
      ex.rounds = rounds;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
    if (status === 'done') {
      const ex = session?.exercises[exIdx];
      if (ex && ex.restSeconds > 0) startRestTimer(ex.restSeconds, ex.name);
    }
  }, [updateSession, session, startRestTimer]);

  const addRound = useCallback((exIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSession(s => {
      const exercises = [...s.exercises];
      const ex = { ...exercises[exIdx] };
      const rounds = [...(ex.rounds || [])];
      const last = rounds[rounds.length - 1];
      rounds.push({ status: 'pending', entries: (last?.entries || []).map(e => ({ ...e })) });
      ex.rounds = rounds;
      exercises[exIdx] = ex;
      return { ...s, exercises };
    });
  }, [updateSession]);

  const pendingCount = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((acc, ex) =>
      acc + (ex.combo
        ? (ex.rounds || []).filter(r => r.status === 'pending' || r.status === 'in_progress').length
        : ex.sets.filter(s => s.status === 'pending' || s.status === 'in_progress').length), 0);
  }, [session]);

  const handleFinish = useCallback(async () => {
    if (!session) return;
    const now = new Date();
    const startDate = new Date(session.startTimestamp);
    const durationMinutes = Math.round((now.getTime() - session.startTimestamp) / 60000);

    let totalVolumeKg = 0;
    let totalSets = 0;
    let completedSets = 0;
    let skippedSets = 0;
    let totalReps = 0;

    const tallySet = (status: string, type: string, reps: number, weight: number) => {
      totalSets++;
      if (status === 'done') completedSets++;
      if (status === 'skipped') skippedSets++;
      if (status === 'done' && type === 'reps') { totalVolumeKg += reps * weight; totalReps += reps; }
    };

    const logExercises: LogExercise[] = session.exercises.flatMap(ex => {
      // combo → expand into one LogExercise per component; each round becomes a set.
      if (ex.combo && ex.components) {
        const comboId = ex.exerciseId;
        return ex.components.map((c, ci) => ({
          exerciseId: c.exerciseId,
          name: c.name,
          muscleGroup: c.muscleGroup,
          comboId,
          comboLabel: ex.name,
          comboUnbroken: !!ex.unbroken,
          sets: (ex.rounds || []).map(r => {
            const raw = r.entries[ci];
            // entries persisted before per-component set types have no `type` → treat as reps
            const cfg: SetConfig = raw ? { ...raw, type: raw.type || 'reps' } : { type: 'reps', reps: 0, weight: 0 };
            tallySet(r.status, cfg.type, cfg.reps || 0, cfg.weight || 0);
            return { type: cfg.type, planned: { ...cfg }, actual: { ...cfg }, status: r.status } as LogSetData;
          }),
        }));
      }
      return [{
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets.map(s => {
          tallySet(s.status, s.actual.type, s.actual.reps || 0, s.actual.weight || 0);
          return { type: s.config.type, planned: s.config, actual: s.actual, status: s.status } as LogSetData;
        }),
      }];
    });

    const aiInsight = generateAiInsight(totalSets, completedSets, durationMinutes, totalVolumeKg, totalReps, session.exercises);

    const log: Omit<import('@/lib/app-context').WorkoutLog, 'id'> = {
      userId: user?.id || 'u1',
      name: session.workoutName,
      workoutType: session.workoutType,
      date: now.toISOString().split('T')[0],
      startTime: startDate.toISOString(),
      endTime: now.toISOString(),
      durationMinutes,
      preWorkout: session.preWorkout,
      totalVolumeKg,
      totalSets,
      completedSets,
      skippedSets,
      totalReps,
      exercises: logExercises,
      aiInsight,
    };

    // New-PR detection: compare this session's best done sets against the PR map
    // as it stood BEFORE saving (the save below is fire-and-forget, so fetch first).
    let newPrs: { name: string; weight: number; reps: number; prev: number }[] = [];
    try {
      const prevPrs = await workoutApi.prs(500);
      const prevMap = new Map(prevPrs.map((p) => [p.name, p.weight]));
      for (const ex of logExercises) {
        let best: { weight: number; reps: number } | null = null;
        for (const s of ex.sets) {
          if (s.status !== 'done' || s.actual?.type !== 'reps') continue;
          const weight = Number(s.actual.weight) || 0;
          if (weight > 0 && (!best || weight > best.weight)) best = { weight, reps: Number(s.actual.reps) || 0 };
        }
        const prev = prevMap.get(ex.name) ?? 0;
        if (best && best.weight > prev) newPrs.push({ name: ex.name, ...best, prev });
      }
    } catch {}

    const logId = Crypto.randomUUID();
    addWorkoutLog({ ...log, id: logId });
    setActiveSession(null);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    if (newPrs.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: '/workout-summary' as any,
      params: { logId, ...(newPrs.length ? { newPrs: JSON.stringify(newPrs) } : {}) },
    });
  }, [session, user, addWorkoutLog, setActiveSession]);

  if (!session) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <LinearGradient
          colors={['rgba(10,10,15,0.98)', 'rgba(10,10,15,0.85)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{session.workoutName}</Text>
          <View style={styles.timerRow}>
            <View style={styles.liveDot} />
            <Text style={[styles.headerTimer, { color: Colors.primary }]}>{elapsed}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowFinishModal(true)}
          style={[styles.finishBtn]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.finishBtnGrad}
          >
            <Text style={styles.finishBtnText}>{t('workoutSession.finish')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 70, paddingBottom: restTimer > 0 ? 160 + bottomPad : 100 + bottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {(() => {
          let done = 0, total = 0, vol = 0;
          for (const ex of session.exercises) {
            if (ex.combo) {
              for (const r of ex.rounds || []) {
                total++;
                if (r.status === 'done') { done++; for (const e of r.entries) { if (!e.type || e.type === 'reps') vol += (e.reps || 0) * (e.weight || 0); } }
              }
            } else for (const st of ex.sets) {
              total++;
              if (st.status === 'done') { done++; if (st.actual?.type === 'reps') vol += (st.actual.reps || 0) * (st.actual.weight || 0); }
            }
          }
          const pct = total ? done / total : 0;
          return (
            <View style={[styles.progressCard, { backgroundColor: theme.card }]}>
              <View style={styles.progRow}>
                <View style={styles.progStat}><Text style={[styles.progVal, { color: theme.text }]}>{done}/{total}</Text><Text style={[styles.progLbl, { color: theme.textMuted }]}>{t('workoutSession.sets')}</Text></View>
                <View style={styles.progStat}><Text style={[styles.progVal, { color: theme.text }]}>{Math.round(toDisplayWeight(vol, weightUnit)).toLocaleString()}</Text><Text style={[styles.progLbl, { color: theme.textMuted }]}>{t('workoutSession.volume')} ({unitLabel(weightUnit)})</Text></View>
                <View style={styles.progStat}><Text style={[styles.progVal, { color: Colors.primary }]}>{Math.round(pct * 100)}%</Text><Text style={[styles.progLbl, { color: theme.textMuted }]}>{t('workoutSession.done')}</Text></View>
              </View>
              <View style={styles.progTrack}><View style={[styles.progFill, { width: `${Math.round(pct * 100)}%` }]} /></View>
            </View>
          );
        })()}

        {session.preWorkout && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.preWorkoutCard, { backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <Ionicons name="flask-outline" size={18} color={Colors.accent} />
              <Text style={[styles.preWorkoutText, { color: theme.text }]}>{t('workoutSession.preWorkoutTaken')}</Text>
            </View>
          </Animated.View>
        )}

        {session.exercises.length > 1 && (() => {
          const allKeys = session.exercises.map((ex, i) => ex.exerciseId + '-' + i);
          const allCollapsed = allKeys.every(k => collapsed.has(k));
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCollapsed(allCollapsed ? new Set() : new Set(allKeys));
              }}
              hitSlop={6}
              style={styles.collapseAllBtn}
            >
              <Ionicons name={allCollapsed ? 'chevron-expand-outline' : 'chevron-collapse-outline'} size={14} color={theme.textMuted} />
              <Text style={[styles.collapseAllText, { color: theme.textMuted }]}>
                {allCollapsed ? t('workoutPrep.expandAll') : t('workoutPrep.collapseAll')}
              </Text>
            </Pressable>
          );
        })()}

        {session.exercises.map((ex, exIdx) => ex.combo ? (
          <Animated.View key={ex.exerciseId + '-' + exIdx} entering={FadeInDown.duration(350).delay(exIdx * 60)}>
            <ComboCard
              combo={ex}
              onUpdateEntry={(ri, ci, patch) => updateRoundEntry(exIdx, ri, ci, patch)}
              onRoundDone={(ri) => setRoundStatus(exIdx, ri, 'done')}
              onRoundSkip={(ri) => setRoundStatus(exIdx, ri, 'skipped')}
              onRoundReopen={(ri) => setRoundStatus(exIdx, ri, 'pending')}
              onAddRound={() => addRound(exIdx)}
              onFinishEmom={(completedMinutes) => finishComboEmom(exIdx, completedMinutes)}
              onDelete={() => deleteExercise(exIdx)}
              collapsed={collapsed.has(ex.exerciseId + '-' + exIdx)}
              onToggleCollapse={() => toggleCollapse(ex.exerciseId + '-' + exIdx)}
              theme={theme}
            />
          </Animated.View>
        ) : (
          <Animated.View key={ex.exerciseId + '-' + exIdx} entering={FadeInDown.duration(350).delay(exIdx * 60)}>
            <View style={[styles.exCard, { backgroundColor: theme.card }]}>
              <View style={styles.exCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exCardName, { color: theme.text }]}>{ex.name}</Text>
                  {collapsed.has(ex.exerciseId + '-' + exIdx) && (
                    <Text style={[styles.collapsedSummary, { color: theme.textMuted }]}>
                      {t('workoutPrep.setsSummary', { n: ex.sets.length })}
                    </Text>
                  )}
                  {lastPerf[ex.name] && (
                    <View style={styles.lastPerfRow}>
                      <Ionicons name="time-outline" size={11} color={theme.textMuted} />
                      <Text style={[styles.lastPerfText, { color: theme.textMuted }]}>
                        {t('workoutSession.lastTimeHint', {
                          weight: toDisplayWeight(lastPerf[ex.name].weight, weightUnit),
                          unit: unitLabel(weightUnit),
                          reps: lastPerf[ex.name].reps,
                          date: new Date(lastPerf[ex.name].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                        })}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.muscleTag, { backgroundColor: Colors.primary + '18' }]}>
                  <Text style={[styles.muscleTagText, { color: Colors.primary }]}>{ex.muscleGroup}</Text>
                </View>
                <Pressable
                  onPress={() => toggleCollapse(ex.exerciseId + '-' + exIdx)}
                  hitSlop={8}
                  style={styles.menuBtn}
                >
                  <Ionicons name={collapsed.has(ex.exerciseId + '-' + exIdx) ? 'chevron-forward' : 'chevron-down'} size={18} color={theme.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setMenuExerciseIndex(exIdx)}
                  hitSlop={8}
                  style={styles.menuBtn}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                </Pressable>
              </View>

              {!collapsed.has(ex.exerciseId + '-' + exIdx) && (
                <>
                  {ex.sets.map((set, setIdx) => (
                    <SetRowItem
                      key={setIdx}
                      set={set}
                      setIndex={setIdx}
                      exerciseIndex={exIdx}
                      onMarkDone={() => markSetDone(exIdx, setIdx)}
                      onSkip={() => skipSet(exIdx, setIdx)}
                      onUpdateActual={(actual) => updateSetActual(exIdx, setIdx, actual)}
                      onReopen={() => reopenSet(exIdx, setIdx)}
                      theme={theme}
                    />
                  ))}
                </>
              )}
            </View>
          </Animated.View>
        ))}

        <View style={styles.addRowBtns}>
          <Pressable onPress={() => setShowExercisePicker(true)} style={[styles.addSplitBtn, { borderColor: Colors.primary + '40' }]}>
            <Ionicons name="add-circle-outline" size={19} color={Colors.primary} />
            <Text style={[styles.addExerciseText, { color: Colors.primary }]}>{t('workoutSession.addExercise')}</Text>
          </Pressable>
          <Pressable onPress={() => setShowComboBuilder(true)} style={[styles.addSplitBtn, { borderColor: Colors.accent + '40' }]}>
            <Ionicons name="git-merge-outline" size={19} color={Colors.accent} />
            <Text style={[styles.addExerciseText, { color: Colors.accent }]}>{t('workoutSession.addCombo')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {restTimer > 0 && (
        <View style={[styles.restBanner, { bottom: bottomPad + 8 }]}>
          <LinearGradient
            colors={['#FF8C00', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.restBannerGrad}
          >
            <View style={styles.restBannerContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.restBannerLabel}>{t('workoutSession.restWithName', { name: restExerciseName })}</Text>
                <Text style={styles.restBannerTime}>{formatCountdown(restTimer)}</Text>
              </View>
              <Pressable onPress={() => extendRest(-15)} hitSlop={6} style={styles.restAdjustBtn}>
                <Text style={styles.restAdjustText}>−15</Text>
              </Pressable>
              <Pressable onPress={() => extendRest(15)} hitSlop={6} style={styles.restAdjustBtn}>
                <Text style={styles.restAdjustText}>+15</Text>
              </Pressable>
              <Pressable onPress={skipRest} style={styles.skipRestBtn}>
                <Text style={styles.skipRestText}>{t('workoutSession.skip')}</Text>
                <Ionicons name="play-skip-forward" size={15} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.restProgressTrack}>
              <View style={[styles.restProgressFill, { width: `${restTotal > 0 ? (restTimer / restTotal) * 100 : 0}%` }]} />
            </View>
          </LinearGradient>
        </View>
      )}

      <Modal visible={showFinishModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFinishModal(false)}>
          <View style={[styles.finishSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>
            <Ionicons name="flag" size={32} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={[styles.finishSheetTitle, { color: theme.text }]}>{t('workoutSession.finishWorkoutQuestion')}</Text>
            {pendingCount > 0 && (
              <Text style={[styles.finishSheetSub, { color: Colors.accent }]}>
                {t('workoutSession.setsPending', { count: pendingCount })}
              </Text>
            )}
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowFinishModal(false);
                handleFinish();
              }}
              style={{ marginTop: 20 }}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.finishSheetBtn}
              >
                <Text style={styles.finishSheetBtnText}>{t('workoutSession.finishAnyway')}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => setShowFinishModal(false)}
              style={[styles.keepGoingBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.keepGoingText, { color: theme.text }]}>{t('workoutSession.keepGoing')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {menuExerciseIndex !== null && (
        <ExerciseMenuModal
          visible={true}
          onClose={() => setMenuExerciseIndex(null)}
          onAddSet={() => addSetToExercise(menuExerciseIndex)}
          onSkipAll={() => skipAllSets(menuExerciseIndex)}
          onMoveUp={() => moveExercise(menuExerciseIndex, -1)}
          onMoveDown={() => moveExercise(menuExerciseIndex, 1)}
          canMoveUp={menuExerciseIndex > 0}
          canMoveDown={menuExerciseIndex < session.exercises.length - 1}
          onDelete={() => {
            deleteExercise(menuExerciseIndex);
            setMenuExerciseIndex(null);
          }}
          theme={theme}
        />
      )}

      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={addExercise}
        customExercises={customExercises}
        theme={theme}
      />

      <ComboBuilderModal
        visible={showComboBuilder}
        onClose={() => setShowComboBuilder(false)}
        onCreate={addCombo}
        customExercises={customExercises}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  headerTitle: { fontSize: 15, fontWeight: '600' as const },
  headerTimer: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 1 },
  finishBtn: { borderRadius: 16, overflow: 'hidden' },
  finishBtnGrad: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  finishBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  progressCard: { borderRadius: 16, padding: 16, gap: 12 },
  progRow: { flexDirection: 'row' },
  progStat: { flex: 1, alignItems: 'center', gap: 3 },
  progVal: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  progLbl: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  progTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,200,150,0.15)', overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3, backgroundColor: '#00C896' },
  preWorkoutCard: { borderRadius: 16, padding: 16 },
  preWorkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preWorkoutText: { flex: 1, fontSize: 15, fontWeight: '500' as const },
  exCard: { borderRadius: 16, overflow: 'hidden' },
  exCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 8 },
  exCardName: { fontSize: 16, fontWeight: '700' as const },
  lastPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lastPerfText: { fontSize: 11.5, fontWeight: '500' as const },
  muscleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  muscleTagText: { fontSize: 11, fontWeight: '600' as const },
  menuBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  collapsedSummary: { fontSize: 12, fontWeight: '500' as const, marginTop: 3 },
  collapseAllBtn: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  collapseAllText: { fontSize: 12, fontWeight: '600' as const },
  setRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, gap: 8,
  },
  setRowCol: {
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  setRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  setRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  setCircleText: { fontSize: 11, fontWeight: '600' as const },
  setLabel: { fontSize: 14, fontWeight: '500' as const },
  setValue: { fontSize: 13 },
  strikethrough: { textDecorationLine: 'line-through' as const },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  editInput: {
    width: 52, height: 34, borderRadius: 8, borderWidth: 1,
    textAlign: 'center' as const, fontSize: 14, fontWeight: '600' as const,
  },
  editX: { fontSize: 11, fontWeight: '600' as const, marginBottom: 8 },
  inlineEditRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  inlineEditRowWide: { alignSelf: 'stretch', justifyContent: 'center', gap: 7 },
  inlineField: { alignItems: 'center', gap: 4 },
  inlineInput: {
    width: 44, height: 32, borderRadius: 8, borderWidth: 1,
    textAlign: 'center' as const, fontSize: 14, fontWeight: '600' as const,
    paddingVertical: 0,
  },
  inlineInputWide: { width: 54, height: 36, fontSize: 15 },
  inlineUnit: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  doneBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginLeft: 6,
  },
  doneBtnWide: { width: 38, height: 38, borderRadius: 19 },
  skipBtn: {
    width: 34, height: 34, borderRadius: 17, marginLeft: 4,
    borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: 'rgba(248,113,113,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,140,160,0.18)',
  },
  noteText: { fontSize: 12.5, fontWeight: '500' as const, flex: 1, lineHeight: 17 },
  noteEditWrap: {
    paddingHorizontal: 14, paddingTop: 9, paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,140,160,0.18)',
  },
  noteEditHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  noteEditLabel: {
    fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase',
    letterSpacing: 0.6, flex: 1,
  },
  noteDone: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteInput: {
    borderWidth: 1, borderRadius: 10, minHeight: 62,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, lineHeight: 18,
  },
  doneBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  doneBadgeText: { fontSize: 11, fontWeight: '700' as const },
  holdStartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  holdStartText: { fontSize: 12, fontWeight: '600' as const },
  timerFullCard: {
    marginHorizontal: 16, marginVertical: 8, borderRadius: 16,
    borderWidth: 1, padding: 20, alignItems: 'center', gap: 8,
  },
  timerPhaseLabel: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 2 },
  timerBigNumber: { fontSize: 56, fontWeight: '800' as const, fontVariant: ['tabular-nums' as const] },
  timerSubLabel: { fontSize: 13, fontWeight: '500' as const },
  timerPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginTop: 6,
  },
  timerPrimaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  timerSecondaryBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, marginTop: 4,
  },
  timerSecondaryBtnText: { fontSize: 13, fontWeight: '600' as const },
  progressBarContainer: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%', overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 3 },
  emomActiveCard: {
    marginHorizontal: 12, marginVertical: 8, borderRadius: 16,
    borderWidth: 1, padding: 16, gap: 12,
  },
  emomHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  emomIntervalBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
  },
  emomIntervalText: { fontSize: 13, fontWeight: '700' as const },
  emomRepsGoal: { fontSize: 13, fontWeight: '500' as const },
  emomTimerCenter: { alignItems: 'center', paddingVertical: 8 },
  emomTimerBig: { fontSize: 52, fontWeight: '800' as const, fontVariant: ['tabular-nums' as const] },
  emomProgressSection: { gap: 2 },
  emomOverallBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  emomOverallLabel: { fontSize: 11, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 4 },
  emomBtnRow: {
    flexDirection: 'row', gap: 10, justifyContent: 'center',
  },
  emomActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
  },
  emomActionBtnText: { fontSize: 14, fontWeight: '600' as const },
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  addExerciseText: { fontSize: 14, fontWeight: '600' as const },
  addRowBtns: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  addSplitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
  },
  // combo card
  comboTitleRow: { flexDirection: 'row', gap: 6 },
  comboChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  comboChipText: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  comboRound: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,140,160,0.18)' },
  comboRoundHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboRoundLabel: { fontSize: 14, fontWeight: '600' as const },
  comboRoundSummary: { fontSize: 12, flex: 1, textAlign: 'right' as const },
  comboCompRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8, marginTop: 8, paddingLeft: 32 },
  comboCompName: { fontSize: 13, fontWeight: '500' as const, flex: 1, minWidth: 80 },
  comboCompFields: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' as const, gap: 5, flexShrink: 1 },
  comboCompUnit: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  comboAddRound: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,140,160,0.18)' },
  comboAddRoundText: { fontSize: 13, fontWeight: '700' as const },
  // combo builder
  comboSelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  comboSelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  comboSelChipText: { fontSize: 12, fontWeight: '600' as const },
  comboCfgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 12 },
  comboCfgItem: { alignItems: 'center', gap: 6 },
  comboCfgLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  comboStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 16, fontWeight: '700' as const, minWidth: 20, textAlign: 'center' as const },
  comboToggle: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  comboToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  comboCreateBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  comboCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  restBanner: { position: 'absolute', left: 16, right: 16, borderRadius: 20, overflow: 'hidden' },
  restBannerGrad: { paddingHorizontal: 20, paddingVertical: 16 },
  restBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restBannerLabel: { color: '#fff', fontSize: 12, fontWeight: '500' as const, opacity: 0.9 },
  restBannerTime: { color: '#fff', fontSize: 28, fontWeight: '800' as const, fontVariant: ['tabular-nums' as const] },
  skipRestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
  },
  skipRestText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  restAdjustBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  restAdjustText: { color: '#fff', fontSize: 13, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
  restProgressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 12, overflow: 'hidden' },
  restProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', paddingHorizontal: 16 },
  modalHandle: { alignItems: 'center', paddingVertical: 10 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  finishSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40,
  },
  finishSheetTitle: { fontSize: 20, fontWeight: '700' as const, textAlign: 'center' as const },
  finishSheetSub: { fontSize: 14, fontWeight: '500' as const, textAlign: 'center' as const, marginTop: 6 },
  finishSheetBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  finishSheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  keepGoingBtn: {
    paddingVertical: 14, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, marginTop: 10,
  },
  keepGoingText: { fontSize: 15, fontWeight: '600' as const },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuSheet: { borderRadius: 16, width: SW * 0.7, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  menuItemText: { fontSize: 15, fontWeight: '500' as const },
  menuDivider: { height: 1, marginHorizontal: 16 },
});
