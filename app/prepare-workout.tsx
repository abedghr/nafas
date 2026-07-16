import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
  TextInput, Alert, Dimensions, KeyboardAvoidingView, Switch,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { exerciseLibrary, MUSCLE_GROUPS } from '@/src/features/workout/library-cache';
import type { SetConfig, TemplateExercise, WorkoutType, WorkoutTemplate } from '@/lib/app-context';
import { WORKOUT_TYPES, templateSig } from '@/lib/app-context';

const { width: SW } = Dimensions.get('window');

const SET_TYPES: SetConfig['type'][] = ['reps', 'hold', 'emom'];

const SET_TYPE_LABELS: Record<SetConfig['type'], string> = {
  reps: 'REPS',
  hold: 'HOLD',
  emom: 'EMOM',
};

const INTERVAL_OPTIONS = [30, 45, 60, 90, 120, 180];

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180];

function getDefaultSetConfig(type: SetConfig['type']): SetConfig {
  switch (type) {
    case 'reps': return { type: 'reps', reps: 10, weight: 0 };
    case 'hold': return { type: 'hold', durationSeconds: 30 };
    case 'emom': return { type: 'emom', repsPerInterval: 10, intervalSeconds: 60, totalIntervals: 10 };
  }
}

interface PrepExercise extends TemplateExercise { uid: string }

