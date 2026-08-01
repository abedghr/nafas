import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { EQUIPMENT_OPTIONS, MUSCLE_CATEGORIES } from '@/src/features/workout/api';
import { useApp } from '@/lib/app-context';
import { muscleLabel, equipLabel } from '@/lib/exercise-i18n';

// Hevy-style Equipment / Muscle filter pills for the exercise pickers. Tapping
// a pill opens a bottom-sheet with a 2-column option grid + "Clear Filters" +
// "Show N results" footer.
export default function ExerciseFilterBar({ equipment, muscle, onEquipment, onMuscle, resultCount, theme }: {
  equipment: string | null;
  muscle: string | null;
  onEquipment: (v: string | null) => void;
  onMuscle: (v: string | null) => void;
  resultCount: number;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const { language } = useApp();
  const isAr = language === 'ar';
  const [sheet, setSheet] = useState<'equipment' | 'muscle' | null>(null);
  const optLabel = (kind: 'equipment' | 'muscle', v: string) => (kind === 'equipment' ? equipLabel(v, isAr) : muscleLabel(v, isAr));

  const selected = sheet === 'equipment' ? equipment : muscle;
  const setSelected = sheet === 'equipment' ? onEquipment : onMuscle;

  const renderOption = (opt: string) => {
    const isSel = selected === opt;
    return (
      <Pressable
        key={opt}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelected(isSel ? null : opt);
          setSheet(null);
        }}
        style={[s.option, {
          backgroundColor: isSel ? Colors.primary + '18' : theme.card,
          borderColor: isSel ? Colors.primary : theme.border,
        }]}
      >
        <Text style={[s.optionText, { color: isSel ? Colors.primary : theme.text }]} numberOfLines={1}>{optLabel(sheet === 'equipment' ? 'equipment' : 'muscle', opt)}</Text>
        {isSel && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
      </Pressable>
    );
  };

  const pill = (kind: 'equipment' | 'muscle') => {
    const value = kind === 'equipment' ? equipment : muscle;
    const label = value ? optLabel(kind, value) : (kind === 'equipment'
      ? t('exFilter.allEquipment', { defaultValue: 'All Equipment' })
      : t('exFilter.allMuscles', { defaultValue: 'All Muscles' }));
    const active = !!value;
    return (
      <Pressable
        key={kind}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet(kind); }}
        style={[s.pill, {
          backgroundColor: active ? Colors.primary : theme.card,
          borderColor: active ? Colors.primary : theme.border,
        }]}
      >
        <Text style={[s.pillText, { color: active ? '#fff' : theme.textSecondary }]} numberOfLines={1}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={active ? '#fff' : theme.textMuted} />
      </Pressable>
    );
  };

  return (
    <>
      <View style={s.pillRow}>
        {pill('equipment')}
        {pill('muscle')}
      </View>

      <Modal visible={sheet !== null} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={s.overlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSheet(null)} />
          <View style={[s.sheet, { backgroundColor: theme.background }]}>
            <View style={s.handleWrap}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>
                {sheet === 'equipment'
                  ? t('exFilter.equipment', { defaultValue: 'Equipment' })
                  : t('exFilter.muscle', { defaultValue: 'Muscle' })}
              </Text>
              <Pressable onPress={() => setSheet(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {sheet === 'equipment' ? (
                <View style={s.grid}>{EQUIPMENT_OPTIONS.map(renderOption)}</View>
              ) : (
                MUSCLE_CATEGORIES.map((cat) => (
                  <View key={cat.key}>
                    <Text style={[s.catHeader, { color: theme.textMuted }]}>{t(`exFilter.${cat.key}`, { defaultValue: cat.key })}</Text>
                    <View style={s.grid}>{cat.muscles.map(renderOption)}</View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={s.footer}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onEquipment(null);
                  onMuscle(null);
                }}
                style={[s.clearBtn, { borderColor: theme.border }]}
              >
                <Text style={[s.clearText, { color: theme.textSecondary }]}>
                  {t('exFilter.clearFilters', { defaultValue: 'Clear Filters' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet(null); }}
                style={[s.showBtn, { backgroundColor: Colors.primary }]}
              >
                <Text style={s.showText}>
                  {t('exFilter.showResults', { n: resultCount, defaultValue: 'Show {{n}} results' })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '55%', paddingHorizontal: 16 },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  catHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  option: { width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  optionText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingBottom: 24 },
  clearBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  clearText: { fontSize: 14, fontWeight: '600' },
  showBtn: { flex: 1.4, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  showText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
