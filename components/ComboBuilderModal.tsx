import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { exerciseLibrary } from '@/src/features/workout/library-cache';

export interface ComboBuildResult {
  components: { exerciseId: string; name: string; muscleGroup: string }[];
  rounds: number;
  unbroken: boolean;
  restSeconds: number;
  plannedReps: number;
  plannedWeight: number;
}

// Build a combo set: pick 2+ movements done back-to-back, choose rounds / reps-each /
// unbroken. Shared by the live-workout screen and prepare-workout planning.
export default function ComboBuilderModal({ visible, onClose, onCreate, customExercises, theme }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: ComboBuildResult) => void;
  customExercises: any[];
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ exerciseId: string; name: string; muscleGroup: string }[]>([]);
  const [rounds, setRounds] = useState(1);
  const [reps, setReps] = useState('8');
  const [unbroken, setUnbroken] = useState(true);

  const reset = () => { setSearch(''); setSelected([]); setRounds(1); setReps('8'); setUnbroken(true); };
  const close = () => { reset(); onClose(); };

  const allExercises = useMemo(() => {
    const lib = exerciseLibrary.map(e => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }));
    const custom = customExercises.map(e => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }));
    return [...lib, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allExercises;
    const q = search.toLowerCase();
    return allExercises.filter(e => e.name.toLowerCase().includes(q));
  }, [allExercises, search]);

  const toggle = (ex: { id: string; name: string; muscleGroup: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => prev.some(s => s.exerciseId === ex.id)
      ? prev.filter(s => s.exerciseId !== ex.id)
      : [...prev, { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup }]);
  };

  const create = () => {
    if (selected.length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreate({ components: selected, rounds, unbroken, restSeconds: 90, plannedReps: parseInt(reps) || 0, plannedWeight: 0 });
    close();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end', flex: 1 }}>
          <View style={[s.modalContent, { backgroundColor: theme.background }]}>
            <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutSession.buildCombo')}</Text>
              <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>

            {selected.length > 0 && (
              <View style={s.comboSelWrap}>
                {selected.map((sel, i) => (
                  <View key={sel.exerciseId} style={[s.comboSelChip, { backgroundColor: Colors.accent + '18' }]}>
                    <Text style={[s.comboSelChipText, { color: Colors.accent }]}>{i + 1}. {sel.name}</Text>
                    <Pressable onPress={() => toggle({ id: sel.exerciseId, name: sel.name, muscleGroup: sel.muscleGroup })} hitSlop={6}>
                      <Ionicons name="close-circle" size={15} color={Colors.accent} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.comboCfgRow}>
              <View style={s.comboCfgItem}>
                <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.rounds')}</Text>
                <View style={s.comboStepper}>
                  <Pressable onPress={() => setRounds(r => Math.max(1, r - 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={16} color={theme.text} /></Pressable>
                  <Text style={[s.stepVal, { color: theme.text }]}>{rounds}</Text>
                  <Pressable onPress={() => setRounds(r => Math.min(20, r + 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={theme.text} /></Pressable>
                </View>
              </View>
              <View style={s.comboCfgItem}>
                <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.repsEach')}</Text>
                <TextInput
                  style={[s.inlineInput, { width: 56, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="8" placeholderTextColor={theme.textMuted} selectTextOnFocus
                />
              </View>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setUnbroken(u => !u); }} style={s.comboCfgItem}>
                <Text style={[s.comboCfgLabel, { color: theme.textMuted }]}>{t('workoutSession.unbroken')}</Text>
                <View style={[s.comboToggle, { backgroundColor: unbroken ? Colors.primary : theme.border }]}>
                  <View style={[s.comboToggleDot, { alignSelf: unbroken ? 'flex-end' : 'flex-start' }]} />
                </View>
              </Pressable>
            </View>

            <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput style={[s.searchInput, { color: theme.text }]} value={search} onChangeText={setSearch} placeholder={t('workoutSession.searchExercises')} placeholderTextColor={theme.textMuted} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {filtered.map((ex, i) => {
                const on = selected.some(sel => sel.exerciseId === ex.id);
                return (
                  <Pressable key={ex.id + i} onPress={() => toggle(ex)} style={({ pressed }) => [s.exPickerItem, { backgroundColor: on ? Colors.accent + '12' : pressed ? theme.card : 'transparent' }]}>
                    <View style={[s.exPickerIcon, { backgroundColor: (on ? Colors.accent : Colors.primary) + '15' }]}>
                      <Ionicons name={on ? 'checkmark' : 'barbell-outline'} size={18} color={on ? Colors.accent : Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.exPickerName, { color: theme.text }]}>{ex.name}</Text>
                      <Text style={[s.exPickerGroup, { color: theme.textMuted }]}>{ex.muscleGroup}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? Colors.accent : theme.textMuted} />
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={create} disabled={selected.length < 2} style={{ opacity: selected.length < 2 ? 0.4 : 1, marginTop: 8, marginBottom: 24 }}>
              <LinearGradient colors={[Colors.accent, '#E85A2A']} style={s.comboCreateBtn}>
                <Text style={s.comboCreateText}>
                  {selected.length < 2 ? t('workoutSession.pickTwoPlus') : t('workoutSession.createCombo', { count: selected.length })}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingHorizontal: 16 },
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
  comboSelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  comboSelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  comboSelChipText: { fontSize: 12, fontWeight: '600' },
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
