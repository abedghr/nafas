import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, SectionHeader, ActivityRings, Button } from '@/components/ui';
import { nutritionApi } from '@/src/features/nutrition/api';

type Goal = 'cut' | 'maintain' | 'bulk';
const GOALS: { id: Goal; icon: any }[] = [
  { id: 'cut', icon: 'flame-outline' },
  { id: 'maintain', icon: 'sync-outline' },
  { id: 'bulk', icon: 'barbell-outline' },
];
// macro colour language: protein = green, carbs = amber, fat = blue, calories = electric
const MACROS: { key: 'calories' | 'protein' | 'carbs' | 'fat'; color: string }[] = [
  { key: 'calories', color: Colors.electric },
  { key: 'protein', color: Colors.ring.green },
  { key: 'carbs', color: Colors.ring.amber },
  { key: 'fat', color: Colors.ring.blue },
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

  // donut preview — macro grams as a share of the total (purely derived display)
  const gramsP = Number(vals.protein) || 0;
  const gramsC = Number(vals.carbs) || 0;
  const gramsF = Number(vals.fat) || 0;
  const gramsTotal = gramsP + gramsC + gramsF;
  const share = (n: number) => (gramsTotal > 0 ? n / gramsTotal : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Button variant="icon" icon="close" onPress={close} />
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* hero: editorial headline + macro-split donut with calories at the centre */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <Display variant="d2" color={theme.text} style={styles.heroTitle}>{t('nutrition.edit_targets')}</Display>
          <View style={styles.donutWrap}>
            <ActivityRings
              size={168}
              stroke={13}
              gap={5}
              rings={[
                { value: share(gramsP), color: Colors.ring.green },
                { value: share(gramsC), color: Colors.ring.amber },
                { value: share(gramsF), color: Colors.ring.blue },
              ]}
              trackColor={isDark ? '#FFFFFF12' : '#0000000D'}
            />
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={[Type.stat, { color: theme.text }]}>{vals.calories || '0'}</Text>
              <Text style={[Type.overline, { color: theme.textMuted }]}>{t('nutrition.kcal')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* goal selector */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)} style={{ marginTop: 24 }}>
          <SectionHeader title={t('nutrition.your_goal')} />
          <View style={styles.goalRow}>
            {GOALS.map(({ id, icon }) => {
              const on = goal === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => pickGoal(id)}
                  style={[styles.goalCard, { backgroundColor: on ? Colors.electric + '18' : theme.card, borderColor: on ? Colors.electric : theme.border }]}
                >
                  <Ionicons name={icon} size={22} color={on ? Colors.electric : theme.textMuted} />
                  <Text style={[styles.goalTitle, { color: on ? Colors.electric : theme.text }]}>{t(`nutrition.goal_${id}`)}</Text>
                  <Text style={[styles.goalDesc, { color: theme.textMuted }]}>{t(`nutrition.goal_${id}_desc`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {goal && (
            <View style={styles.recommendedRow}>
              <Ionicons name="sparkles" size={13} color={Colors.electric} />
              <Text style={[styles.recommendedHint, { color: Colors.electric }]}>
                {recommending ? t('nutrition.loading') : t('nutrition.recommended')}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* editable targets */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={{ marginTop: 24 }}>
          <SectionHeader title={t('nutrition.target')} />
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
                    selectionColor={Colors.electric}
                  />
                  <Text style={[styles.fieldUnit, { color: theme.textMuted }]}>
                    {key === 'calories' ? t('nutrition.kcal') : t('nutrition.g')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(240)}>
          <Button
            variant="solid"
            label={saved ? t('nutrition.targets_updated') : t('nutrition.save_targets')}
            icon={saved ? 'checkmark-circle' : undefined}
            onPress={save}
            style={styles.saveBtn}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 4,
  },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  hero: { alignItems: 'center', gap: 20, marginTop: 4 },
  heroTitle: { textAlign: 'center' },
  donutWrap: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', gap: 2 },
  goalRow: { flexDirection: 'row', gap: 10 },
  goalCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  goalTitle: { fontSize: 14, fontFamily: Fonts.semibold },
  goalDesc: { fontSize: 10, fontFamily: Fonts.regular, textAlign: 'center' },
  recommendedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  recommendedHint: { fontSize: 12, fontFamily: Fonts.medium },
  fields: { gap: 10 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  fieldName: { fontSize: 15, fontFamily: Fonts.medium },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldInput: { fontFamily: Fonts.monoBold, fontSize: 18, minWidth: 60, textAlign: 'right' },
  fieldUnit: { fontSize: 12, fontFamily: Fonts.regular },
  saveBtn: { marginTop: 28 },
});