function SetTypeFields({ config, onChange, theme }: {
  config: SetConfig;
  onChange: (c: SetConfig) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [noteOpen, setNoteOpen] = useState(!!config.note);
  const inputStyle = [s.numInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }];
  const noteInputStyle = { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 };
  const noteField = noteOpen ? (
    <View style={s.fieldGroup}>
      <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.noteOptional')}</Text>
      <TextInput
        style={noteInputStyle}
        value={config.note || ''}
        onChangeText={v => onChange({ ...config, note: v })}
        placeholder={t('workoutPrep.notePlaceholder')}
        placeholderTextColor={theme.textMuted}
        autoFocus
      />
    </View>
  ) : (
    <Pressable onPress={() => setNoteOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 }}>
      <Ionicons name="add" size={13} color={theme.textMuted} />
      <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '500' }}>{t('workoutPrep.noteOptional')}</Text>
    </Pressable>
  );

  switch (config.type) {
    case 'reps':
      return (
        <View style={{ gap: 8 }}>
        <View style={s.setFieldsRow}>
          <View style={s.fieldGroup}>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.reps')}</Text>
            <TextInput
              style={inputStyle}
              value={String(config.reps || '')}
              onChangeText={v => onChange({ ...config, reps: parseInt(v) || 0 })}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={s.fieldGroup}>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.weightKg')}</Text>
            <TextInput
              style={inputStyle}
              value={config.weight ? String(config.weight) : ''}
              onChangeText={v => onChange({ ...config, weight: parseFloat(v) || 0 })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
        {noteField}
        </View>
      );
    case 'hold':
      return (
        <View style={{ gap: 8 }}>
        <View style={s.setFieldsRow}>
          <View style={s.fieldGroup}>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.durationSec')}</Text>
            <TextInput
              style={inputStyle}
              value={String(config.durationSeconds || '')}
              onChangeText={v => onChange({ ...config, durationSeconds: parseInt(v) || 0 })}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
        {noteField}
        </View>
      );
    case 'emom':
      const intervalSec = config.intervalSeconds || 60;
      return (
        <View style={{ gap: 8 }}>
          <View style={s.setFieldsRow}>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.repsPerInterval')}</Text>
              <TextInput
                style={inputStyle}
                value={String(config.repsPerInterval || '')}
                onChangeText={v => onChange({ ...config, repsPerInterval: parseInt(v) || 0 })}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.totalIntervals')}</Text>
              <TextInput
                style={inputStyle}
                value={String(config.totalIntervals || '')}
                onChangeText={v => onChange({ ...config, totalIntervals: parseInt(v) || 0 })}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
          <View style={s.fieldGroup}>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.weightKgOptional')}</Text>
            <TextInput
              style={inputStyle}
              value={config.weight ? String(config.weight) : ''}
              onChangeText={v => onChange({ ...config, weight: parseFloat(v) || 0 })}
              keyboardType="numeric"
              placeholder={t('workoutPrep.bodyweightPlaceholder')}
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.intervalDuration')}</Text>
            <View style={s.restOptions}>
              {INTERVAL_OPTIONS.map(sec => (
                <Pressable
                  key={sec}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange({ ...config, intervalSeconds: sec });
                  }}
                  style={[
                    s.restOption,
                    {
                      backgroundColor: intervalSec === sec ? Colors.primary : theme.surface,
                      borderColor: intervalSec === sec ? Colors.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: intervalSec === sec ? '#fff' : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {sec}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ backgroundColor: Colors.primary + '08', borderRadius: 8, padding: 8, marginTop: 2 }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
              {config.weight
                ? t('workoutPrep.emomSummaryWithWeight', { reps: config.repsPerInterval || 0, s: intervalSec, n: config.totalIntervals || 0, w: config.weight })
                : t('workoutPrep.emomSummary', { reps: config.repsPerInterval || 0, s: intervalSec, n: config.totalIntervals || 0 })}
            </Text>
          </View>
          {noteField}
        </View>
      );
  }
}

function SetRow({ setIndex, config, onUpdate, onRemove, theme }: {
  setIndex: number;
  config: SetConfig;
  onUpdate: (c: SetConfig) => void;
  onRemove: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [showTypePicker, setShowTypePicker] = useState(false);

  return (
    <View style={[s.setRow, { borderTopColor: theme.border }]}>
      <View style={s.setHeader}>
        <Text style={[s.setLabel, { color: theme.textSecondary }]}>{t('workoutPrep.setN', { n: setIndex + 1 })}</Text>
        <Pressable
          onPress={() => setShowTypePicker(!showTypePicker)}
          style={[s.typeChip, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}
        >
          <Text style={[s.typeChipText, { color: Colors.primary }]}>{SET_TYPE_LABELS[config.type]}</Text>
          <Ionicons name="chevron-down" size={12} color={Colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
        </Pressable>
      </View>
      {showTypePicker && (
        <View style={s.typePills}>
          {SET_TYPES.map(st => (
            <Pressable
              key={st}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdate(getDefaultSetConfig(st));
                setShowTypePicker(false);
              }}
              style={[
                s.typePill,
                {
                  backgroundColor: config.type === st ? Colors.primary : theme.surface,
                  borderColor: config.type === st ? Colors.primary : theme.border,
                },
              ]}
            >
              <Text style={[
                s.typePillText,
                { color: config.type === st ? '#fff' : theme.textSecondary },
              ]}>{SET_TYPE_LABELS[st]}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <SetTypeFields config={config} onChange={onUpdate} theme={theme} />
    </View>
  );
}

function ExerciseCard({ exercise, index, onUpdate, onRemove, drag, isActive, theme }: {
  exercise: PrepExercise;
  index: number;
  onUpdate: (ex: PrepExercise) => void;
  onRemove: () => void;
  drag?: () => void;
  isActive?: boolean;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [showRestPicker, setShowRestPicker] = useState(false);

  const updateSet = (setIdx: number, config: SetConfig) => {
    const newSets = [...exercise.sets];
    newSets[setIdx] = config;
    onUpdate({ ...exercise, sets: newSets });
  };

  const removeSet = (setIdx: number) => {
    if (exercise.sets.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSets = exercise.sets.filter((_, i) => i !== setIdx);
    onUpdate({ ...exercise, sets: newSets });
  };

  const addSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lastSet = exercise.sets[exercise.sets.length - 1];
    onUpdate({ ...exercise, sets: [...exercise.sets, { ...lastSet }] });
  };

  return (
    <View style={[s.exCard, { backgroundColor: theme.card, opacity: isActive ? 0.9 : 1, borderColor: isActive ? Colors.primary : 'transparent', borderWidth: 1 }]}>
        <View style={s.exCardHeader}>
          {drag && (
            <Pressable onLongPress={drag} delayLongPress={120} hitSlop={8} style={s.dragHandle}>
              <Ionicons name="reorder-three" size={22} color={theme.textMuted} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[s.exCardName, { color: theme.text }]} numberOfLines={1}>{exercise.name}</Text>
          </View>
          <View style={[s.muscleTag, { backgroundColor: Colors.primary + '18' }]}>
            <Text style={[s.muscleTagText, { color: Colors.primary }]}>{exercise.muscleGroup}</Text>
          </View>
        </View>

        {exercise.sets.map((setConfig, si) => (
          <SetRow
            key={si}
            setIndex={si}
            config={setConfig}
            onUpdate={c => updateSet(si, c)}
            onRemove={() => removeSet(si)}
            theme={theme}
          />
        ))}

        <Pressable onPress={addSet} style={s.addSetBtn}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
          <Text style={[s.addSetText, { color: Colors.primary }]}>{t('workoutPrep.addSet')}</Text>
        </Pressable>

        <View style={[s.restRow, { borderTopColor: theme.border }]}>
          <Text style={[s.restLabel, { color: theme.textSecondary }]}>{t('workoutPrep.restBetweenSets')}</Text>
          <Pressable
            onPress={() => setShowRestPicker(!showRestPicker)}
            style={[s.restChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[s.restChipText, { color: theme.text }]}>{exercise.restSeconds}s</Text>
            <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
          </Pressable>
        </View>

        {showRestPicker && (
          <View style={s.restOptions}>
            {REST_OPTIONS.map(r => (
              <Pressable
                key={r}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onUpdate({ ...exercise, restSeconds: r });
                  setShowRestPicker(false);
                }}
                style={[
                  s.restOption,
                  {
                    backgroundColor: exercise.restSeconds === r ? Colors.primary : theme.surface,
                    borderColor: exercise.restSeconds === r ? Colors.primary : theme.border,
                  },
                ]}
              >
                <Text style={{ color: exercise.restSeconds === r ? '#fff' : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {r}s
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRemove();
          }}
          style={s.deleteExBtn}
        >
          <Ionicons name="trash-outline" size={16} color="#FF4458" />
          <Text style={s.deleteExText}>{t('workoutPrep.removeExercise')}</Text>
        </Pressable>
      </View>
  );
}

function ExercisePickerModal({ visible, onClose, onSelect, customExercises, onCreateCustom, theme }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (ex: { id: string; name: string; muscleGroup: string; defaultSetType: string; isCustom?: boolean }) => void;
  customExercises: any[];
  onCreateCustom: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const allExercises = useMemo(() => {
    const lib = exerciseLibrary.map(e => ({ ...e, isCustom: false }));
    const custom = customExercises.map(e => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      defaultSetType: e.defaultSetType,
      isCustom: true,
    }));
    return [...lib, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (selectedGroup) {
      list = list.filter(e => e.muscleGroup === selectedGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [allExercises, selectedGroup, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end', flex: 1 }}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}>
            <View style={[s.handleBar, { backgroundColor: theme.border }]} />
          </View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutPrep.addExercise')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('workoutPrep.searchExercises')}
              placeholderTextColor={theme.textMuted}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
            <Pressable
              onPress={() => setSelectedGroup(null)}
              style={[s.filterChip, { backgroundColor: !selectedGroup ? Colors.primary : theme.card, borderColor: !selectedGroup ? Colors.primary : theme.border }]}
            >
              <Text style={[s.filterChipText, { color: !selectedGroup ? '#fff' : theme.textSecondary }]}>{t('workoutPrep.all')}</Text>
            </Pressable>
            {MUSCLE_GROUPS.map(g => (
              <Pressable
                key={g}
                onPress={() => setSelectedGroup(selectedGroup === g ? null : g)}
                style={[s.filterChip, { backgroundColor: selectedGroup === g ? Colors.primary : theme.card, borderColor: selectedGroup === g ? Colors.primary : theme.border }]}
              >
                <Text style={[s.filterChipText, { color: selectedGroup === g ? '#fff' : theme.textSecondary }]}>{g}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {filtered.map((ex, i) => (
              <Pressable
                key={ex.id + i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(ex);
                  onClose();
                }}
                style={({ pressed }) => [
                  s.exPickerItem,
                  { backgroundColor: pressed ? theme.card : 'transparent' },
                ]}
              >
                <View style={[s.exPickerIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.exPickerName, { color: theme.text }]}>{ex.name}</Text>
                    {ex.isCustom && (
                      <View style={[s.customBadge, { backgroundColor: Colors.accent + '20' }]}>
                        <Text style={[s.customBadgeText, { color: Colors.accent }]}>{t('workoutPrep.customBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.exPickerGroup, { color: theme.textMuted }]}>{ex.muscleGroup}</Text>
                </View>
                <Ionicons name="add-circle" size={22} color={Colors.primary} />
              </Pressable>
            ))}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onCreateCustom();
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginTop: 12, marginHorizontal: 16 }]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.createCustomBtn}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={s.createCustomText}>{t('workoutPrep.createCustomExercise')}</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CreateCustomModal({ visible, onClose, onSave, theme }: {
  visible: boolean;
  onClose: () => void;
  onSave: (ex: { userId: string; name: string; muscleGroup: string; defaultSetType: SetConfig['type']; notes: string; isCustom: true }) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [setType, setSetType] = useState<SetConfig['type']>('reps');
  const [notes, setNotes] = useState('');
  const [showMuscleDropdown, setShowMuscleDropdown] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('workoutPrep.requiredTitle'), t('workoutPrep.enterExerciseName'));
      return;
    }
    onSave({
      userId: 'u1',
      name: name.trim(),
      muscleGroup,
      defaultSetType: setType,
      notes: notes.trim(),
      isCustom: true,
    });
    setName('');
    setMuscleGroup(MUSCLE_GROUPS[0]);
    setSetType('reps');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[s.modalContent, { backgroundColor: theme.background, maxHeight: '80%' }]}>
            <View style={s.modalHandle}>
              <View style={[s.handleBar, { backgroundColor: theme.border }]} />
            </View>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutPrep.createCustomExercise')}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
              <View>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('workoutPrep.exerciseNameRequired')}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('workoutPrep.exerciseNamePlaceholder')}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('workoutPrep.muscleGroup')}</Text>
                <Pressable
                  onPress={() => setShowMuscleDropdown(!showMuscleDropdown)}
                  style={[s.fieldInput, s.dropdownTrigger, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontSize: 15 }}>{muscleGroup}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </Pressable>
                {showMuscleDropdown && (
                  <View style={[s.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {MUSCLE_GROUPS.map(g => (
                      <Pressable
                        key={g}
                        onPress={() => {
                          setMuscleGroup(g);
                          setShowMuscleDropdown(false);
                        }}
                        style={[s.dropdownItem, muscleGroup === g && { backgroundColor: Colors.primary + '15' }]}
                      >
                        <Text style={{ color: muscleGroup === g ? Colors.primary : theme.text, fontSize: 14 }}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('workoutPrep.defaultSetType')}</Text>
                <View style={s.typePills}>
                  {SET_TYPES.map(st => (
                    <Pressable
                      key={st}
                      onPress={() => setSetType(st)}
                      style={[
                        s.typePill,
                        {
                          backgroundColor: setType === st ? Colors.primary : theme.card,
                          borderColor: setType === st ? Colors.primary : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: setType === st ? '#fff' : theme.textSecondary, fontSize: 11, fontWeight: '600' }}>
                        {SET_TYPE_LABELS[st]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('workoutPrep.notesOptional')}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, height: 70, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('workoutPrep.notesPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  multiline
                />
              </View>

              <Pressable onPress={handleSave} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.saveBtn}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>{t('workoutPrep.saveExercise')}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const WORKOUT_TYPE_ICONS: Record<string, string> = {
  'Push Day': 'arrow-up-circle-outline',
  'Pull Day': 'arrow-down-circle-outline',
  'Leg Day': 'walk-outline',
  'Upper Body': 'body-outline',
  'Lower Body': 'footsteps-outline',
  'Full Body': 'fitness-outline',
  'Cardio': 'heart-outline',
  'HIIT': 'flash-outline',
  'Strength': 'barbell-outline',
  'Mobility': 'accessibility-outline',
  'Custom': 'create-outline',
};

function TemplatePickerModal({ visible, onClose, onSelect, templates, theme }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: WorkoutTemplate) => void;
  templates: WorkoutTemplate[];
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(t => t.name.toLowerCase().includes(q) || (t.workoutType || '').toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end', flex: 1 }}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}>
            <View style={[s.handleBar, { backgroundColor: theme.border }]} />
          </View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutPrep.loadSavedWorkout')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('workoutPrep.searchSavedWorkouts')}
              placeholderTextColor={theme.textMuted}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <Ionicons name="bookmark-outline" size={40} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontSize: 15 }}>
                  {templates.length === 0 ? t('workoutPrep.noSavedWorkouts') : t('workoutPrep.noMatchingWorkouts')}
                </Text>
              </View>
            ) : (
              filtered.map((tmpl, i) => {
                const totalSets = tmpl.exercises.reduce((a, e) => a + e.sets.length, 0);
                const muscles = [...new Set(tmpl.exercises.map(e => e.muscleGroup))].slice(0, 3);
                return (
                  <Pressable
                    key={tmpl.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(tmpl);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      s.templatePickerItem,
                      { backgroundColor: pressed ? theme.card : 'transparent' },
                    ]}
                  >
                    <View style={[s.templatePickerIcon, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name={(WORKOUT_TYPE_ICONS[tmpl.workoutType || ''] || 'barbell-outline') as any} size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.templatePickerName, { color: theme.text }]}>{tmpl.name}</Text>
                      <Text style={[s.templatePickerMeta, { color: theme.textMuted }]}>
                        {t('workoutPrep.templateMeta', { exercises: tmpl.exercises.length, sets: totalSets })}{tmpl.workoutType ? ` · ${tmpl.workoutType}` : ''}
                      </Text>
                      {muscles.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                          {muscles.map(m => (
                            <View key={m} style={[s.miniMuscleTag, { backgroundColor: Colors.primary + '12' }]}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.primary }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function PrepareWorkoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const {
    workoutTemplates, addWorkoutTemplate, setActiveSession,
    customExercises, addCustomExercise, user,
  } = useApp();
  const theme = Colors.dark;

  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [exercises, setExercises] = useState<PrepExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [preWorkout, setPreWorkout] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (templateId) {
      const tmpl = workoutTemplates.find(t => t.id === templateId);
      if (tmpl) {
        setWorkoutName(tmpl.name);
        setWorkoutType(tmpl.workoutType || null);
        setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() })));
      }
    }
  }, [templateId]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleLoadTemplate = useCallback((tmpl: WorkoutTemplate) => {
    setWorkoutName(tmpl.name);
    setWorkoutType(tmpl.workoutType || null);
    setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() })));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleAddExercise = useCallback((ex: { id: string; name: string; muscleGroup: string; defaultSetType: string; isCustom?: boolean }) => {
    const newEx: PrepExercise = {
      uid: Crypto.randomUUID(),
      exerciseId: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      restSeconds: 90,
      sets: [getDefaultSetConfig(ex.defaultSetType as SetConfig['type'])],
      isCustom: ex.isCustom,
    };
    setExercises(prev => [...prev, newEx]);
  }, []);

  const updateExercise = useCallback((idx: number, ex: PrepExercise) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = ex;
      return updated;
    });
  }, []);

  const removeExercise = useCallback((idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const resolvedName = useMemo(() => {
    if (workoutType && workoutType !== 'Custom') return workoutType;
    return workoutName.trim() || '';
  }, [workoutType, workoutName]);

  // content signature → dedup: a template with the same name+exercises is "already saved".
  // shared templateSig so this agrees with the summary screen + app-context dedup.
  const currentSig = useMemo(() => templateSig(resolvedName, exercises), [resolvedName, exercises]);
  const alreadySaved = useMemo(
    () => exercises.length > 0 && workoutTemplates.some((tpl) => templateSig(tpl.name, tpl.exercises) === currentSig),
    [workoutTemplates, currentSig, exercises.length],
  );

  const handleSaveTemplate = () => {
    if (!resolvedName) {
      Alert.alert(t('workoutPrep.nameRequiredTitle'), t('workoutPrep.nameRequiredOrType'));
      return;
    }
    if (exercises.length === 0) {
      Alert.alert(t('workoutPrep.noExercisesTitle'), t('workoutPrep.noExercisesSaveMsg'));
      return;
    }
    setTemplateName(resolvedName); // prefill, user can override (optional)
    setShowSaveModal(true);
  };

  const confirmSaveTemplate = () => {
    if (alreadySaved) { setShowSaveModal(false); return; } // never save the same template twice
    const name = templateName.trim() || resolvedName;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWorkoutTemplate({
      userId: user?.id || 'u1',
      name,
      workoutType: workoutType || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      exercises: exercises.map(e => ({
        exerciseId: e.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        restSeconds: e.restSeconds,
        sets: e.sets,
        isCustom: e.isCustom,
      })),
    });
    setShowSaveModal(false);
    Alert.alert(t('workoutPrep.savedTitle'), t('workoutPrep.savedToMyWorkouts', { name }));
  };

  const handleStartWorkout = () => {
    if (!resolvedName) {
      Alert.alert(t('workoutPrep.nameRequiredTitle'), workoutType === 'Custom' ? t('workoutPrep.nameRequiredCustom') : t('workoutPrep.nameRequiredSelectOrEnter'));
      return;
    }
    if (exercises.length === 0) {
      Alert.alert(t('workoutPrep.noExercisesTitle'), t('workoutPrep.noExercisesStartMsg'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveSession({
      workoutName: resolvedName,
      workoutType: workoutType || undefined,
      startTimestamp: Date.now(),
      preWorkout,
      exercises: exercises.map(e => ({
        exerciseId: e.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        restSeconds: e.restSeconds,
        sets: e.sets.map(setConfig => ({
          config: { ...setConfig },
          actual: { ...setConfig },
          status: 'pending' as const,
        })),
      })),
    });
    // replace (not push) so Back from the live session never returns to this "new workout" page
    router.replace('/live-workout' as any);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <LinearGradient
          colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0.7)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]}>{t('workoutPrep.newWorkout')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <DraggableFlatList
        data={exercises}
        keyExtractor={(item) => item.uid}
        onDragEnd={({ data }) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setExercises(data); }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad + 60, paddingBottom: 320 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>
            {workoutTemplates.length > 0 && exercises.length === 0 && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTemplatePicker(true); }}
                style={({ pressed }) => [s.loadTemplateBtn, { backgroundColor: theme.card, borderColor: Colors.primary + '30', opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name="download-outline" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.loadTemplateBtnTitle, { color: theme.text }]}>{t('workoutPrep.loadFromMyWorkouts')}</Text>
                  <Text style={[s.loadTemplateBtnSub, { color: theme.textMuted }]}>{t('workoutPrep.savedWorkoutsAvailable', { count: workoutTemplates.length })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            )}

            <View style={[s.nameCard, { backgroundColor: theme.card }]}>
              <Text style={[s.nameLabel, { color: theme.textSecondary }]}>{t('workoutPrep.whatAreYouTraining')}</Text>
              <View style={s.typeChipsGrid}>
                {WORKOUT_TYPES.map(wt => (
                  <Pressable
                    key={wt}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setWorkoutType(workoutType === wt ? null : wt as WorkoutType);
                      if (wt !== 'Custom') setWorkoutName('');
                    }}
                    style={[s.typeGridChip, { backgroundColor: workoutType === wt ? Colors.primary + '20' : theme.surface, borderColor: workoutType === wt ? Colors.primary : theme.border }]}
                  >
                    <Ionicons name={(WORKOUT_TYPE_ICONS[wt] || 'barbell-outline') as any} size={16} color={workoutType === wt ? Colors.primary : theme.textSecondary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: workoutType === wt ? Colors.primary : theme.textSecondary }}>{t(`workoutTypeNames.${wt}`)}</Text>
                  </Pressable>
                ))}
              </View>

              {workoutType === 'Custom' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.workoutNameRequired')}</Text>
                  <TextInput
                    style={[s.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                    value={workoutName}
                    onChangeText={setWorkoutName}
                    placeholder={t('workoutPrep.workoutNamePlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                  />
                </View>
              )}
            </View>

            {exercises.length === 0 && (
              <View style={[s.emptyState, { backgroundColor: theme.card }]}>
                <Ionicons name={resolvedName ? 'barbell-outline' : 'arrow-up-outline'} size={40} color={theme.textMuted} />
                <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>{resolvedName ? t('workoutPrep.noExercisesYet') : t('workoutPrep.pickTypeFirst')}</Text>
                <Text style={[s.emptyText, { color: theme.textMuted }]}>
                  {resolvedName ? t('workoutPrep.addExercisesHint') : t('workoutPrep.pickTypeHint')}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, drag, isActive, getIndex }) => {
          const i = getIndex() ?? 0;
          return (
            <ScaleDecorator>
              <View style={{ marginBottom: 14 }}>
                <ExerciseCard
                  exercise={item}
                  index={i}
                  onUpdate={updated => updateExercise(i, updated)}
                  onRemove={() => removeExercise(i)}
                  drag={drag}
                  isActive={isActive}
                  theme={theme}
                />
              </View>
            </ScaleDecorator>
          );
        }}
      />

      <View style={[s.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 }]}>
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.95)', 'rgba(10,10,15,1)']}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={() => {
            if (!resolvedName) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); Alert.alert(t('workoutPrep.pickTypeFirst'), t('workoutPrep.pickTypeHint')); return; }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPicker(true);
          }}
          style={({ pressed }) => [s.addExBtn, { opacity: !resolvedName ? 0.4 : pressed ? 0.9 : 1, borderColor: Colors.primary }]}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
          <Text style={[s.addExBtnText, { color: Colors.primary }]}>{t('workoutPrep.addExercise')}</Text>
        </Pressable>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPreWorkout(p => !p); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flash-outline" size={18} color={Colors.primary} />
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{t('workoutPrep.preWorkoutTaken')}</Text>
          </View>
          <Switch
            value={preWorkout}
            onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPreWorkout(v); }}
            trackColor={{ false: theme.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </Pressable>

        <View style={s.bottomRow}>
          <Pressable
            onPress={handleSaveTemplate}
            disabled={alreadySaved}
            style={({ pressed }) => [s.templateBtn, { opacity: alreadySaved ? 0.6 : pressed ? 0.9 : 1, backgroundColor: theme.card, borderColor: alreadySaved ? Colors.primary : theme.border }]}
          >
            <Ionicons name={alreadySaved ? 'checkmark-circle' : 'bookmark-outline'} size={16} color={Colors.primary} />
            <Text style={[s.templateBtnText, { color: alreadySaved ? Colors.primary : theme.text }]}>{alreadySaved ? t('workoutPrep.saved') : t('workoutPrep.save')}</Text>
          </Pressable>

          <Pressable
            onPress={handleStartWorkout}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.startBtn}
            >
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={s.startBtnText}>{t('workoutPrep.startWorkout')}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <ExercisePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddExercise}
        customExercises={customExercises}
        onCreateCustom={() => {
          setShowPicker(false);
          setTimeout(() => setShowCustomModal(true), 300);
        }}
        theme={theme}
      />

      <CreateCustomModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={(ex) => {
          addCustomExercise(ex);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        theme={theme}
      />

      <TemplatePickerModal
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleLoadTemplate}
        templates={workoutTemplates}
        theme={theme}
      />

      <Modal visible={showSaveModal} animationType="fade" transparent onRequestClose={() => setShowSaveModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 20, gap: 14 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{t('workoutPrep.saveAsTemplate')}</Text>
            <View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 6 }}>{t('workoutPrep.templateNameOptional')}</Text>
              <TextInput
                style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={resolvedName || t('workoutPrep.templateNamePlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 6 }}>{t('workoutPrep.leaveBlankToUse', { name: resolvedName })}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable onPress={() => setShowSaveModal(false)} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('workoutPrep.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmSaveTemplate} style={{ flex: 1 }}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 13, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('workoutPrep.save')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  nameCard: {
    borderRadius: 16,
    padding: 16,
  },
  nameLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  exCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exCardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dragHandle: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  setRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
    paddingBottom: 4,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  setFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldMiniLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '600',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    backgroundColor: Colors.primary + '0D',
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  restLabel: {
    fontSize: 12,
    flex: 1,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  restChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  restOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  deleteExText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4458',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed' as any,
  },
  addExBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  chipsScroll: {
    flexGrow: 0,
    height: 52,
    marginBottom: 12,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 16,
    alignItems: 'center',
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    includeFontPadding: false,
  },
  exPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  exPickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exPickerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  exPickerGroup: {
    fontSize: 11,
    marginTop: 2,
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  createCustomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  loadTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadTemplateBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadTemplateBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  typeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  typeGridChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  templatePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  templatePickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templatePickerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  templatePickerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  miniMuscleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
