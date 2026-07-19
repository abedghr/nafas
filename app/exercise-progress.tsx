import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import ProgressChart from '@/components/ProgressChart';
import { workoutApi } from '@/src/features/workout/api';

type Point = { date: string; weight: number; reps: number; volume: number };

export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const { name } = useLocalSearchParams<{ name: string }>();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    workoutApi.progression(String(name)).then(setPoints).catch(() => {}).finally(() => setLoading(false));
  }, [name]);

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
      ) : points.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="trending-up-outline" size={44} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontSize: 15, marginTop: 10 }}>{t('workoutTab.noProgressYet')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* summary */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: theme.card }]}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={[s.statVal, { color: theme.text }]}>{pr} {t('workoutSession.kg')}</Text>
              <Text style={[s.statLbl, { color: theme.textMuted }]}>{t('workoutTab.prLabel')}</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: theme.card }]}>
              <Ionicons name="trending-up" size={16} color={gain >= 0 ? Colors.primary : Colors.accent} />
              <Text style={[s.statVal, { color: gain >= 0 ? Colors.primary : Colors.accent }]}>{gain >= 0 ? '+' : ''}{gain} {t('workoutSession.kg')}</Text>
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
            <ProgressChart points={points} theme={theme} />
          </View>

          {/* history */}
          <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.sessionHistory')}</Text>
          <View style={[s.histCard, { backgroundColor: theme.card }]}>
            {[...points].reverse().map((p, i) => (
              <View key={i} style={[s.histRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.histDate, { color: theme.text }]}>{fmt(p.date)}</Text>
                  <Text style={[s.histVol, { color: theme.textMuted }]}>{t('workoutSession.volume')}: {Math.round(p.volume)} {t('workoutSession.kg')}</Text>
                </View>
                <Text style={[s.histBest, { color: p.weight === pr ? '#FFD700' : theme.textSecondary }]}>
                  {p.weight} {t('workoutSession.kg')} × {p.reps}{p.weight === pr ? ' 🏆' : ''}
                </Text>
              </View>
            ))}
          </View>
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
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
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
