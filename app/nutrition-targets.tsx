import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { nutritionApi } from '@/src/features/nutrition/api';

type Goal = 'cut' | 'maintain' | 'bulk';
const GOALS: { id: Goal; icon: any }[] = [
  { id: 'cut', icon: 'flame-outline' },
  { id: 'maintain', icon: 'sync-outline' },
  { id: 'bulk', icon: 'barbell-outline' },
];
const MACROS: { key: 'calories' | 'protein' | 'carbs' | 'fat'; color: string }[] = [
  { key: 'calories', color: Colors.primary },
  { key: 'protein', color: Colors.macro.protein },
  { key: 'carbs', color: Colors.macro.carbs },
  { key: 'fat', color: Colors.macro.fat },
];

export default function NutritionTargetsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, todayNutrition, setNutritionTargets } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [vals, setVals] = useState({
    calories: String(todayNutrition.targets.calories || ''),
    protein: String(todayNutrition.targets.protein || ''),
    carbs: String(todayNutrition.targets.carbs || ''),
    fat: String(todayNutrition.targets.fat || ''),
  });

  // pick a goal → ask the server for recommended macros → prefill (user can still edit)
  const pickGoal = async (g: Goal) => {
    Haptics.selectionAsync();
    setGoal(g);
    setRecommending(true);
    try {
      const r = await nutritionApi.recommendTargets(g);
      setVals({ calories: String(r.calories), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat) });
    } catch {}
    setRecommending(false);
  };

  // close: back if there's history, else fall back to the nutrition tab
  const close = () => (router.canGoBack() ? router.back() : router.replace('/nutrition'));

  const save = () => {
    if (saved) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNutritionTargets({
      calories: Number(vals.calories) || 0,
      protein: Number(vals.protein) || 0,
      carbs: Number(vals.carbs) || 0,
      fat: Number(vals.fat) || 0,
    });
    setSaved(true);
    setTimeout(close, 650); // brief confirmation before closing
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}>
        <Pressable onPress={close} hitSlop={12}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('nutrition.edit_targets')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* goal selector */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('nutrition.your_goal')}</Text>
        <View style={styles.goalRow}>
          {GOALS.map(({ id, icon }) => {
            const on = goal === id;
            return (
              <Pressable
                key={id}
                onPress={() => pickGoal(id)}
                style={[styles.goalCard, { backgroundColor: on ? Colors.primary + '18' : theme.card, borderColor: on ? Colors.primary : theme.border }]}
              >
                <Ionicons name={icon} size={22} color={on ? Colors.primary : theme.textMuted} />
                <Text style={[styles.goalTitle, { color: on ? Colors.primary : theme.text }]}>{t(`nutrition.goal_${id}`)}</Text>
                <Text style={[styles.goalDesc, { color: theme.textMuted }]}>{t(`nutrition.goal_${id}_desc`)}</Text>
              </Pressable>
            );
          })}
        </View>

        {goal && (
          <Text style={[styles.recommendedHint, { color: Colors.primary }]}>
            {recommending ? t('nutrition.loading') : t('nutrition.recommended')}
          </Text>
        )}

        {/* editable targets */}
        <View style={styles.fields}>
          {MACROS.map(({ key, color }) => (
            <View key={key} style={[styles.field, { backgroundColor: theme.card }]}>
              <View style={styles.fieldLabel}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.fieldName, { color: theme.text }]}>
                  {t(`nutrition.${key === 'fat' ? 'fats' : key}`)}
                </Text>
              </View>
              <View style={styles.fieldInputWrap}>
                <TextInput
                  style={[styles.fieldInput, { color: theme.text }]}
                  value={vals[key]}
                  onChangeText={v => setVals(s => ({ ...s, [key]: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                />
                <Text style={[styles.fieldUnit, { color: theme.textMuted }]}>
                  {key === 'calories' ? t('nutrition.kcal') : t('nutrition.g')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: saved ? Colors.primaryDark : Colors.primary }]}>
          {saved ? (
            <View style={styles.saveInner}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>{t('nutrition.targets_updated')}</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>{t('nutrition.save_targets')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionLabel: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 12 },
  goalRow: { flexDirection: 'row', gap: 10 },
  goalCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  goalTitle: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  goalDesc: { fontSize: 10, fontFamily: 'Rubik_400Regular', textAlign: 'center' },
  recommendedHint: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginTop: 14 },
  fields: { gap: 10, marginTop: 16 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  fieldName: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldInput: { fontSize: 18, fontFamily: 'Rubik_700Bold', minWidth: 60, textAlign: 'right' },
  fieldUnit: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
});
