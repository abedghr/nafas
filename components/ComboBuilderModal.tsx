import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { exerciseIcon } from '@/lib/exercise-icon';
import { matchExercise } from '@/lib/exercise-search';
import { useApp } from '@/lib/app-context';
import { toDisplayWeight, fromDisplayWeight, unitLabel } from '@/lib/units';
import type { SetConfig } from '@/lib/app-context';

export type ComboSetType = 'reps' | 'hold' | 'emom';

export interface ComboComponent {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  setType: ComboSetType; // default 'reps'
  reps: number;
  weight: number;
  durationSeconds?: number; // hold
  repsPerInterval?: number; // emom
  intervalSeconds?: number; // emom (default 60)
  totalIntervals?: number; // emom
}

// Convert a combo component (from the builder OR a persisted template, where
// setType may be absent → treat as 'reps') into the SetConfig used by live
// session rounds and workout logs.
export function componentToSetConfig(c: {
  setType?: ComboSetType; reps?: number; weight?: number;
  durationSeconds?: number; repsPerInterval?: number; intervalSeconds?: number; totalIntervals?: number;
}): SetConfig {
  const type = c.setType ?? 'reps';
  if (type === 'hold') return { type: 'hold', durationSeconds: c.durationSeconds || 0, weight: c.weight || 0 };
  if (type === 'emom') return {
    type: 'emom',
    repsPerInterval: c.repsPerInterval || 0,
    intervalSeconds: c.intervalSeconds || 60,
    totalIntervals: c.totalIntervals || 0,
    weight: c.weight || 0,
  };
  return { type: 'reps', reps: c.reps || 0, weight: c.weight || 0 };
}

export type ComboMode = 'circuit' | 'emom';

export interface ComboBuildResult {
  components: ComboComponent[];
  rounds: number; // circuit: rounds; emom: cycles through the component sequence
  unbroken: boolean;
  restSeconds: number;
  mode: ComboMode; // default 'circuit'
  intervalSeconds: number; // emom mode: seconds per minute-slot (default 60)
}

