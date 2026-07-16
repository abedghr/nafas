import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import InBodySection from '@/components/InBodySection';

// round to 1 decimal so float sums don't render as 15.799999999999999
const r1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

function MacroBar({ label, current, target, color, unit, isDark }: any) {
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const pct = Math.min((current / (target || 1)) * 100, 100);
  const remaining = Math.max(target - current, 0);
  return (
    <View style={[styles.macroCard, { backgroundColor: theme.card }]}>
      <View style={styles.macroCardTop}>
        <Text style={[styles.macroLabel, { color }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: theme.text }]}>
          {r1(current)}<Text style={[styles.macroTarget, { color: theme.textMuted }]}>/{target}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: color + '22' }]}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroRemaining, { color: theme.textMuted }]}>{r1(remaining)}{unit} {t('nutrition.left')}</Text>
    </View>
  );
}

function MealSection({ type, items, isDark, onAdd, onRemove, foodNames }: any) {
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const mealNames: any = { breakfast: t('nutrition.breakfast'), lunch: t('nutrition.lunch'), dinner: t('nutrition.dinner'), snacks: t('nutrition.snacks') };
  const mealIcons: any = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snacks: 'cafe-outline' };
  const totalCals = r1(items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0) * (i.quantity || 1), 0));

  return (
    <View style={[styles.mealCard, { backgroundColor: theme.card }]}>
      <View style={styles.mealHeader}>
        <View style={styles.mealHeaderLeft}>
          <View style={[styles.mealIconBg, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name={mealIcons[type] || 'restaurant-outline'} size={18} color={Colors.primary} />
          </View>
          <Text style={[styles.mealTitle, { color: theme.text }]}>{mealNames[type] || type}</Text>
        </View>
        <View style={styles.mealHeaderRight}>
          {totalCals > 0 && (
            <Text style={[styles.mealCals, { color: theme.textSecondary }]}>{totalCals} {t('nutrition.kcal')}</Text>
          )}
          <Pressable
            onPress={() => { onAdd(type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.addMealBtn, { backgroundColor: Colors.primary + '15' }]}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </Pressable>
        </View>
      </View>
      {items.length > 0 && (
        <View style={styles.mealItems}>
          {items.map((item: any, i: number) => {
            const q = item.quantity || 1;
            return (
            <View key={item.id || i} style={[styles.mealItem, { borderTopColor: theme.border }]}>
              <View style={styles.mealItemTop}>
                <Text style={[styles.mealItemName, { color: theme.text }]} numberOfLines={1}>
                  {(item.foodId && foodNames?.[item.foodId]) || item.name}
                  {q !== 1 && <Text style={{ color: theme.textMuted }}>  ×{q % 1 === 0 ? q : q.toFixed(1)}</Text>}
                </Text>
                <View style={styles.mealItemRight}>
                  <Text style={[styles.mealItemCals, { color: theme.textSecondary }]}>{r1(item.calories * q)} {t('nutrition.kcal')}</Text>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRemove(type, item.id); }} hitSlop={8} style={styles.removeBtn}>
                    <Ionicons name="close" size={15} color={theme.textMuted} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.mealItemMacros}>
                <Text style={[styles.macroMini, { color: Colors.macro.protein }]}>{t('nutrition.protein')} {r1(item.protein * q)}{t('nutrition.g')}</Text>
                <Text style={[styles.macroMini, { color: Colors.macro.carbs }]}>{t('nutrition.carbs')} {r1(item.carbs * q)}{t('nutrition.g')}</Text>
                <Text style={[styles.macroMini, { color: Colors.macro.fat }]}>{t('nutrition.fats')} {r1(item.fat * q)}{t('nutrition.g')}</Text>
              </View>
            </View>
          );})}
        </View>
      )}
    </View>
  );
}

