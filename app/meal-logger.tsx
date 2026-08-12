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
import { Display, Button, Chip, EmptyState } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
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
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}
      >
        <Button variant="icon" icon="close" onPress={close} />
        <Display variant="d3" color={theme.text} numberOfLines={1} style={styles.headerTitle}>
          {t('nutrition.log_meal')} - {mealNames[mealType || ''] || mealType}
        </Display>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(60)}
        style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
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
      </Animated.View>

      {/* type filter — search foods by meal type */}
      <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.filterScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['', ...FILTER_TAGS].map(tag => (
            <Chip
              key={tag || 'all'}
              label={tag === '' ? t('nutrition.all_foods') : t(`mealTypeTag.${tag}`)}
              active={typeFilter === tag}
              onPress={() => setTypeFilter(tag)}
            />
          ))}
        </ScrollView>
      </Animated.View>

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
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Display variant="d3" color={theme.text} numberOfLines={1} style={styles.foodName}>{item.name}</Display>
                {item.mealTypes?.length > 0 && (
                  <View style={styles.hintRow}>
                    {item.mealTypes.slice(0, 3).map(mt => (
                      <Chip key={mt} label={t(`mealTypeTag.${mt}`)} />
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
              <Ionicons name="add-circle" size={30} color={Colors.electric} />
            </Pressable>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          status === 'loading' ? (
            <EmptyState
              icon="time-outline"
              title={t('nutrition.loading')}
            />
          ) : status === 'error' ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('nutrition.load_error')}
              actionLabel={t('nutrition.retry')}
              onAction={() => setReloadKey(k => k + 1)}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title={t('nutrition.no_food_found')}
            />
          )
        }
      />

      {selected && (
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: (Platform.OS === 'web' ? 24 : insets.bottom + 16) }]}>
            <View style={styles.sheetHandle} />
            <Display variant="d3" color={theme.text} numberOfLines={2} style={styles.sheetTitle}>{selected.name}</Display>

            <View style={styles.qtyRow}>
              <Text style={[styles.qtyLabel, { color: theme.textSecondary }]}>{t('nutrition.servings')}</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => stepQty(-0.5)} style={[styles.stepBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="remove" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.qtyValue, { color: theme.text }]}>{qty % 1 === 0 ? qty : qty.toFixed(1)}</Text>
                <Pressable onPress={() => stepQty(0.5)} style={[styles.stepBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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

            <Button
              variant="solid"
              icon="add"
              label={t('nutrition.add_to_log')}
              onPress={confirmAdd}
            />
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
    paddingHorizontal: 20, paddingBottom: 16, gap: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 44 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20,
    paddingHorizontal: 14, height: 48, borderRadius: 999, marginBottom: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, ...Type.body },
  filterScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 50, marginBottom: 14 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  foodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1,
  },
  foodName: { marginBottom: 8 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  macrosRow: { flexDirection: 'row', gap: 6 },
  macroPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  macroPillText: { fontFamily: Fonts.monoBold, fontSize: 11 },
  foodCalories: { alignItems: 'center' },
  foodCalValue: { fontFamily: Fonts.monoBold, fontSize: 20 },
  foodCalUnit: { ...Type.caption },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 10, borderWidth: 1 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 16 },
  sheetTitle: { marginBottom: 18 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  qtyLabel: { ...Type.bodyMed },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qtyValue: { fontFamily: Fonts.monoBold, fontSize: 20, minWidth: 44, textAlign: 'center' },
  sheetMacros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  sheetMacro: { alignItems: 'center', gap: 4 },
  sheetMacroVal: { fontFamily: Fonts.monoBold, fontSize: 17 },
  sheetMacroLbl: { ...Type.caption },
});
