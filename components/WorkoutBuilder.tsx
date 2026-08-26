import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
  TextInput, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { toDisplayWeight, fromDisplayWeight, unitLabel } from '@/lib/units';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { workoutApi, EQUIPMENT_OPTIONS, MUSCLE_CATEGORIES } from '@/src/features/workout/api';
import ComboBuilderModal, { type ComboBuildResult, type ComboSetType } from '@/components/ComboBuilderModal';
import IntervalBuilderModal, { formatDuration } from '@/components/IntervalBuilderModal';
import ExerciseRow from '@/components/ExerciseRow';
import ExerciseFilterBar from '@/components/ExerciseFilterBar';
import { matchExercise } from '@/lib/exercise-search';
import { muscleLabel, equipLabel } from '@/lib/exercise-i18n';
import type { SetConfig, TemplateExercise, WorkoutType, AssistKind } from '@/lib/app-context';
import { WORKOUT_TYPES } from '@/lib/app-context';

const SET_TYPES: SetConfig['type'][] = ['reps', 'hold', 'emom'];

const SET_TYPE_LABELS: Record<SetConfig['type'], string> = {
  reps: 'REPS',
  hold: 'HOLD',
  emom: 'EMOM',
};

const INTERVAL_OPTIONS = [30, 45, 60, 90, 120, 180];

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180];

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

// fine primary-muscle label → the app's coarse muscle group (for legacy filters/icons)
const MUSCLE_TO_GROUP: Record<string, string> = {
  Abdominals: 'Core', Biceps: 'Arms', Chest: 'Chest', Forearms: 'Arms', Lats: 'Back',
  'Lower Back': 'Back', Shoulders: 'Shoulders', Traps: 'Back', Triceps: 'Arms', 'Upper Back': 'Back',
  Adductors: 'Legs', Calves: 'Legs', Glutes: 'Legs', Hamstrings: 'Legs', Quadriceps: 'Legs',
  Cardio: 'Cardio', 'Full Body': 'Full Body',
};

function getDefaultSetConfig(type: SetConfig['type']): SetConfig {
  switch (type) {
    case 'reps': return { type: 'reps', reps: 10, weight: 0 };
    case 'hold': return { type: 'hold', durationSeconds: 30 };
    case 'emom': return { type: 'emom', repsPerInterval: 10, intervalSeconds: 60, totalIntervals: 10 };
  }
}

export interface PrepExercise extends TemplateExercise { uid: string }

