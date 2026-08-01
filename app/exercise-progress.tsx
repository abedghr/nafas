import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { toDisplayWeight, unitLabel } from '@/lib/units';
import Colors from '@/constants/colors';
import ProgressChart from '@/components/ProgressChart';
import { workoutApi } from '@/src/features/workout/api';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { exerciseIcon } from '@/lib/exercise-icon';
import { bodyTargetLabel, muscleLabel, equipLabel } from '@/lib/exercise-i18n';

type Point = { date: string; weight: number; reps: number; volume: number };

export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, weightUnit, language } = useApp();
  const isAr = language === 'ar';
  const theme = isDark ? Colors.dark : Colors.light;
  const { name } = useLocalSearchParams<{ name: string }>();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    workoutApi.progression(String(name)).then(setPoints).catch(() => {}).finally(() => setLoading(false));
  }, [name]);

  // catalog data for the About / muscle sections (independent of logged history)
  const ex = useMemo(() => exerciseLibrary.find((e) => e.name === name), [name]);
  const targets: { bodyTarget: string; percentage: number }[] = ex?.bodyTargets || [];
  const equip = ex?.equipment && ex.equipment !== 'None' ? equipLabel(ex.equipment, isAr) : t('workoutTab.bodyweight');

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/coach' as any));
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const pr = points.reduce((m, p) => Math.max(m, p.weight), 0);
  const latest = points[points.length - 1];
  const first = points[0];
  const gain = latest && first ? latest.weight - first.weight : 0;
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={back} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* hero: branded tile + primary-muscle / equipment chips */}
          <View style={s.hero}>
            <LinearGradient colors={[Colors.primary + '2E', Colors.primary + '0A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroTile}>
              <MaterialCommunityIcons name={exerciseIcon(String(name), ex?.muscleGroup) as any} size={34} color={Colors.primary} />
            </LinearGradient>
            <View style={s.chipRow}>
              {!!ex?.primaryMuscle && (
                <View style={[s.chip, { backgroundColor: Colors.primary + '18' }]}>
                  <Text style={[s.chipText, { color: Colors.primary }]}>{muscleLabel(ex.primaryMuscle, isAr)}</Text>
                </View>
              )}
              <View style={[s.chip, { backgroundColor: theme.card }]}>
                <MaterialCommunityIcons name="dumbbell" size={12} color={theme.textSecondary} />
                <Text style={[s.chipText, { color: theme.textSecondary }]}>{equip}</Text>
              </View>
            </View>
          </View>

          {/* about */}
          {!!ex?.description && (
            <>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.about')}</Text>
              <View style={[s.card, { backgroundColor: theme.card }]}>
                <Text style={[s.aboutText, { color: theme.textSecondary }]}>{ex.description}</Text>
              </View>
            </>
          )}

          {/* target muscles — weighted bars */}
          {targets.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.targetMuscles')}</Text>
              <View style={[s.card, { backgroundColor: theme.card, gap: 12 }]}>
                {targets.map((tg, i) => (
                  <View key={tg.bodyTarget}>
                    <View style={s.barLabelRow}>
                      <Text style={[s.barLabel, { color: theme.text }]}>{bodyTargetLabel(tg.bodyTarget, isAr)}</Text>
                      <Text style={[s.barPct, { color: theme.textMuted }]}>{tg.percentage}%</Text>
                    </View>
                    <View style={[s.barTrack, { backgroundColor: theme.border }]}>
                      <View style={[s.barFill, { width: `${tg.percentage}%`, backgroundColor: i === 0 ? Colors.primary : Colors.primary + '80' }]} />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {points.length === 0 ? (
            <View style={[s.card, { backgroundColor: theme.card, alignItems: 'center', marginTop: 22, paddingVertical: 26 }]}>
              <Ionicons name="trending-up-outline" size={34} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 10, textAlign: 'center' }}>{t('workoutTab.noSessionsYet')}</Text>
            </View>
          ) : (
            <>
              {/* records */}
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.prLabel')}</Text>
              <View style={s.statsRow}>
                <View style={[s.statCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={[s.statVal, { color: theme.text }]}>{toDisplayWeight(pr, weightUnit)} {unitLabel(weightUnit)}</Text>
                  <Text style={[s.statLbl, { color: theme.textMuted }]}>{t('workoutTab.prLabel')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="trending-up" size={16} color={gain >= 0 ? Colors.primary : Colors.accent} />
                  <Text style={[s.statVal, { color: gain >= 0 ? Colors.primary : Colors.accent }]}>{gain >= 0 ? '+' : ''}{toDisplayWeight(gain, weightUnit)} {unitLabel(weightUnit)}</Text>
                  <Text style={[s.statLbl, { color: theme.textMuted }]}>{t('workoutTab.progressLabel')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <Text style={[s.statVal, { color: theme.text }]}>{points.length}</Text>
                  <Text style={[s.statLbl, { color: theme.textMuted }]}>{t('workoutTab.sessionsLabel')}</Text>
                </View>
              </View>

              {/* chart */}
              <View style={[s.chartCard, { backgroundColor: theme.card }]}>
                <Text style={[s.chartTitle, { color: theme.textSecondary }]}>{t('workoutTab.weightOverTime')}</Text>
                <ProgressChart points={points} theme={theme} toDisplay={(kg) => toDisplayWeight(kg, weightUnit)} />
              </View>

              {/* history */}
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.sessionHistory')}</Text>
              <View style={[s.histCard, { backgroundColor: theme.card }]}>
                {[...points].reverse().map((p, i) => (
                  <View key={i} style={[s.histRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.histDate, { color: theme.text }]}>{fmt(p.date)}</Text>
                      <Text style={[s.histVol, { color: theme.textMuted }]}>{t('workoutSession.volume')}: {Math.round(toDisplayWeight(p.volume, weightUnit))} {unitLabel(weightUnit)}</Text>
                    </View>
                    <Text style={[s.histBest, { color: p.weight === pr ? '#FFD700' : theme.textSecondary }]}>
                      {toDisplayWeight(p.weight, weightUnit)} {unitLabel(weightUnit)} × {p.reps}{p.weight === pr ? ' 🏆' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 4 },
  heroTile: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '26' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12.5, fontFamily: 'Rubik_600SemiBold' },
  card: { borderRadius: 16, padding: 16 },
  aboutText: { fontSize: 14, lineHeight: 21, fontFamily: 'Rubik_400Regular' },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barLabel: { fontSize: 13.5, fontFamily: 'Rubik_500Medium' },
  barPct: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  chartCard: { borderRadius: 16, padding: 16, marginTop: 14 },
  chartTitle: { fontSize: 12, fontFamily: 'Rubik_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', marginTop: 22, marginBottom: 12 },
  histCard: { borderRadius: 16, paddingHorizontal: 14 },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  histDate: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  histVol: { fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  histBest: { fontSize: 14, fontFamily: 'Rubik_700Bold' },
});
