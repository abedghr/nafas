import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  TextInput, FlatList, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { confirmDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { workoutTypes, exerciseLibrary } from '@/src/features/workout/library-cache';
import * as Crypto from 'expo-crypto';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

const CATEGORIES = ['all', 'push', 'pull', 'legs', 'core', 'calisthenics'];
const REST_OPTIONS = [60, 90, 120, 180];

interface ExerciseSet {
  reps: string;
  weight: string;
  completed: boolean;
}

interface ActiveExercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

function TypeCard({ type, index, onPress, theme }: { type: typeof workoutTypes[0]; index: number; onPress: () => void; theme: any }) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)} style={{ width: CARD_WIDTH }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.typeCard,
          { backgroundColor: theme.card, transform: [{ scale: pressed ? 0.95 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.typeIconGradient}
        >
          <Ionicons name={type.icon as any} size={28} color="#fff" />
        </LinearGradient>
        <Text style={[styles.typeCardName, { color: theme.text }]}>{type.name}</Text>
      </Pressable>
    </Animated.View>
  );
}

function SetRow({ set, setIndex, exerciseId, onUpdate, onToggle, theme }: {
  set: ExerciseSet; setIndex: number; exerciseId: string;
  onUpdate: (id: string, idx: number, field: 'reps' | 'weight', val: string) => void;
  onToggle: (id: string, idx: number) => void;
  theme: any;
}) {
  return (
    <View style={[styles.setRow, set.completed && { backgroundColor: Colors.primary + '0A' }]}>
      <View style={styles.setCell}>
        <Text style={[styles.setCellText, { color: theme.textMuted }]}>{setIndex + 1}</Text>
      </View>
      <View style={styles.inputCell}>
        <TextInput
          style={[styles.setInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
          value={set.reps}
          onChangeText={v => onUpdate(exerciseId, setIndex, 'reps', v)}
          keyboardType="numeric"
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={theme.textMuted}
        />
      </View>
      <View style={styles.inputCell}>
        <TextInput
          style={[styles.setInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
          value={set.weight}
          onChangeText={v => onUpdate(exerciseId, setIndex, 'weight', v)}
          keyboardType="numeric"
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={theme.textMuted}
        />
      </View>
      <View style={styles.checkCell}>
        <Pressable onPress={() => onToggle(exerciseId, setIndex)} hitSlop={8}>
          <Ionicons
            name={set.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={26}
            color={set.completed ? Colors.primary : theme.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ExerciseCard({ exercise, onAddSet, onRemove, onUpdateSet, onToggleSet, theme }: {
  exercise: ActiveExercise;
  onAddSet: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateSet: (id: string, idx: number, field: 'reps' | 'weight', val: string) => void;
  onToggleSet: (id: string, idx: number) => void;
  theme: any;
}) {
  const { t } = useTranslation();
  const volume = exercise.sets.reduce((acc, s) => {
    if (!s.completed) return acc;
    return acc + (parseInt(s.reps) || 0) * (parseInt(s.weight) || 0);
  }, 0);

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.exerciseCard, { backgroundColor: theme.card }]}>
        <View style={styles.exerciseHeader}>
          <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
          <Pressable onPress={() => onRemove(exercise.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#FF4458" />
          </Pressable>
        </View>

        <View style={styles.tableHeader}>
          <View style={styles.setCell}>
            <Text style={[styles.tableHeaderText, { color: theme.textMuted }]}>{t('workoutPrep.set')}</Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={[styles.tableHeaderText, { color: theme.textMuted }]}>{t('workoutPrep.reps')}</Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={[styles.tableHeaderText, { color: theme.textMuted }]}>{t('workoutPrep.weightKg')}</Text>
          </View>
          <View style={styles.checkCell}>
            <Ionicons name="checkmark" size={14} color={theme.textMuted} />
          </View>
        </View>

        {exercise.sets.map((set, idx) => (
          <SetRow
            key={idx}
            set={set}
            setIndex={idx}
            exerciseId={exercise.id}
            onUpdate={onUpdateSet}
            onToggle={onToggleSet}
            theme={theme}
          />
        ))}

        <View style={styles.exerciseFooter}>
          <Pressable
            onPress={() => onAddSet(exercise.id)}
            style={[styles.addSetBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={[styles.addSetText, { color: Colors.primary }]}>{t('workoutPrep.addSet')}</Text>
          </Pressable>
          {volume > 0 && (
            <Text style={[styles.volumeText, { color: theme.textSecondary }]}>
              {t('workoutPrep.volKg', { vol: volume.toLocaleString() })}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function WorkoutLoggerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, addWorkout } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [phase, setPhase] = useState<'select' | 'active' | 'complete'>('select');
  const [selectedType, setSelectedType] = useState('');
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [preWorkout, setPreWorkout] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const startTimeRef = useRef(Date.now());
  const restInterval = useRef<any>(null);

  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (restActive && restTimer > 0) {
      pulseOpacity.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
      restInterval.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setRestActive(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      pulseOpacity.value = 1;
    }
    return () => { if (restInterval.current) clearInterval(restInterval.current); };
  }, [restActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const totalVolume = useMemo(() => {
    return exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((setAcc, s) => {
        if (!s.completed) return setAcc;
        return setAcc + (parseInt(s.reps) || 0) * (parseInt(s.weight) || 0);
      }, 0), 0
    );
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exerciseLibrary.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const addExercise = useCallback((exercise: typeof exerciseLibrary[0]) => {
    const newEx: ActiveExercise = {
      id: Crypto.randomUUID(),
      name: exercise.name,
      sets: [{ reps: '', weight: '', completed: false }],
    };
    setExercises(prev => [...prev, newEx]);
    setShowExercisePicker(false);
    setSearchQuery('');
    setSelectedCategory('all');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addSet = useCallback((exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { reps: lastSet?.reps || '', weight: lastSet?.weight || '', completed: false }] };
      }
      return ex;
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateSet = useCallback((exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  }, []);

  const toggleSetComplete = useCallback((exerciseId: string, setIndex: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        const wasCompleted = newSets[setIndex].completed;
        newSets[setIndex] = { ...newSets[setIndex], completed: !wasCompleted };
        if (!wasCompleted) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setRestTimer(restDuration);
          setRestActive(true);
        }
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  }, [restDuration]);

  const removeExercise = useCallback((exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleClose = async () => {
    if (exercises.length > 0) {
      if (await confirmDialog({ title: t('workoutPrep.discardWorkoutTitle'), message: t('workoutPrep.discardWorkoutMsg'), destructive: true, confirmText: t('workoutPrep.discard'), cancelText: t('workoutPrep.cancel') })) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const finishWorkout = () => {
    if (exercises.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const duration = Math.max(Math.round(elapsedSeconds / 60), 1);
    const allVolume = exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((setAcc, s) => setAcc + (parseInt(s.reps) || 0) * (parseInt(s.weight) || 0), 0), 0
    );
    addWorkout({
      type: selectedType || 'Custom',
      date: new Date().toISOString().split('T')[0],
      duration,
      preWorkout,
      exercises: exercises.map(ex => ({
        id: Crypto.randomUUID(),
        name: ex.name,
        sets: ex.sets.map(s => ({ reps: parseInt(s.reps) || 0, weight: parseInt(s.weight) || 0 })),
      })),
      totalVolume: allVolume,
    });
    setPhase('complete');
  };

  const topPad = Platform.OS === 'web' ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (phase === 'complete') {
    const duration = Math.max(Math.round(elapsedSeconds / 60), 1);
    const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient colors={[Colors.primary + '25', 'transparent']} style={styles.completeGradient}>
          <View style={[styles.completeContent, { paddingTop: topPad + 40 }]}>
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={styles.completeIconWrap}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.completeIconBg}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </LinearGradient>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <Text style={[styles.completeTitle, { color: theme.text }]}>{t('workoutPrep.workoutComplete')}</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.completeSummary}>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <Ionicons name="time-outline" size={24} color={Colors.primary} />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{duration}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('workoutPrep.min')}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <Ionicons name="barbell-outline" size={24} color={Colors.accent} />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{exercises.length}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('workoutPrep.exercises')}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <Ionicons name="layers-outline" size={24} color="#FFD93D" />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{completedSets}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{t('workoutPrep.sets')}</Text>
              </View>
            </Animated.View>
            {totalVolume > 0 && (
              <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <View style={[styles.volumeCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.volumeCardLabel, { color: theme.textSecondary }]}>{t('workoutPrep.totalVolume')}</Text>
                  <Text style={[styles.volumeCardValue, { color: theme.text }]}>{t('workoutPrep.kgValue', { value: totalVolume.toLocaleString() })}</Text>
                </View>
              </Animated.View>
            )}
            <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ width: '100%' }}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>{t('workoutPrep.done')}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (phase === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.selectHeader, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.selectTitle, { color: theme.text }]}>{t('workoutPrep.startWorkout')}</Text>
          <View style={{ width: 28 }} />
        </View>
        <Text style={[styles.selectSubtitle, { color: theme.textSecondary }]}>{t('workoutPrep.chooseWorkoutType')}</Text>
        <ScrollView contentContainerStyle={styles.typeGrid} showsVerticalScrollIndicator={false}>
          {workoutTypes.map((type, index) => (
            <TypeCard
              key={type.id}
              type={type}
              index={index}
              theme={theme}
              onPress={() => {
                setSelectedType(type.name);
                setPhase('active');
                startTimeRef.current = Date.now();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.activeHeader, { paddingTop: topPad }]}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.activeTitle, { color: theme.text }]}>{selectedType}</Text>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color={Colors.primary} />
            <Text style={[styles.timerText, { color: Colors.primary }]}>{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <View style={[styles.preWorkoutRow, { backgroundColor: theme.card }]}>
        <View style={styles.preWorkoutLeft}>
          <Ionicons name="flash" size={18} color="#FFD93D" />
          <Text style={[styles.preWorkoutLabel, { color: theme.text }]}>{t('workoutPrep.preWorkout')}</Text>
        </View>
        <Pressable
          onPress={() => { setPreWorkout(!preWorkout); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.toggle, { backgroundColor: preWorkout ? Colors.primary : theme.border }]}
        >
          <View style={[styles.toggleKnob, { transform: [{ translateX: preWorkout ? 20 : 2 }] }]} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setShowExercisePicker(true)}
          style={({ pressed }) => [styles.addExerciseBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.addExerciseBtnGrad}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addExerciseBtnText}>{t('workoutPrep.addExercise')}</Text>
          </LinearGradient>
        </Pressable>

        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onAddSet={addSet}
            onRemove={removeExercise}
            onUpdateSet={updateSet}
            onToggleSet={toggleSetComplete}
            theme={theme}
          />
        ))}

        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('workoutPrep.addExercisesToStart')}</Text>
          </View>
        )}
      </ScrollView>

      {restActive && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.restBanner, { backgroundColor: theme.card, bottom: 100 + bottomPad }]}
        >
          <Animated.View style={[styles.restBannerInner, pulseStyle]}>
            <Ionicons name="timer-outline" size={20} color={Colors.accent} />
            <Text style={[styles.restBannerTime, { color: theme.text }]}>
              {t('workoutPrep.rest', { time: formatTime(restTimer) })}
            </Text>
          </Animated.View>
          <View style={styles.restOptions}>
            {REST_OPTIONS.map(sec => (
              <Pressable
                key={sec}
                onPress={() => { setRestTimer(sec); setRestDuration(sec); }}
                style={[styles.restChip, sec === restDuration && { backgroundColor: Colors.primary + '20' }]}
              >
                <Text style={[styles.restChipText, { color: sec === restDuration ? Colors.primary : theme.textSecondary }]}>
                  {sec}s
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { setRestActive(false); setRestTimer(0); }} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View style={[styles.bottomBar, { backgroundColor: theme.surface, paddingBottom: Math.max(bottomPad, 16), borderTopColor: theme.border }]}>
        <View style={styles.bottomLeft}>
          <Text style={[styles.bottomVolumeLabel, { color: theme.textMuted }]}>{t('workoutPrep.totalVolume')}</Text>
          <Text style={[styles.bottomVolumeValue, { color: theme.text }]}>{t('workoutPrep.kgValue', { value: totalVolume.toLocaleString() })}</Text>
        </View>
        <Pressable
          onPress={finishWorkout}
          disabled={exercises.length === 0}
          style={({ pressed }) => [{ opacity: exercises.length === 0 ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.finishBtn}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.finishBtnText}>{t('workoutPrep.finishWorkout')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Modal visible={showExercisePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('workoutPrep.addExercise')}</Text>
              <Pressable onPress={() => { setShowExercisePicker(false); setSearchQuery(''); setSelectedCategory('all'); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={t('workoutPrep.searchExercises')}
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selectedCategory === cat ? Colors.primary : theme.card },
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: selectedCategory === cat ? '#fff' : theme.textSecondary },
                  ]}>
                    {t(`workoutPrep.category_${cat}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <FlatList
              data={filteredExercises}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addExercise(item)}
                  style={({ pressed }) => [styles.exerciseOption, { backgroundColor: pressed ? theme.card : 'transparent' }]}
                >
                  <View style={styles.exerciseOptionLeft}>
                    <Text style={[styles.exerciseOptionName, { color: theme.text }]}>{item.name}</Text>
                    <View style={styles.muscleTags}>
                      {item.muscles.map((m: string) => (
                        <View key={m} style={[styles.muscleTag, { backgroundColor: Colors.primary + '15' }]}>
                          <Text style={[styles.muscleTagText, { color: Colors.primary }]}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={[styles.emptySearchText, { color: theme.textMuted }]}>{t('workoutPrep.noExercisesFound')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  selectHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  selectTitle: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  selectSubtitle: { fontSize: 14, fontFamily: 'Rubik_400Regular', paddingHorizontal: 20, marginBottom: 16 },

  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20,
    gap: CARD_GAP, paddingBottom: 40,
  },
  typeCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  typeIconGradient: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  typeCardName: { fontSize: 14, fontFamily: 'Rubik_600SemiBold', textAlign: 'center' },

  activeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerCenter: { alignItems: 'center' },
  activeTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timerText: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },

  preWorkoutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, padding: 14, borderRadius: 14, marginBottom: 12,
  },
  preWorkoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preWorkoutLabel: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  toggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },

  addExerciseBtn: { marginHorizontal: 20, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  addExerciseBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  addExerciseBtnText: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', color: '#fff' },

  exerciseCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  exerciseName: { fontSize: 16, fontFamily: 'Rubik_600SemiBold', flex: 1, marginRight: 8 },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 4 },
  tableHeaderText: { fontSize: 11, fontFamily: 'Rubik_500Medium', textAlign: 'center' },

  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  setCell: { width: 36, alignItems: 'center', justifyContent: 'center' },
  setCellText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  inputCell: { flex: 1, paddingHorizontal: 4 },
  setInput: {
    height: 38, borderRadius: 10, textAlign: 'center',
    fontSize: 15, fontFamily: 'Rubik_500Medium',
  },
  checkCell: { width: 40, alignItems: 'center', justifyContent: 'center' },

  exerciseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  addSetText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  volumeText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 15, fontFamily: 'Rubik_400Regular' },

  restBanner: {
    position: 'absolute', left: 20, right: 20,
    borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  restBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  restBannerTime: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  restOptions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  restChipText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1,
  },
  bottomLeft: {},
  bottomVolumeLabel: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  bottomVolumeValue: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  finishBtnText: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20 },
  modalHandle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Rubik_700Bold' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46,
    borderRadius: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },

  categoryRow: { marginBottom: 12, maxHeight: 36 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  categoryChipText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },

  exerciseOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 },
  exerciseOptionLeft: { flex: 1, marginRight: 12 },
  exerciseOptionName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 4 },
  muscleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  muscleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  muscleTagText: { fontSize: 11, fontFamily: 'Rubik_400Regular' },

  separator: { height: 1 },
  emptySearch: { alignItems: 'center', paddingVertical: 40 },
  emptySearchText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },

  completeGradient: { flex: 1 },
  completeContent: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  completeIconWrap: { marginBottom: 20 },
  completeIconBg: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  completeTitle: { fontSize: 28, fontFamily: 'Rubik_700Bold', textAlign: 'center', marginBottom: 32 },
  completeSummary: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 24, fontFamily: 'Rubik_700Bold' },
  summaryLabel: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  volumeCard: {
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  volumeCardLabel: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  volumeCardValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  doneBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', color: '#fff' },
});
