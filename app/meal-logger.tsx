import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, TextInput, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { nutritionApi, type ApiFood } from '@/src/features/nutrition/api';

export default function MealLoggerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { mealType } = useLocalSearchParams<{ mealType: string }>();
  const { isDark, addMealItem } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [searchQuery, setSearchQuery] = useState('');
  const [filtered, setFiltered] = useState<ApiFood[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<ApiFood | null>(null);
  const [qty, setQty] = useState(1);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  // the app's "snacks" slot maps to the "snack" hint tag
  const slotTag = (mealType || '') === 'snacks' ? 'snack' : mealType;
  // type filter: defaults to the meal slot you opened from (e.g. breakfast → only
  // breakfast foods); '' = All. User can switch via the chip row.
  const [typeFilter, setTypeFilter] = useState<string>(slotTag || '');

  // food list from the API (localized by x-lang), filtered server-side by meal type.
  // distinguish a genuine empty result from a failed request so we don't show
  // "no food found" when the real problem is auth/network.
  useEffect(() => {
    let active = true;
    setStatus('loading');
    const id = setTimeout(() => {
      nutritionApi.foods(searchQuery || undefined, typeFilter || undefined)
        .then(rows => { if (active) { setFiltered(rows); setStatus('ok'); } })
        .catch(() => { if (active) { setFiltered([]); setStatus('error'); } });
    }, 200);
    return () => { active = false; clearTimeout(id); };
  }, [searchQuery, typeFilter, reloadKey]);

  const FILTER_TAGS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'dessert', 'pre_workout', 'post_workout'];

  // close: go back if there's history, else fall back to the nutrition tab
  // (direct/deep-link loads have no back stack, so router.back() is a no-op)
  const close = () => (router.canGoBack() ? router.back() : router.replace('/nutrition'));

  const mealNames: any = {
    breakfast: t('nutrition.breakfast'),
    lunch: t('nutrition.lunch'),
    dinner: t('nutrition.dinner'),
    snacks: t('nutrition.snacks'),
  };

  const openFood = (food: ApiFood) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(food);
    setQty(1);
  };

  const confirmAdd = () => {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMealItem(mealType || 'snacks', {
      foodId: selected.id,
      name: selected.name,
      protein: selected.protein,
      carbs: selected.carbs,
      fat: selected.fat,
      calories: selected.calories,
      quantity: qty,
    });
    setSelected(null);
    close();
  };

  const stepQty = (d: number) => { Haptics.selectionAsync(); setQty(q => Math.max(0.5, Math.round((q + d) * 2) / 2)); };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}>
        <Pressable onPress={close} hitSlop={12}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('nutrition.log_meal')} - {mealNames[mealType || ''] || mealType}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('nutrition.search_food')}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {/* type filter — search foods by meal type */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {['', ...FILTER_TAGS].map(tag => {
          const on = typeFilter === tag;
          return (
            <Pressable
              key={tag || 'all'}
              onPress={() => { setTypeFilter(tag); Haptics.selectionAsync(); }}
              style={[
                styles.filterChip,
                { backgroundColor: on ? Colors.primary : theme.card, borderColor: on ? Colors.primary : theme.border },
              ]}
            >
              <Text style={[styles.filterChipText, { color: on ? '#fff' : theme.textMuted }]}>
                {tag === '' ? t('nutrition.all_foods') : t(`mealTypeTag.${tag}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
            <Pressable
              onPress={() => openFood(item)}
              style={({ pressed }) => [
                styles.foodCard,
                { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: theme.text }]}>{item.name}</Text>
                {item.mealTypes?.length > 0 && (
                  <View style={styles.hintRow}>
                    {item.mealTypes.slice(0, 3).map(mt => (
                      <View key={mt} style={[styles.hintPill, { backgroundColor: Colors.primary + '18' }]}>
                        <Text style={[styles.hintPillText, { color: Colors.primary }]}>{t(`mealTypeTag.${mt}`)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.macrosRow}>
                  <View style={[styles.macroPill, { backgroundColor: Colors.macro.protein + '20' }]}>
                    <Text style={[styles.macroPillText, { color: Colors.macro.protein }]}>P: {item.protein}{t('nutrition.g')}</Text>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.macro.carbs + '20' }]}>
                    <Text style={[styles.macroPillText, { color: Colors.macro.carbs }]}>C: {item.carbs}{t('nutrition.g')}</Text>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.macro.fat + '20' }]}>
                    <Text style={[styles.macroPillText, { color: Colors.macro.fat }]}>F: {item.fat}{t('nutrition.g')}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.foodCalories}>
                <Text style={[styles.foodCalValue, { color: theme.text }]}>{item.calories}</Text>
                <Text style={[styles.foodCalUnit, { color: theme.textMuted }]}>{t('nutrition.kcal')}</Text>
              </View>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </Pressable>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          status === 'loading' ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('nutrition.loading')}</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted, textAlign: 'center', paddingHorizontal: 24 }]}>{t('nutrition.load_error')}</Text>
              <Pressable onPress={() => setReloadKey(k => k + 1)} style={[styles.retryBtn, { backgroundColor: Colors.primary }]}>
                <Text style={styles.retryText}>{t('nutrition.retry')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('nutrition.no_food_found')}</Text>
            </View>
          )
        }
      />

      {selected && (
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: (Platform.OS === 'web' ? 24 : insets.bottom + 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={2}>{selected.name}</Text>

            <View style={styles.qtyRow}>
              <Text style={[styles.qtyLabel, { color: theme.textSecondary }]}>{t('nutrition.servings')}</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => stepQty(-0.5)} style={[styles.stepBtn, { backgroundColor: theme.surface }]}>
                  <Ionicons name="remove" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.qtyValue, { color: theme.text }]}>{qty % 1 === 0 ? qty : qty.toFixed(1)}</Text>
                <Pressable onPress={() => stepQty(0.5)} style={[styles.stepBtn, { backgroundColor: theme.surface }]}>
                  <Ionicons name="add" size={20} color={theme.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.sheetMacros}>
              <View style={styles.sheetMacro}>
                <Text style={[styles.sheetMacroVal, { color: theme.text }]}>{r1(selected.calories * qty)}</Text>
                <Text style={[styles.sheetMacroLbl, { color: theme.textMuted }]}>{t('nutrition.kcal')}</Text>
              </View>
              <View style={styles.sheetMacro}>
                <Text style={[styles.sheetMacroVal, { color: Colors.macro.protein }]}>{r1(selected.protein * qty)}{t('nutrition.g')}</Text>
                <Text style={[styles.sheetMacroLbl, { color: theme.textMuted }]}>{t('nutrition.protein')}</Text>
              </View>
              <View style={styles.sheetMacro}>
                <Text style={[styles.sheetMacroVal, { color: Colors.macro.carbs }]}>{r1(selected.carbs * qty)}{t('nutrition.g')}</Text>
                <Text style={[styles.sheetMacroLbl, { color: theme.textMuted }]}>{t('nutrition.carbs')}</Text>
              </View>
              <View style={styles.sheetMacro}>
                <Text style={[styles.sheetMacroVal, { color: Colors.macro.fat }]}>{r1(selected.fat * qty)}{t('nutrition.g')}</Text>
                <Text style={[styles.sheetMacroLbl, { color: theme.textMuted }]}>{t('nutrition.fats')}</Text>
              </View>
            </View>

            <Pressable onPress={confirmAdd} style={[styles.addBtn, { backgroundColor: Colors.primary }]}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>{t('nutrition.add_to_log')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20,
    paddingHorizontal: 14, height: 48, borderRadius: 14, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  filterScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 50, marginBottom: 14 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  foodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14,
  },
  foodName: { fontSize: 15, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  hintPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  hintPillText: { fontSize: 10, fontFamily: 'Rubik_500Medium' },
  macrosRow: { flexDirection: 'row', gap: 6 },
  macroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  macroPillText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
  foodCalories: { alignItems: 'center' },
  foodCalValue: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  foodCalUnit: { fontSize: 10, fontFamily: 'Rubik_400Regular' },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold', marginBottom: 18 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  qtyLabel: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 20, fontFamily: 'Rubik_700Bold', minWidth: 40, textAlign: 'center' },
  sheetMacros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  sheetMacro: { alignItems: 'center', gap: 3 },
  sheetMacroVal: { fontSize: 17, fontFamily: 'Rubik_700Bold' },
  sheetMacroLbl: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 16 },
  addBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
});