export default function NutritionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, todayNutrition, foodNames, removeMealItem } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<'nutrition' | 'inbody'>('nutrition');

  const consumed = todayNutrition.meals.reduce((acc, m) => {
    m.items.forEach(item => {
      const q = (item as any).quantity || 1;
      acc.protein += item.protein * q;
      acc.carbs += item.carbs * q;
      acc.fat += item.fat * q;
      acc.calories += item.calories * q;
    });
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

  const calPct = todayNutrition.targets.calories > 0
    ? Math.round((consumed.calories / todayNutrition.targets.calories) * 100)
    : 0;

  const handleAddMeal = (mealType: string) => {
    router.push({ pathname: '/meal-logger', params: { mealType } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 12 }}>
          <View style={styles.screenHeader}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>{t('nutrition.title')}</Text>
          </View>

          <View style={styles.tabRow}>
            {([
              { id: 'nutrition' as const, label: t('nutrition.title'), icon: 'nutrition-outline' as const },
              { id: 'inbody' as const, label: t('workoutTab.tabInbody'), icon: 'body-outline' as const },
            ]).map(tab => (
              <Pressable
                key={tab.id}
                onPress={() => { setActiveTab(tab.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.tab, activeTab === tab.id && { backgroundColor: Colors.primary + '18' }]}
              >
                <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? Colors.primary : theme.textMuted} />
                <Text style={[styles.tabText, { color: activeTab === tab.id ? Colors.primary : theme.textMuted }]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'inbody' ? (
            <InBodySection />
          ) : (
          <>
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={[styles.caloriesCard, { backgroundColor: theme.card }]}>
              <View style={styles.caloriesHeader}>
                <Text style={[styles.caloriesTitle, { color: theme.text }]}>{t('nutrition.daily_intake')}</Text>
                <View style={styles.caloriesHeaderRight}>
                  <View style={[styles.calBadge, { backgroundColor: calPct >= 80 ? Colors.primary + '20' : Colors.accent + '20' }]}>
                    <Text style={[styles.calBadgeText, { color: calPct >= 80 ? Colors.primary : Colors.accent }]}>
                      {calPct}%
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/nutrition-targets'); }}
                    style={[styles.editTargetsBtn, { backgroundColor: Colors.primary + '15' }]}
                  >
                    <Ionicons name="options-outline" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.caloriesMain}>
                <Text style={[styles.caloriesBig, { color: theme.text }]}>{Math.round(consumed.calories)}</Text>
                <Text style={[styles.caloriesOf, { color: theme.textMuted }]}>
                  / {todayNutrition.targets.calories} {t('nutrition.kcal')}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${Math.min(calPct, 100)}%` }]}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(150)}>
            <View style={styles.macrosRow}>
              <MacroBar label={t('nutrition.protein')} current={consumed.protein} target={todayNutrition.targets.protein} color={Colors.macro.protein} unit="g" isDark={isDark} />
              <MacroBar label={t('nutrition.carbs')} current={consumed.carbs} target={todayNutrition.targets.carbs} color={Colors.macro.carbs} unit="g" isDark={isDark} />
              <MacroBar label={t('nutrition.fats')} current={consumed.fat} target={todayNutrition.targets.fat} color={Colors.macro.fat} unit="g" isDark={isDark} />
            </View>
          </Animated.View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('nutrition.meals')}</Text>

          {todayNutrition.meals.map((meal, i) => (
            <Animated.View key={meal.type} entering={FadeInDown.duration(400).delay(200 + i * 80)}>
              <MealSection type={meal.type} items={meal.items} isDark={isDark} onAdd={handleAddMeal} onRemove={removeMealItem} foodNames={foodNames} />
            </Animated.View>
          ))}
          </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  screenTitle: { fontSize: 28, fontFamily: 'Rubik_700Bold' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  tabText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  caloriesCard: { marginHorizontal: 20, borderRadius: 20, padding: 20 },
  caloriesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  caloriesHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editTargetsBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  caloriesTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  calBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  calBadgeText: { fontSize: 13, fontFamily: 'Rubik_700Bold' },
  caloriesMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  caloriesBig: { fontSize: 36, fontFamily: 'Rubik_700Bold' },
  caloriesOf: { fontSize: 16, fontFamily: 'Rubik_400Regular' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,200,150,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  macrosRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16 },
  macroCard: { flex: 1, borderRadius: 14, padding: 12, gap: 8 },
  macroCardTop: { gap: 2 },
  macroValue: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  macroTarget: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  macroLabel: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  macroTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  macroRemaining: { fontSize: 10, fontFamily: 'Rubik_400Regular' },
  sectionTitle: { fontSize: 18, fontFamily: 'Rubik_600SemiBold', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  mealCard: { marginHorizontal: 20, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCals: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  addMealBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mealItems: { paddingHorizontal: 14, paddingBottom: 8 },
  mealItem: { paddingVertical: 10, borderTopWidth: 1, gap: 6 },
  mealItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mealItemName: { fontSize: 14, fontFamily: 'Rubik_500Medium', flex: 1 },
  mealItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(140,140,160,0.14)' },
  mealItemMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  macroMini: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  mealItemCals: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
});