// Build a combo set: pick 2+ movements done back-to-back (the same movement can
// appear more than once), each with its own reps + weight, choose rounds /
// unbroken. Shared by the live-workout screen and prepare-workout planning.
export default function ComboBuilderModal({ visible, onClose, onCreate, customExercises, theme }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: ComboBuildResult) => void;
  customExercises: any[];
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { weightUnit } = useApp();
  const [search, setSearch] = useState('');
  const [components, setComponents] = useState<ComboComponent[]>([]);
  const [rounds, setRounds] = useState(1);
  const [unbroken, setUnbroken] = useState(true);
  const [mode, setMode] = useState<ComboMode>('circuit');
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  const reset = () => { setSearch(''); setComponents([]); setRounds(1); setUnbroken(true); setMode('circuit'); setIntervalSeconds(60); };
  const close = () => { reset(); onClose(); };

  const allExercises = useMemo(() => {
    const lib = exerciseLibrary.map(e => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup, nameEn: e.nameEn, nameAr: e.nameAr }));
    const custom = customExercises.map(e => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup, nameEn: e.name, nameAr: null }));
    return [...lib, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allExercises;
    return allExercises.filter(e => matchExercise(search, e));
  }, [allExercises, search]);

  const addComponent = (ex: { id: string; name: string; muscleGroup: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComponents(prev => [...prev, { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, setType: 'reps', reps: 8, weight: 0 }]);
  };

  const updateComponent = (idx: number, patch: Partial<ComboComponent>) => {
    setComponents(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  // switching type seeds sensible defaults for that type's fields (once)
  const setComponentType = (idx: number, setType: ComboSetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComponents(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      if (setType === 'hold') return { ...c, setType, durationSeconds: c.durationSeconds ?? 30 };
      if (setType === 'emom') return { ...c, setType, repsPerInterval: c.repsPerInterval ?? 10, intervalSeconds: c.intervalSeconds ?? 60, totalIntervals: c.totalIntervals ?? 10 };
      return { ...c, setType };
    }));
  };

  const removeComponent = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComponents(prev => prev.filter((_, i) => i !== idx));
  };

  const create = () => {
    if (components.length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreate({ components, rounds, unbroken, restSeconds: 90, mode, intervalSeconds: Math.max(1, intervalSeconds || 60) });
    close();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[s.modalContent, { backgroundColor: theme.background }]}>
            <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutSession.buildCombo')}</Text>
              <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>

            {components.length > 0 && (
              <View style={s.comboCompList}>
                {components.map((c, i) => (
                  <View key={i} style={s.comboCompBlock}>
                    <View style={s.comboCompHead}>
                      <Text style={[s.comboCompName, { color: theme.text }]} numberOfLines={1}>{i + 1}. {c.name}</Text>
                      <Pressable onPress={() => removeComponent(i)} hitSlop={6}>
                        <Ionicons name="close-circle" size={18} color={Colors.accent} />
                      </Pressable>
                    </View>
                    <View style={s.comboCompCtl}>
                      <View style={s.typeChipRow}>
                        {(['reps', 'hold', 'emom'] as const).map(ty => (
                          <Pressable
                            key={ty}
                            onPress={() => setComponentType(i, ty)}
                            style={[s.typeChip, { borderColor: c.setType === ty ? Colors.accent : theme.border, backgroundColor: c.setType === ty ? Colors.accent + '18' : 'transparent' }]}
                          >
                            <Text style={[s.typeChipText, { color: c.setType === ty ? Colors.accent : theme.textMuted }]}>{t(`workoutSession.${ty}`)}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={s.fieldRow}>
                        {c.setType === 'hold' ? (
                          <>
                            <TextInput
                              style={[s.inlineInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                              value={c.durationSeconds ? String(c.durationSeconds) : ''}
                              onChangeText={v => updateComponent(i, { durationSeconds: parseInt(v) || 0 })}
                              keyboardType="numeric" placeholder="30" placeholderTextColor={theme.textMuted} selectTextOnFocus
                            />
                            <Text style={[s.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.sec')}</Text>
                          </>
                        ) : c.setType === 'emom' ? (
                          <>
                            <TextInput
                              style={[s.inlineInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                              value={c.repsPerInterval ? String(c.repsPerInterval) : ''}
                              onChangeText={v => updateComponent(i, { repsPerInterval: parseInt(v) || 0 })}
                              keyboardType="numeric" placeholder="10" placeholderTextColor={theme.textMuted} selectTextOnFocus
                            />
                            <Text style={[s.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                            <TextInput
                              style={[s.inlineInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                              value={c.totalIntervals ? String(c.totalIntervals) : ''}
                              onChangeText={v => updateComponent(i, { totalIntervals: parseInt(v) || 0 })}
                              keyboardType="numeric" placeholder="10" placeholderTextColor={theme.textMuted} selectTextOnFocus
                            />
                            <Text style={[s.comboCompUnit, { color: theme.textMuted }]}>×</Text>
                          </>
                        ) : (
                          <>
                            <TextInput
                              style={[s.inlineInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                              value={c.reps ? String(c.reps) : ''}
                              onChangeText={v => updateComponent(i, { reps: parseInt(v) || 0 })}
                              keyboardType="numeric" placeholder="8" placeholderTextColor={theme.textMuted} selectTextOnFocus
                            />
                            <Text style={[s.comboCompUnit, { color: theme.textMuted }]}>{t('workoutSession.reps')}</Text>
                          </>
                        )}
                        <TextInput
                          style={[s.inlineInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                          value={c.weight ? String(toDisplayWeight(c.weight, weightUnit)) : ''}
                          onChangeText={v => updateComponent(i, { weight: fromDisplayWeight(parseFloat(v) || 0, weightUnit) })}
                          keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textMuted} selectTextOnFocus
                        />
                        <Text style={[s.comboCompUnit, { color: theme.textMuted }]}>{unitLabel(weightUnit)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* circuit / emom mode toggle */}
            <View style={s.modeRow}>
              {(['circuit', 'emom'] as const).map(m => (
                <Pressable
                  key={m}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(m); }}
                  style={[s.modeSeg, { borderColor: mode === m ? Colors.accent : theme.border, backgroundColor: mode === m ? Colors.accent + '18' : 'transparent' }]}
                >
                  <Text style={[s.modeSegText, { color: mode === m ? Colors.accent : theme.textMuted }]}>
                    {m === 'circuit' ? t('workoutSession.circuit') : t('workoutSession.emom')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.comboCfgRow}>
              <View style={s.comboCfgItem}>
                <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>
                  {mode === 'emom' ? t('workoutSession.cycles') : t('workoutSession.rounds')}
                </Text>
                <View style={s.comboStepper}>
                  <Pressable onPress={() => setRounds(r => Math.max(1, r - 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={16} color={theme.text} /></Pressable>
                  <Text style={[s.stepVal, { color: theme.text }]}>{rounds}</Text>
                  <Pressable onPress={() => setRounds(r => Math.min(20, r + 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={theme.text} /></Pressable>
                </View>
              </View>
              {mode === 'emom' ? (
                <View style={s.comboCfgItem}>
                  <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.intervalSec')}</Text>
                  <TextInput
                    style={[s.inlineInput, { width: 56, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={intervalSeconds ? String(intervalSeconds) : ''}
                    onChangeText={v => setIntervalSeconds(parseInt(v) || 0)}
                    keyboardType="numeric" placeholder="60" placeholderTextColor={theme.textMuted} selectTextOnFocus
                  />
                </View>
              ) : (
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setUnbroken(u => !u); }} style={s.comboCfgItem}>
                  <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.unbroken')}</Text>
                  <View style={[s.comboToggle, { backgroundColor: unbroken ? Colors.primary : theme.border }]}>
                    <View style={[s.comboToggleDot, { alignSelf: unbroken ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </Pressable>
              )}
            </View>
            {mode === 'emom' && (
              <Text style={[s.modeHint, { color: theme.textMuted }]}>
                {t('workoutSession.everyMinute')}: 1 → {Math.max(components.length, 2)} · {Math.max(components.length, 2) * rounds} min
              </Text>
            )}

            <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput style={[s.searchInput, { color: theme.text }]} value={search} onChangeText={setSearch} placeholder={t('workoutSession.searchExercises')} placeholderTextColor={theme.textMuted} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 }}>
              {filtered.map((ex, i) => (
                <Pressable key={ex.id + i} onPress={() => addComponent(ex)} style={({ pressed }) => [s.exPickerItem, { backgroundColor: pressed ? theme.card : 'transparent' }]}>
                  <View style={[s.exPickerIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <MaterialCommunityIcons name={exerciseIcon(ex.name, ex.muscleGroup) as any} size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.exPickerName, { color: theme.text }]}>{ex.name}</Text>
                    <Text style={[s.exPickerGroup, { color: theme.textMuted }]}>{ex.muscleGroup}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={create} disabled={components.length < 2} style={{ opacity: components.length < 2 ? 0.4 : 1, marginTop: 8, marginBottom: 24 }}>
              <LinearGradient colors={[Colors.accent, '#E85A2A']} style={s.comboCreateBtn}>
                <Text style={s.comboCreateText}>
                  {components.length < 2 ? t('workoutSession.pickTwoPlus') : t('workoutSession.createCombo', { count: components.length })}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', paddingHorizontal: 16 },
  modalHandle: { alignItems: 'center', paddingVertical: 10 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  exPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  exPickerIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  exPickerName: { fontSize: 15, fontWeight: '600' },
  exPickerGroup: { fontSize: 12, marginTop: 2 },
  inlineInput: { width: 44, height: 34, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  comboCompList: { gap: 8, marginBottom: 10 },
  comboCompBlock: { gap: 5 },
  comboCompHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comboCompCtl: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  typeChipRow: { flexDirection: 'row', gap: 4 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  typeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  comboCompName: { fontSize: 13, fontWeight: '600', flex: 1 },
  comboCompUnit: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  modeSeg: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modeSegText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  modeHint: { fontSize: 11, fontWeight: '500', marginBottom: 10, marginTop: -4 },
  comboCfgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 12 },
  comboCfgItem: { alignItems: 'center', gap: 6 },
  comboCfgLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  comboStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  comboToggle: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  comboToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  comboCreateBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  comboCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