function SetTypeFields({ config, onChange, theme }: {
  config: SetConfig;
  onChange: (c: SetConfig) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const [noteOpen, setNoteOpen] = useState(!!config.note);
  const [advOpen, setAdvOpen] = useState(false);
  const inputStyle =[s.numInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }];
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

  // advanced per-set target: tempo, assistance, to-failure, RPE (composable prescription)
  const advActive = !!(config.tempo || (config.assist && config.assist !== 'none') || config.toFailure || config.rpe);
  const ASSISTS: { k: AssistKind; label: string }[] = [
    { k: 'none', label: t('workoutPrep.assistNone', { defaultValue: 'None' }) },
    { k: 'band', label: t('workoutPrep.assistBand', { defaultValue: 'Band' }) },
    { k: 'assisted', label: t('workoutPrep.assistMachine', { defaultValue: 'Assisted' }) },
  ];
  const advanced = advActive || advOpen ? (
    <View style={{ gap: 8, marginTop: 2 }}>
      <View style={s.setFieldsRow}>
        <View style={s.fieldGroup}>
          <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.tempo', { defaultValue: 'Tempo' })}</Text>
          <TextInput style={inputStyle} value={config.tempo || ''} onChangeText={v => onChange({ ...config, tempo: v || undefined })} placeholder="3/1/2/0" placeholderTextColor={theme.textMuted} />
        </View>
        <View style={s.fieldGroup}>
          <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.rpe', { defaultValue: 'RPE' })}</Text>
          <TextInput style={inputStyle} value={config.rpe ? String(config.rpe) : ''} onChangeText={v => onChange({ ...config, rpe: parseInt(v) || undefined })} keyboardType="numeric" placeholder="—" placeholderTextColor={theme.textMuted} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {ASSISTS.map(a => {
          const on = (config.assist || 'none') === a.k;
          return (
            <Pressable key={a.k} onPress={() => onChange({ ...config, assist: a.k === 'none' ? undefined : a.k })} style={[s.assistChip, { backgroundColor: on ? Colors.electric : theme.surface, borderColor: on ? Colors.electric : theme.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#04120B' : theme.textSecondary }}>{a.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => onChange({ ...config, toFailure: config.toFailure ? undefined : true })} style={[s.assistChip, { flexDirection: 'row', gap: 4, backgroundColor: config.toFailure ? Colors.accent : theme.surface, borderColor: config.toFailure ? Colors.accent : theme.border }]}>
          <Ionicons name="flame" size={12} color={config.toFailure ? '#fff' : theme.textMuted} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: config.toFailure ? '#fff' : theme.textSecondary }}>{config.type === 'hold' ? t('workoutPrep.maxHold', { defaultValue: 'Max hold' }) : t('workoutPrep.toFailure', { defaultValue: 'To failure' })}</Text>
        </Pressable>
      </View>
    </View>
  ) : (
    <Pressable onPress={() => setAdvOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 }}>
      <Ionicons name="options-outline" size={13} color={theme.textMuted} />
      <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '500' }}>{t('workoutPrep.advanced', { defaultValue: 'Advanced' })}</Text>
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
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.weightKg', { unit: unitLabel(weightUnit) })}</Text>
            <TextInput
              style={inputStyle}
              value={config.weight ? String(toDisplayWeight(config.weight, weightUnit)) : ''}
              onChangeText={v => onChange({ ...config, weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
        {advanced}
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
          <View style={s.fieldGroup}>
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.weightKgOptional', { unit: unitLabel(weightUnit) })}</Text>
            <TextInput
              style={inputStyle}
              value={config.weight ? String(toDisplayWeight(config.weight, weightUnit)) : ''}
              onChangeText={v => onChange({ ...config, weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
              keyboardType="numeric"
              placeholder={t('workoutPrep.bodyweightPlaceholder')}
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
        {advanced}
        {noteField}
        </View>
      );
    case 'emom':
      const intervalSec = config.intervalSeconds || 60;
      const nIv = config.totalIntervals || 0;
      const baseReps = config.repsPerInterval || 0;
      // custom mode = per-minute reps override present (same exercise every minute)
      const emomCustom = (config.minutes?.length ?? 0) > 0;
      // Normalized per-minute reps (length nIv)
      const emomRows: number[] = Array.from({ length: nIv }, (_, i) => config.minutes?.[i] ?? baseReps);
      const commitEmom = (next: number[]) => onChange({ ...config, minutes: next });
      const toggleEmomCustom = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (emomCustom) onChange({ ...config, minutes: undefined });
        else commitEmom(emomRows);
      };
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
            <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.weightKgOptional', { unit: unitLabel(weightUnit) })}</Text>
            <TextInput
              style={inputStyle}
              value={config.weight ? String(toDisplayWeight(config.weight, weightUnit)) : ''}
              onChangeText={v => onChange({ ...config, weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
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
          {/* per-minute reps customization (same exercise every minute), or keep uniform */}
          <View style={{ gap: 8 }}>
            <Pressable onPress={toggleEmomCustom} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.perMinuteReps', { defaultValue: 'Customize each minute' })}</Text>
              <View style={[s.cpToggleSm, { backgroundColor: emomCustom ? Colors.primary : theme.border }]}>
                <View style={[s.cpToggleSmDot, { alignSelf: emomCustom ? 'flex-end' : 'flex-start' }]} />
              </View>
            </Pressable>
            {emomCustom && (
              <>
                {emomRows.map((reps, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', width: 20, textAlign: 'center' }}>{i + 1}</Text>
                    <TextInput
                      style={[inputStyle, { width: 52, height: 38 }]}
                      value={reps ? String(reps) : ''}
                      onChangeText={v => {
                        const next = [...emomRows];
                        next[i] = parseInt(v) || 0;
                        commitEmom(next);
                      }}
                      keyboardType="numeric" placeholder={String(baseReps)} placeholderTextColor={theme.textMuted}
                    />
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600' }}>{t('workoutPrep.reps')}</Text>
                  </View>
                ))}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const first = emomRows[0] ?? baseReps;
                    commitEmom(Array.from({ length: nIv }, () => first));
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}
                >
                  <Ionicons name="copy-outline" size={13} color={Colors.primary} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>{t('workoutPrep.applyMinute1ToAll', { defaultValue: 'Make all minutes the same' })}</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={{ backgroundColor: Colors.primary + '08', borderRadius: 8, padding: 8, marginTop: 2 }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
              {config.weight
                ? t('workoutPrep.emomSummaryWithWeight', { reps: config.repsPerInterval || 0, s: intervalSec, n: config.totalIntervals || 0, w: toDisplayWeight(config.weight, weightUnit), unit: unitLabel(weightUnit) })
                : t('workoutPrep.emomSummary', { reps: config.repsPerInterval || 0, s: intervalSec, n: config.totalIntervals || 0 })}
            </Text>
          </View>
          {advanced}
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

// Planning card for a combo set (rounds / reps-each / unbroken; components list).
function ComboPrepCard({ exercise, onUpdate, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, collapsed, onToggleCollapse, theme }: {
  exercise: PrepExercise;
  onUpdate: (ex: PrepExercise) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const rounds = exercise.comboRounds ?? 1;
  const components = exercise.components ?? [];
  const comboMode = exercise.mode ?? 'circuit'; // combos without mode behave as circuit
  const isEmom = comboMode === 'emom';
  const intervalSec = exercise.intervalSeconds ?? 60;
  type PrepComboComp = (typeof components)[number];

  const updateComponent = (ci: number, patch: Partial<PrepComboComp>) => {
    onUpdate({ ...exercise, components: components.map((c, i) => i === ci ? { ...c, ...patch } : c) });
  };

  // switching type seeds sensible defaults for that type's fields (once)
  const setComponentType = (ci: number, setType: ComboSetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const c = components[ci];
    if (!c) return;
    if (setType === 'hold') updateComponent(ci, { setType, durationSeconds: c.durationSeconds ?? 30 });
    else if (setType === 'emom') updateComponent(ci, { setType, repsPerInterval: c.repsPerInterval ?? 10, intervalSeconds: c.intervalSeconds ?? 60, totalIntervals: c.totalIntervals ?? 10 });
    else updateComponent(ci, { setType, reps: c.reps ?? 8 });
  };

  const removeComponent = (ci: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = components.filter((_, i) => i !== ci);
    onUpdate({ ...exercise, components: next, name: next.map(c => c.name).join(' + ') });
  };

  return (
    <View style={[s.exCard, { backgroundColor: theme.card, borderColor: Colors.accent + '30', borderWidth: 1 }]}>
      <View style={s.exCardHeader}>
        <View style={s.reorderCol}>
          <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={6} style={s.reorderBtn}>
            <Ionicons name="chevron-up" size={18} color={canMoveUp ? theme.textSecondary : theme.textMuted + '55'} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={6} style={s.reorderBtn}>
            <Ionicons name="chevron-down" size={18} color={canMoveDown ? theme.textSecondary : theme.textMuted + '55'} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={[s.cpChip, { backgroundColor: Colors.accent + '18' }]}>
              <Ionicons name="git-merge-outline" size={11} color={Colors.accent} />
              <Text style={[s.cpChipText, { color: Colors.accent }]}>{t('workoutSession.combo')}</Text>
            </View>
            <View style={[s.cpChip, { backgroundColor: Colors.primary + '18' }]}>
              <Text style={[s.cpChipText, { color: Colors.primary }]}>
                {isEmom ? `${t('workoutSession.emom')} · ${intervalSec}${t('workoutSession.sec')}` : t('workoutSession.circuit')}
              </Text>
            </View>
            {!isEmom && exercise.unbroken && (
              <View style={[s.cpChip, { backgroundColor: Colors.primary + '18' }]}>
                <Text style={[s.cpChipText, { color: Colors.primary }]}>{t('workoutSession.unbroken')}</Text>
              </View>
            )}
          </View>
          <Text style={[s.exCardName, { color: theme.text, marginTop: 4 }]} numberOfLines={2}>{exercise.name}</Text>
          {collapsed && (
            <Text style={[s.collapsedSummary, { color: theme.textMuted }]}>
              {t('workoutPrep.comboSummary', { r: rounds, m: components.length })}
            </Text>
          )}
        </View>
        <Pressable onPress={onToggleCollapse} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={theme.textMuted} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {!collapsed && (
      <>
      {/* components: each with its own set type + type-specific fields */}
      <View style={s.cpComponents}>
        {components.map((c, ci) => {
          const ty = c.setType ?? 'reps';
          const inputStyle = [s.cpCompInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }];
          return (
            <View key={ci} style={s.cpCompBlock}>
              <View style={s.cpCompHead}>
                <Text style={[s.cpCompIdx, { color: Colors.accent }]}>{ci + 1}</Text>
                <Text style={[s.cpCompName, { color: theme.textSecondary }]} numberOfLines={1}>{c.name}</Text>
                <Pressable onPress={() => removeComponent(ci)} hitSlop={6}>
                  <Ionicons name="close-circle" size={17} color={Colors.accent} />
                </Pressable>
              </View>
              <View style={s.cpCompCtl}>
                <View style={s.cpTypeChipRow}>
                  {(['reps', 'hold', 'emom'] as const).map(opt => (
                    <Pressable
                      key={opt}
                      onPress={() => setComponentType(ci, opt)}
                      style={[s.cpTypeChip, { borderColor: ty === opt ? Colors.accent : theme.border, backgroundColor: ty === opt ? Colors.accent + '18' : 'transparent' }]}
                    >
                      <Text style={[s.cpTypeChipText, { color: ty === opt ? Colors.accent : theme.textMuted }]}>{t(`workoutSession.${opt}`)}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={s.cpFieldRow}>
                  {ty === 'hold' ? (
                    <>
                      <TextInput
                        style={inputStyle}
                        value={c.durationSeconds ? String(c.durationSeconds) : ''}
                        onChangeText={(v) => updateComponent(ci, { durationSeconds: parseInt(v) || 0 })}
                        keyboardType="numeric" placeholder="30" placeholderTextColor={theme.textMuted} selectTextOnFocus
                      />
                      <Text style={[s.cpCompUnit, { color: theme.textMuted }]}>{t('workoutSession.sec')}</Text>
                    </>
                  ) : ty === 'emom' ? (
                    <>
                      <TextInput
                        style={inputStyle}
                        value={c.repsPerInterval ? String(c.repsPerInterval) : ''}
                        onChangeText={(v) => updateComponent(ci, { repsPerInterval: parseInt(v) || 0 })}
                        keyboardType="numeric" placeholder="10" placeholderTextColor={theme.textMuted} selectTextOnFocus
                      />
                      <Text style={[s.cpCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                      <TextInput
                        style={inputStyle}
                        value={c.totalIntervals ? String(c.totalIntervals) : ''}
                        onChangeText={(v) => updateComponent(ci, { totalIntervals: parseInt(v) || 0 })}
                        keyboardType="numeric" placeholder="10" placeholderTextColor={theme.textMuted} selectTextOnFocus
                      />
                      <Text style={[s.cpCompUnit, { color: theme.textMuted }]}>×</Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={inputStyle}
                        value={c.reps ? String(c.reps) : ''}
                        onChangeText={(v) => updateComponent(ci, { reps: parseInt(v) || 0 })}
                        keyboardType="numeric" placeholder="8" placeholderTextColor={theme.textMuted} selectTextOnFocus
                      />
                      <Text style={[s.cpCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                    </>
                  )}
                  <TextInput
                    style={inputStyle}
                    value={c.weight ? String(toDisplayWeight(c.weight, weightUnit)) : ''}
                    onChangeText={(v) => updateComponent(ci, { weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
                    keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                  />
                  <Text style={[s.cpCompUnit, { color: theme.textMuted }]}>{unitLabel(weightUnit)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* mode: circuit / emom */}
      <View style={s.cpModeRow}>
        {(['circuit', 'emom'] as const).map(m => (
          <Pressable
            key={m}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onUpdate({ ...exercise, mode: m, intervalSeconds: exercise.intervalSeconds ?? 60 }); }}
            style={[s.cpModeSeg, { borderColor: comboMode === m ? Colors.accent : theme.border, backgroundColor: comboMode === m ? Colors.accent + '18' : 'transparent' }]}
          >
            <Text style={[s.cpModeSegText, { color: comboMode === m ? Colors.accent : theme.textMuted }]}>
              {m === 'circuit' ? t('workoutSession.circuit') : t('workoutSession.emom')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* rounds/cycles + unbroken (circuit) / interval (emom) */}
      <View style={s.cpCfgRow}>
        <View style={s.cpCfgItem}>
          <Text style={[s.cpCfgLabel, { color: theme.textMuted }]}>{isEmom ? t('workoutSession.cycles') : t('workoutSession.rounds')}</Text>
          <View style={s.cpStepper}>
            <Pressable onPress={() => onUpdate({ ...exercise, comboRounds: Math.max(1, rounds - 1) })} hitSlop={8} style={[s.cpStepBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={16} color={theme.text} /></Pressable>
            <Text style={[s.cpStepVal, { color: theme.text }]}>{rounds}</Text>
            <Pressable onPress={() => onUpdate({ ...exercise, comboRounds: Math.min(20, rounds + 1) })} hitSlop={8} style={[s.cpStepBtn, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={theme.text} /></Pressable>
          </View>
        </View>
        {isEmom ? (
          <View style={s.cpCfgItem}>
            <Text style={[s.cpCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.intervalSec')}</Text>
            <TextInput
              style={[s.cpCompInput, { width: 56, backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={intervalSec ? String(intervalSec) : ''}
              onChangeText={v => onUpdate({ ...exercise, intervalSeconds: parseInt(v) || 0 })}
              keyboardType="numeric" placeholder="60" placeholderTextColor={theme.textMuted} selectTextOnFocus
            />
          </View>
        ) : (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onUpdate({ ...exercise, unbroken: !exercise.unbroken }); }} style={s.cpCfgItem}>
            <Text style={[s.cpCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.unbroken')}</Text>
            <View style={[s.cpToggle, { backgroundColor: exercise.unbroken ? Colors.primary : theme.border }]}>
              <View style={[s.cpToggleDot, { alignSelf: exercise.unbroken ? 'flex-end' : 'flex-start' }]} />
            </View>
          </Pressable>
        )}
      </View>
      {isEmom && (
        <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '500', paddingHorizontal: 16, marginTop: -10, paddingBottom: 14 }}>
          {t('workoutSession.everyMinute')}: 1 → {Math.max(components.length, 1)} · {Math.max(components.length, 1) * rounds} min
        </Text>
      )}
      </>
      )}
    </View>
  );
}

// Read-only summary card for an interval / cardio block. Authoring only — no set
// editor, no live execution (later phase). Shows "work / recovery × rounds".
function IntervalPrepCard({ exercise, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, theme }: {
  exercise: PrepExercise;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const iv = exercise.intervals;

  const bout = (measure?: 'time' | 'distance', durationSeconds?: number, distanceMeters?: number) =>
    measure === 'distance' ? `${distanceMeters || 0}m` : formatDuration(durationSeconds || 0);

  const workStr = iv
    ? bout(iv.work.measure, iv.work.durationSeconds, iv.work.distanceMeters) + (iv.work.pace ? ` @ ${iv.work.pace}` : '')
    : '';
  const recStr = iv?.recovery
    ? `${bout(iv.recovery.measure, iv.recovery.durationSeconds, iv.recovery.distanceMeters)} ${iv.recovery.kind === 'passive' ? t('intervalBuilder.passive', { defaultValue: 'passive' }) : t('intervalBuilder.active', { defaultValue: 'active' })}`
    : '';
  const summary = iv
    ? `${workStr}${recStr ? ` / ${recStr}` : ''} × ${iv.rounds}`
    : '';

  return (
    <View style={[s.exCard, { backgroundColor: theme.card, borderColor: Colors.electric + '30', borderWidth: 1 }]}>
      <View style={s.exCardHeader}>
        <View style={s.reorderCol}>
          <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={6} style={s.reorderBtn}>
            <Ionicons name="chevron-up" size={18} color={canMoveUp ? theme.textSecondary : theme.textMuted + '55'} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={6} style={s.reorderBtn}>
            <Ionicons name="chevron-down" size={18} color={canMoveDown ? theme.textSecondary : theme.textMuted + '55'} />
          </Pressable>
        </View>
        <View style={[s.muscleTag, { backgroundColor: Colors.electric + '18', marginRight: 10 }]}>
          <Ionicons name="pulse-outline" size={16} color={Colors.electric} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            <View style={[s.cpChip, { backgroundColor: Colors.electric + '18' }]}>
              <Ionicons name="pulse-outline" size={11} color={Colors.electric} />
              <Text style={[s.cpChipText, { color: Colors.electric }]}>{t('intervalBuilder.tag', { defaultValue: 'Interval' })}</Text>
            </View>
          </View>
          <Text style={[s.exCardName, { color: theme.text }]} numberOfLines={1}>{exercise.name}</Text>
          <Text style={[s.collapsedSummary, { color: theme.textMuted }]}>{summary}</Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function ExerciseCard({ exercise, index, onUpdate, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, lastPerf, collapsed, onToggleCollapse, theme }: {
  exercise: PrepExercise;
  index: number;
  onUpdate: (ex: PrepExercise) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  lastPerf?: { date: string; weight: number; reps: number };
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
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
    <View style={[s.exCard, { backgroundColor: theme.card, borderColor: 'transparent', borderWidth: 1 }]}>
        <View style={s.exCardHeader}>
          <View style={s.reorderCol}>
            <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={6} style={s.reorderBtn}>
              <Ionicons name="chevron-up" size={18} color={canMoveUp ? theme.textSecondary : theme.textMuted + '55'} />
            </Pressable>
            <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={6} style={s.reorderBtn}>
              <Ionicons name="chevron-down" size={18} color={canMoveDown ? theme.textSecondary : theme.textMuted + '55'} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.exCardName, { color: theme.text }]} numberOfLines={1}>{exercise.name}</Text>
            {lastPerf && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/exercise-progress?name=${encodeURIComponent(exercise.name)}` as any); }}
                hitSlop={6}
                style={s.lastPerfRow}
              >
                <Ionicons name="time-outline" size={11} color={theme.textMuted} />
                <Text style={[s.lastPerfText, { color: theme.textMuted }]}>
                  {t('workoutSession.lastTimeHint', {
                    weight: toDisplayWeight(lastPerf.weight, weightUnit),
                    unit: unitLabel(weightUnit),
                    reps: lastPerf.reps,
                    date: new Date(lastPerf.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                  })}
                </Text>
                <Ionicons name="stats-chart" size={11} color={Colors.primary} />
              </Pressable>
            )}
            {collapsed && (
              <Text style={[s.collapsedSummary, { color: theme.textMuted }]}>
                {t('workoutPrep.setsSummary', { n: exercise.sets.length })}
              </Text>
            )}
          </View>
          <View style={[s.muscleTag, { backgroundColor: Colors.primary + '18' }]}>
            <Text style={[s.muscleTagText, { color: Colors.primary }]}>{exercise.muscleGroup}</Text>
          </View>
          <Pressable onPress={onToggleCollapse} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={theme.textMuted} />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        {!collapsed && (
        <>
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
        </>
        )}
      </View>
  );
}

function ExercisePickerModal({ visible, onClose, onSelect, onInfo, highlightName, customExercises, onCreateCustom, theme }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (ex: { id: string; name: string; muscleGroup: string; defaultSetType: string; isCustom?: boolean }) => void;
  onInfo: (name: string) => void;      // parent handles nav + reopening this picker on return
  highlightName?: string | null;       // exercise whose info was last opened → highlight its button
  customExercises: any[];
  onCreateCustom: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  // when reopened after viewing an exercise's info, scroll that exercise back into view
  const scrollRef = useRef<ScrollView>(null);
  const rowRef = useRef<View>(null);
  useEffect(() => {
    if (!visible || !highlightName) return;
    const id = setTimeout(() => {
      const node = rowRef.current, sc = scrollRef.current;
      if (node && sc) {
        try { (node as any).measureLayout(sc, (_x: number, y: number) => sc.scrollTo({ y: Math.max(0, y - 100), animated: true }), () => {}); } catch {}
      }
    }, 300);
    return () => clearTimeout(id);
  }, [visible, highlightName]);

  const allExercises = useMemo(() => {
    const lib = exerciseLibrary.map(e => ({ ...e, isCustom: false }));
    const custom = customExercises.map(e => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      primaryMuscle: e.primaryMuscle || e.muscleGroup,
      equipment: e.equipment || '',
      defaultSetType: e.defaultSetType,
      isCustom: true,
    }));
    return [...lib, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (equipment) list = list.filter(e => e.equipment === equipment);
    if (muscle) list = list.filter(e => (e.primaryMuscle || e.muscleGroup) === muscle);
    if (search.trim()) {
      list = list.filter(e => matchExercise(search, e));
    }
    return list;
  }, [allExercises, equipment, muscle, search]);

  // Hevy-style grouping: searching → one flat A-Z list; otherwise the user's own
  // exercises first, then the full library, each sorted alphabetically.
  const sections = useMemo(() => {
    const byName = (a: any, b: any) => a.name.localeCompare(b.name);
    if (search.trim()) return [{ title: null as string | null, data: [...filtered].sort(byName) }];
    const custom = filtered.filter(e => e.isCustom).sort(byName);
    const lib = filtered.filter(e => !e.isCustom).sort(byName);
    const secs: { title: string | null; data: any[] }[] = [];
    if (custom.length) secs.push({ title: t('workoutPrep.myExercises'), data: custom });
    if (lib.length) secs.push({ title: t('workoutPrep.allExercises'), data: lib });
    return secs;
  }, [filtered, search, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
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

          <ExerciseFilterBar
            equipment={equipment}
            muscle={muscle}
            onEquipment={setEquipment}
            onMuscle={setMuscle}
            resultCount={filtered.length}
            theme={theme}
          />

          <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 }}>
            {filtered.length === 0 ? (
              <View style={s.pickerEmpty}>
                <View style={[s.pickerEmptyIcon, { backgroundColor: theme.card }]}>
                  <Ionicons name="search-outline" size={30} color={theme.textMuted} />
                </View>
                <Text style={[s.pickerEmptyTitle, { color: theme.text }]}>{t('workoutPrep.noExercisesFound', { defaultValue: 'No exercises found' })}</Text>
                <Text style={[s.pickerEmptySub, { color: theme.textMuted }]}>{t('workoutPrep.noExercisesHint', { defaultValue: 'Try a different search or filter — or create your own below.' })}</Text>
              </View>
            ) : sections.map((sec) => (
              <View key={sec.title || 'flat'}>
                {sec.title && (
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionHeaderText, { color: theme.textMuted }]}>{sec.title}</Text>
                    <Text style={[s.sectionHeaderCount, { color: theme.textMuted }]}>{sec.data.length}</Text>
                  </View>
                )}
                {sec.data.map((ex, i) => {
                  const isHi = !!highlightName && ex.name === highlightName;
                  return (
                  <View key={ex.id + i} ref={isHi ? rowRef : undefined}>
                  <ExerciseRow
                    ex={ex}
                    theme={theme}
                    highlighted={isHi}
                    onInfo={(name) => onInfo(name)}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(ex);
                      onClose();
                    }}
                  />
                  </View>
                  );
                })}
              </View>
            ))}

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreateCustom(); }}
              style={({ pressed }) => [s.createCustomGhost, { borderColor: Colors.accent + '66', opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="add" size={18} color={Colors.accent} />
              <Text style={[s.createCustomGhostText, { color: Colors.accent }]}>{t('workoutPrep.createCustomExercise')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// A single bottom-sheet picker (flat or categorized; single-select or multi).
function PickerSheet({ visible, title, sections, selected, multi, onPick, onToggle, onClose, theme, labelFn }: {
  visible: boolean;
  title: string;
  sections: { title: string; options: string[] }[];
  selected: string | string[] | null;
  multi?: boolean;
  onPick?: (v: string) => void;
  onToggle?: (v: string) => void;
  onClose: () => void;
  theme: typeof Colors.dark;
  labelFn?: (v: string) => string;
}) {
  const { t } = useTranslation();
  const isSel = (v: string) => (multi ? (selected as string[]).includes(v) : selected === v);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.pkOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.pkSheet, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={theme.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {sections.map((sec, si) => (
              <View key={si}>
                {!!sec.title && <Text style={[s.pkCatHeader, { color: theme.textMuted }]}>{sec.title}</Text>}
                <View style={s.pkGrid}>
                  {sec.options.map((opt) => {
                    const sel = isSel(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); multi ? onToggle?.(opt) : onPick?.(opt); }}
                        style={[s.pkOption, { backgroundColor: sel ? Colors.primary + '18' : theme.card, borderColor: sel ? Colors.primary : theme.border }]}
                      >
                        <Text style={[s.pkOptionText, { color: sel ? Colors.primary : theme.text }]} numberOfLines={1}>{labelFn ? labelFn(opt) : opt}</Text>
                        {sel && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          {multi && (
            <Pressable onPress={onClose} style={[s.pkDone, { backgroundColor: Colors.primary }]}>
              <Text style={s.pkDoneText}>{t('workoutPrep.done', { defaultValue: 'Done' })}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function CreateCustomModal({ visible, onClose, onSave, theme }: {
  visible: boolean;
  onClose: () => void;
  onSave: (ex: { userId: string; name: string; muscleGroup: string; primaryMuscle?: string; otherMuscles?: string[]; equipment?: string; defaultSetType: SetConfig['type']; notes: string; isCustom: true }) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { language } = useApp();
  const isAr = language === 'ar';
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<string | null>(null);
  const [primary, setPrimary] = useState<string | null>(null);
  const [others, setOthers] = useState<string[]>([]);
  const [setType, setSetType] = useState<SetConfig['type']>('reps');
  const [picker, setPicker] = useState<null | 'equipment' | 'primary' | 'other' | 'type'>(null);

  const reset = () => { setName(''); setEquipment(null); setPrimary(null); setOthers([]); setSetType('reps'); };
  const canSave = !!name.trim();

  const handleSave = () => {
    if (!canSave) { alertDialog(t('workoutPrep.requiredTitle'), t('workoutPrep.enterExerciseName')); return; }
    onSave({
      userId: 'u1',
      name: name.trim(),
      muscleGroup: MUSCLE_TO_GROUP[primary || ''] || 'Full Body',
      primaryMuscle: primary || undefined,
      otherMuscles: others.length ? others : undefined,
      equipment: equipment || undefined,
      defaultSetType: setType,
      notes: '',
      isCustom: true,
    });
    reset();
    onClose();
  };

  const muscleSections = MUSCLE_CATEGORIES.map((c) => ({ title: t(`exFilter.${c.key}`, { defaultValue: c.key }), options: c.muscles }));

  const Row = ({ label, value, optional, onPress }: { label: string; value?: string | null; optional?: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[s.ccRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.ccRowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[s.ccRowValue, { color: value ? Colors.primary : theme.textMuted }]} numberOfLines={1}>
          {value || t('workoutPrep.select', { defaultValue: 'Select' })}{optional && !value ? `  ${t('workoutPrep.optionalTag', { defaultValue: '(optional)' })}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[s.modalContent, { backgroundColor: theme.background, maxHeight: '90%' }]}>
            <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
            <View style={s.ccHeader}>
              <Pressable onPress={onClose} hitSlop={8} style={s.ccHeaderBtn}><Ionicons name="close" size={22} color={theme.text} /></Pressable>
              <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutPrep.createExercise', { defaultValue: 'Create Exercise' })}</Text>
              <Pressable onPress={handleSave} hitSlop={8} style={[s.ccSaveBtn, { backgroundColor: canSave ? Colors.primary : theme.card }]}>
                <Text style={[s.ccSaveText, { color: canSave ? '#fff' : theme.textMuted }]}>{t('workoutPrep.save', { defaultValue: 'Save' })}</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
              <TextInput
                style={[s.ccNameInput, { color: theme.text, borderBottomColor: theme.border }]}
                value={name}
                onChangeText={setName}
                placeholder={t('workoutPrep.exerciseName', { defaultValue: 'Exercise Name' })}
                placeholderTextColor={theme.textMuted}
              />
              <Row label={t('workoutPrep.equipment', { defaultValue: 'Equipment' })} value={equipment ? equipLabel(equipment, isAr) : null} onPress={() => setPicker('equipment')} />
              <Row label={t('workoutPrep.primaryMuscleGroup', { defaultValue: 'Primary Muscle Group' })} value={primary ? muscleLabel(primary, isAr) : null} onPress={() => setPicker('primary')} />
              <Row label={t('workoutPrep.otherMuscles', { defaultValue: 'Other Muscles' })} value={others.map((m) => muscleLabel(m, isAr)).join('، ')} optional onPress={() => setPicker('other')} />
              <Row label={t('workoutPrep.exerciseType', { defaultValue: 'Exercise Type' })} value={SET_TYPE_LABELS[setType]} onPress={() => setPicker('type')} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <PickerSheet
        visible={picker === 'equipment'} title={t('workoutPrep.equipment', { defaultValue: 'Equipment' })} theme={theme}
        sections={[{ title: '', options: EQUIPMENT_OPTIONS }]} selected={equipment} labelFn={(v) => equipLabel(v, isAr)}
        onPick={(v) => { setEquipment(v); setPicker(null); }} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'primary'} title={t('workoutPrep.primaryMuscleGroup', { defaultValue: 'Primary Muscle Group' })} theme={theme}
        sections={muscleSections} selected={primary} labelFn={(v) => muscleLabel(v, isAr)}
        onPick={(v) => { setPrimary(v); setPicker(null); }} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'other'} title={t('workoutPrep.otherMuscles', { defaultValue: 'Other Muscles' })} theme={theme} multi
        sections={muscleSections} selected={others} labelFn={(v) => muscleLabel(v, isAr)}
        onToggle={(v) => setOthers((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'type'} title={t('workoutPrep.exerciseType', { defaultValue: 'Exercise Type' })} theme={theme}
        sections={[{ title: '', options: SET_TYPES.map((st) => SET_TYPE_LABELS[st]) }]} selected={SET_TYPE_LABELS[setType]}
        onPick={(lbl) => { const st = SET_TYPES.find((x) => SET_TYPE_LABELS[x] === lbl); if (st) setSetType(st); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
}

// ── the controlled builder ─────────────────────────────────────────────────
// Owns everything about authoring a workout's type + exercises, but holds no
// save/start/program logic — that stays with the host screen, which controls
// `workoutType` and `exercises` and reads them back via the on-change callbacks.
export default function WorkoutBuilder({
  workoutType, exercises, onChangeType, onChangeExercises, theme,
  workoutName, onChangeName, onViewAsText,
}: {
  workoutType: WorkoutType | null;
  exercises: PrepExercise[];
  onChangeType: (t: WorkoutType | null) => void;
  onChangeExercises: (ex: PrepExercise[]) => void;
  theme: typeof Colors.dark;
  // Optional: lets the host own the free-text name used by the "Custom" type.
  // Omit in contexts (e.g. program day editor) where the type alone names the day.
  workoutName?: string;
  onChangeName?: (name: string) => void;
  // Optional: render a "View as text" affordance in the tool row (host owns the modal).
  onViewAsText?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { customExercises, addCustomExercise, workoutTypes, isDark } = useApp();

  // Custom-type name is host-controlled when the props are given, else local.
  const [internalName, setInternalName] = useState('');
  const name = workoutName !== undefined ? workoutName : internalName;
  const setName = onChangeName ?? setInternalName;

  const [showPicker, setShowPicker] = useState(false);
  // exercise-info nav: RN <Modal> floats above pushed screens, so the picker must close
  // to show the info screen — remember to reopen it (with the viewed exercise highlighted)
  // when we return.
  const [infoHighlight, setInfoHighlight] = useState<string | null>(null);
  const reopenPicker = useRef(false);
  useFocusEffect(useCallback(() => {
    if (reopenPicker.current) { reopenPicker.current = false; setShowPicker(true); }
  }, []));
  const openExerciseInfo = useCallback((exName: string) => {
    setInfoHighlight(exName);
    reopenPicker.current = true;
    setShowPicker(false);
    router.push(`/exercise-progress?name=${encodeURIComponent(exName)}` as any);
  }, []);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [showIntervalBuilder, setShowIntervalBuilder] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((uid: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }, []);

  const handleAddExercise = (ex: { id: string; name: string; muscleGroup: string; defaultSetType: string; isCustom?: boolean }) => {
    const newEx: PrepExercise = {
      uid: Crypto.randomUUID(),
      exerciseId: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      restSeconds: 90,
      sets: [getDefaultSetConfig(ex.defaultSetType as SetConfig['type'])],
      isCustom: ex.isCustom,
    };
    onChangeExercises([...exercises, newEx]);
  };

  const handleAddCombo = (data: ComboBuildResult) => {
    const newEx: PrepExercise = {
      uid: Crypto.randomUUID(),
      exerciseId: 'combo-' + Crypto.randomUUID(),
      name: data.components.map(c => c.name).join(' + '),
      muscleGroup: 'Combo',
      restSeconds: data.restSeconds,
      sets: [],
      combo: true,
      unbroken: data.unbroken,
      components: data.components,
      comboRounds: Math.max(1, data.rounds),
      mode: data.mode ?? 'circuit',
      intervalSeconds: data.intervalSeconds ?? 60,
      timeCapSeconds: data.timeCapSeconds,
    };
    onChangeExercises([...exercises, newEx]);
  };

  const handleAddInterval = (block: TemplateExercise) => {
    const newEx: PrepExercise = { ...block, uid: Crypto.randomUUID() };
    onChangeExercises([...exercises, newEx]);
  };

  const updateExercise = (idx: number, ex: PrepExercise) => {
    onChangeExercises(exercises.map((e, i) => (i === idx ? ex : e)));
  };

  const removeExercise = (idx: number) => {
    onChangeExercises(exercises.filter((_, i) => i !== idx));
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= exercises.length) return;
    const arr = [...exercises];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onChangeExercises(arr);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // "Last time" per added exercise — helps pick the weight while planning
  const [lastPerf, setLastPerf] = useState<Record<string, { date: string; weight: number; reps: number }>>({});
  const exerciseNamesKey = exercises.map(e => e.name).join(',');
  useEffect(() => {
    const names = exerciseNamesKey ? exerciseNamesKey.split(',') : [];
    if (!names.length) return;
    workoutApi.lastPerformance(names).then(setLastPerf).catch(() => {});
  }, [exerciseNamesKey]);

  // training types from backend (localized), with a Custom option appended
  const trainingTypes = useMemo(() => {
    const fromApi = (workoutTypes || []).map((wt: any) => ({ name: wt.name as string, icon: (wt.icon || WORKOUT_TYPE_ICONS[wt.name] || 'barbell-outline') as string }));
    const base = fromApi.length ? fromApi : WORKOUT_TYPES.filter(w => w !== 'Custom').map(w => ({ name: w, icon: WORKOUT_TYPE_ICONS[w] || 'barbell-outline' }));
    return [...base, { name: 'Custom', icon: WORKOUT_TYPE_ICONS['Custom'] || 'create-outline' }];
  }, [workoutTypes]);

  const allCollapsed = exercises.length > 0 && exercises.every(e => collapsed.has(e.uid));

  return (
    <>
      <View style={{ gap: 14, marginBottom: 14 }}>
        <View style={[s.nameCard, { backgroundColor: theme.card }]}>
          <Text style={[s.nameLabel, { color: theme.textSecondary }]}>{t('workoutPrep.whatAreYouTraining')}</Text>
          {(() => {
            const selected = workoutType ? trainingTypes.find(x => x.name === workoutType) : null;
            const label = selected ? t(`workoutTypeNames.${selected.name}`, { defaultValue: selected.name }) : '';
            return (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTypeSearch(''); setTypePickerOpen(true); }}
                style={[s.typeDropdown, { backgroundColor: theme.surface, borderColor: selected ? Colors.primary : theme.border }]}
              >
                {selected ? (
                  <View style={s.typeDropdownSel}>
                    <Ionicons name={(selected.icon || 'barbell-outline') as any} size={18} color={Colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>{label}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 15, color: theme.textMuted }}>{t('workoutPrep.selectType', { defaultValue: 'Select training type' })}</Text>
                )}
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </Pressable>
            );
          })()}

          {workoutType === 'Custom' && (
            <View style={{ marginTop: 12 }}>
              <Text style={[s.fieldMiniLabel, { color: theme.textMuted }]}>{t('workoutPrep.workoutNameRequired')}</Text>
              <TextInput
                style={[s.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={name}
                onChangeText={setName}
                placeholder={t('workoutPrep.workoutNamePlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
            </View>
          )}
        </View>

        {exercises.length === 0 && (
          <View style={[s.emptyState, { backgroundColor: theme.card }]}>
            <Ionicons name={workoutType ? 'barbell-outline' : 'arrow-up-outline'} size={40} color={theme.textMuted} />
            <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>{workoutType ? t('workoutPrep.noExercisesYet') : t('workoutPrep.pickTypeFirst')}</Text>
            <Text style={[s.emptyText, { color: theme.textMuted }]}>
              {workoutType ? t('workoutPrep.addExercisesHint') : t('workoutPrep.pickTypeHint')}
            </Text>
          </View>
        )}
      </View>

      {exercises.length > 0 && (
        <View style={s.toolRow}>
          {onViewAsText && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onViewAsText(); }}
              hitSlop={6}
              style={s.collapseAllBtn}
            >
              <Ionicons name="list-outline" size={14} color={Colors.electric} />
              <Text style={[s.collapseAllText, { color: Colors.electric }]}>{t('workoutPrep.viewAsText', { defaultValue: 'View as text' })}</Text>
            </Pressable>
          )}
          {exercises.length > 1 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCollapsed(allCollapsed ? new Set() : new Set(exercises.map(e => e.uid)));
              }}
              hitSlop={6}
              style={s.collapseAllBtn}
            >
              <Ionicons name={allCollapsed ? 'chevron-expand-outline' : 'chevron-collapse-outline'} size={14} color={theme.textMuted} />
              <Text style={[s.collapseAllText, { color: theme.textMuted }]}>
                {allCollapsed ? t('workoutPrep.expandAll') : t('workoutPrep.collapseAll')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {exercises.map((item, i) => (
        <View key={item.uid} style={{ marginBottom: 14 }}>
          {item.kind === 'intervals' ? (
            <IntervalPrepCard
              exercise={item}
              onRemove={() => removeExercise(i)}
              onMoveUp={() => moveExercise(i, -1)}
              onMoveDown={() => moveExercise(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < exercises.length - 1}
              theme={theme}
            />
          ) : item.combo ? (
            <ComboPrepCard
              exercise={item}
              onUpdate={updated => updateExercise(i, updated)}
              onRemove={() => removeExercise(i)}
              onMoveUp={() => moveExercise(i, -1)}
              onMoveDown={() => moveExercise(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < exercises.length - 1}
              collapsed={collapsed.has(item.uid)}
              onToggleCollapse={() => toggleCollapse(item.uid)}
              theme={theme}
            />
          ) : (
            <ExerciseCard
              exercise={item}
              index={i}
              onUpdate={updated => updateExercise(i, updated)}
              onRemove={() => removeExercise(i)}
              onMoveUp={() => moveExercise(i, -1)}
              onMoveDown={() => moveExercise(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < exercises.length - 1}
              lastPerf={lastPerf[item.name]}
              collapsed={collapsed.has(item.uid)}
              onToggleCollapse={() => toggleCollapse(item.uid)}
              theme={theme}
            />
          )}
        </View>
      ))}

      {/* add-to-workout actions live in the scroll, below the list — not floating over it */}
      {(() => {
        const guard = (fn: () => void) => () => {
          if (!workoutType) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); alertDialog(t('workoutPrep.pickTypeFirst'), t('workoutPrep.pickTypeHint')); return; }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fn();
        };
        const tiles: { icon: any; label: string; color: string; onPress: () => void }[] = [
          { icon: 'add', label: t('workoutPrep.exercise', { defaultValue: 'Exercise' }), color: Colors.primary, onPress: guard(() => setShowPicker(true)) },
          { icon: 'git-merge-outline', label: t('workoutPrep.combo', { defaultValue: 'Combo' }), color: Colors.accent, onPress: guard(() => setShowComboBuilder(true)) },
          { icon: 'pulse-outline', label: t('workoutPrep.interval', { defaultValue: 'Interval' }), color: Colors.electric, onPress: guard(() => setShowIntervalBuilder(true)) },
        ];
        return (
          <View style={{ marginTop: 2 }}>
            <Text style={[s.addSectionLabel, { color: theme.textMuted }]}>{t('workoutPrep.addToWorkout', { defaultValue: 'Add to workout' })}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {tiles.map((c) => (
                <Pressable
                  key={c.label}
                  onPress={c.onPress}
                  style={({ pressed }) => [s.addTile, { backgroundColor: theme.card, borderColor: c.color + (isDark ? '55' : '40'), opacity: !workoutType ? 0.5 : pressed ? 0.85 : 1 }]}
                >
                  <View style={[s.addTileIcon, { backgroundColor: c.color + '1F' }]}>
                    <Ionicons name={c.icon} size={18} color={c.color} />
                  </View>
                  <Text style={[s.addTileText, { color: theme.text }]} numberOfLines={1}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })()}

      <Modal visible={typePickerOpen} transparent animationType="slide" onRequestClose={() => setTypePickerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.typeSheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypePickerOpen(false)} />
          <View style={[s.typeSheet, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 16 }]}>
            <View style={s.typeSheetHandle} />
            <View style={s.typeSheetHead}>
              <Text style={[s.typeSheetTitle, { color: theme.text }]}>{t('workoutPrep.whatAreYouTraining')}</Text>
              <Pressable onPress={() => setTypePickerOpen(false)} hitSlop={10}><Ionicons name="close" size={22} color={theme.textMuted} /></Pressable>
            </View>
            <View style={[s.typeSearchWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={16} color={theme.textMuted} />
              <TextInput style={[s.typeSearchInput, { color: theme.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} value={typeSearch} onChangeText={setTypeSearch} placeholder={t('common.search', { defaultValue: 'Search' })} placeholderTextColor={theme.textMuted} autoCapitalize="none" />
            </View>
            {/* Custom pinned on top so it's reachable without scrolling */}
            {(() => {
              const q = typeSearch.toLowerCase();
              const customLabel = t('workoutTypeNames.Custom', { defaultValue: 'Custom' });
              if (q && !customLabel.toLowerCase().includes(q) && !'custom'.includes(q)) return null;
              const active = workoutType === 'Custom';
              return (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChangeType('Custom' as WorkoutType);
                    setTypePickerOpen(false);
                  }}
                  style={[s.typeOption, { borderBottomColor: theme.border, backgroundColor: Colors.accent + '12', borderRadius: 12, marginBottom: 8, borderBottomWidth: 0, paddingHorizontal: 12 }]}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.accent} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: Colors.accent }}>{customLabel}</Text>
                  {active
                    ? <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                    : <Text style={{ fontSize: 12, color: theme.textMuted }}>{t('workoutPrep.customTypeHint', { defaultValue: 'name your own' })}</Text>}
                </Pressable>
              );
            })()}
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.42 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {trainingTypes
                .filter(wt => {
                  if (wt.name === 'Custom') return false; // pinned above
                  const label = t(`workoutTypeNames.${wt.name}`, { defaultValue: wt.name });
                  const q = typeSearch.toLowerCase();
                  return !q || label.toLowerCase().includes(q) || wt.name.toLowerCase().includes(q);
                })
                .map(wt => {
                  const active = workoutType === wt.name;
                  const label = t(`workoutTypeNames.${wt.name}`, { defaultValue: wt.name });
                  return (
                    <Pressable
                      key={wt.name}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onChangeType(wt.name as WorkoutType);
                        if (wt.name !== 'Custom') setName('');
                        setTypePickerOpen(false);
                      }}
                      style={[s.typeOption, { borderBottomColor: theme.border }]}
                    >
                      <Ionicons name={(wt.icon || 'barbell-outline') as any} size={20} color={active ? Colors.primary : theme.textSecondary} />
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: active ? Colors.primary : theme.text }}>{label}</Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ExercisePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddExercise}
        onInfo={openExerciseInfo}
        highlightName={infoHighlight}
        customExercises={customExercises}
        onCreateCustom={() => {
          setShowPicker(false);
          setTimeout(() => setShowCustomModal(true), 300);
        }}
        theme={theme}
      />

      <ComboBuilderModal
        visible={showComboBuilder}
        onClose={() => setShowComboBuilder(false)}
        onCreate={handleAddCombo}
        customExercises={customExercises}
        theme={theme}
      />

      <IntervalBuilderModal
        visible={showIntervalBuilder}
        onClose={() => setShowIntervalBuilder(false)}
        onCreate={handleAddInterval}
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
    </>
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
  typeDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 52 },
  typeDropdownSel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  typeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  typeSheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 14 },
  typeSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  typeSheetTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  typeSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 8 },
  typeSearchInput: { flex: 1, fontSize: 16 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  typeSelectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeSelectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primary + '18' },
  typeChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  reorderCol: { marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  collapsedSummary: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginBottom: 4 },
  collapseAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 8 },
  collapseAllText: { fontSize: 12, fontWeight: '600' },
  lastPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lastPerfText: { fontSize: 11.5, fontWeight: '500' },
  reorderBtn: { paddingVertical: 1 },
  cpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  cpChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpComponents: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  cpCompBlock: { gap: 5 },
  cpCompHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpCompCtl: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingLeft: 26 },
  cpTypeChipRow: { flexDirection: 'row', gap: 4 },
  cpTypeChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  cpTypeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpFieldRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  cpCompIdx: { fontSize: 12, fontWeight: '800', width: 16, textAlign: 'center' },
  cpCompName: { fontSize: 14, fontWeight: '500', flex: 1 },
  cpCompInput: { width: 44, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  cpCompUnit: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  cpModeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  cpModeSeg: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cpModeSegText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpCfgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  cpCfgItem: { alignItems: 'center', gap: 6 },
  cpCfgLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  cpStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpStepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cpStepVal: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cpRepsInput: { width: 56, height: 34, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  cpToggle: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  cpToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  cpToggleSm: { width: 40, height: 23, borderRadius: 12, padding: 3, justifyContent: 'center' },
  cpToggleSmDot: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#fff' },
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
  assistChip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, height: 30, borderRadius: 999, borderWidth: 1 },
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
  addSectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 },
  addTile: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  addTileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addTileText: { fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    height: '90%',
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
  createCustomGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 8,
  },
  createCustomGhostText: { fontSize: 14, fontWeight: '700' },
  pickerEmpty: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 24 },
  pickerEmptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerEmptyTitle: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  pickerEmptySub: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center', lineHeight: 19 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Create-custom (Hevy-style) header + rows
  ccHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 14 },
  ccHeaderBtn: { width: 40, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  ccSaveBtn: { paddingHorizontal: 18, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ccSaveText: { fontSize: 14, fontWeight: '700' },
  ccNameInput: { fontSize: 18, fontWeight: '600', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  ccRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  ccRowLabel: { fontSize: 16, fontWeight: '600' },
  ccRowValue: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  // PickerSheet
  pkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pkSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '72%', paddingHorizontal: 16 },
  pkCatHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  pkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pkOption: { width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  pkOptionText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  pkDone: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  pkDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
