import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { toDisplayWeight, unitLabel } from '@/lib/units';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, StatTile, SectionHeader, Chip, Button, EmptyState, CountUp } from '@/components/ui';
import ProgressChart from '@/components/ProgressChart';
import { workoutApi } from '@/src/features/workout/api';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { bodyTargetLabel, muscleLabel, equipLabel } from '@/lib/exercise-i18n';

type Point = { date: string; weight: number; reps: number; volume: number; holdSec?: number; distanceM?: number };

const fmtSecs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`);
const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, weightUnit, language } = useApp();
  const isAr = language === 'ar';
  const theme = isDark ? Colors.dark : Colors.light;
  const { name } = useLocalSearchParams<{ name: string }>();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErr, setImgErr] = useState(false);

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
  // pick the measure that matches the exercise's logged data: distance > time-hold > weight
  const hasDist = points.some((p) => (p.distanceM || 0) > 0);
  const hasHold = points.some((p) => (p.holdSec || 0) > 0);
  const hasWeight = points.some((p) => (p.weight || 0) > 0);
  const measure: 'weight' | 'time' | 'distance' = hasDist ? 'distance' : (hasHold && !hasWeight) ? 'time' : 'weight';
  const val = (p: Point) => (measure === 'distance' ? (p.distanceM || 0) : measure === 'time' ? (p.holdSec || 0) : (p.weight || 0));
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const fmtMeasure = (n: number) =>
    measure === 'distance' ? fmtDist(n) : measure === 'time' ? fmtSecs(n) : `${round1(toDisplayWeight(n, weightUnit))} ${unitLabel(weightUnit)}`;

  const pr = points.reduce((m, p) => Math.max(m, val(p)), 0);
  const latest = points[points.length - 1];
  const first = points[0];
  const gain = latest && first ? val(latest) - val(first) : 0;
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const wLabel = unitLabel(weightUnit);
  // chart the chosen measure through ProgressChart's value slot
  const chartPoints = points.map((p) => ({ ...p, weight: val(p) }));
  const chartToDisplay = measure === 'weight' ? (kg: number) => toDisplayWeight(kg, weightUnit) : (v: number) => v;
  const chartTitle = measure === 'distance' ? t('workoutTab.distanceOverTime', { defaultValue: 'Best distance over time' })
    : measure === 'time' ? t('workoutTab.holdOverTime', { defaultValue: 'Best hold over time' })
    : t('workoutTab.weightOverTime');

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={back} />
        <View style={{ flex: 1 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.electric} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* hero: branded tile + headline + primary-muscle / equipment chips */}
          <View style={s.hero}>
            {(ex?.gifUrl || ex?.imageUrl) && !imgErr ? (
              <Image source={{ uri: ex.gifUrl || ex.imageUrl }} style={s.heroImg} resizeMode="cover" onError={() => setImgErr(true)} />
            ) : (
              <LinearGradient colors={[Colors.electric + '2E', Colors.electric + '0A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroTile}>
                <Ionicons name="body-outline" size={40} color={Colors.electric} />
              </LinearGradient>
            )}
            <Display variant="d2" color={theme.text} style={s.heroName}>{name}</Display>
            <View style={s.chipRow}>
              {!!ex?.primaryMuscle && <Chip label={muscleLabel(ex.primaryMuscle, isAr)} active />}
              <Chip label={equip} icon="barbell-outline" />
            </View>
          </View>

          {/* about */}
          {!!ex?.description && (
            <View style={{ marginTop: 24 }}>
              <SectionHeader title={t('workoutTab.about')} />
              <View style={[s.card, { backgroundColor: theme.card }]}>
                <Text style={[Type.body, { color: theme.textSecondary }]}>{ex.description}</Text>
              </View>
            </View>
          )}

          {/* target muscles — weighted bars */}
          {targets.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <SectionHeader title={t('workoutTab.targetMuscles')} />
              <View style={[s.card, { backgroundColor: theme.card, gap: 14 }]}>
                {targets.map((tg, i) => (
                  <View key={tg.bodyTarget}>
                    <View style={s.barLabelRow}>
                      <Text style={[s.barLabel, { color: theme.text }]}>{bodyTargetLabel(tg.bodyTarget, isAr)}</Text>
                      <Text style={[s.barPct, { color: theme.textMuted }]}>{tg.percentage}%</Text>
                    </View>
                    <View style={[s.barTrack, { backgroundColor: theme.cardAlt }]}>
                      <LinearGradient
                        colors={i === 0 ? [Colors.electric, Colors.electric + '99'] : [Colors.electric + 'AA', Colors.electric + '55']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[s.barFill, { width: `${tg.percentage}%` }]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {points.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <EmptyState icon="trending-up-outline" title={t('workoutTab.noSessionsYet')} />
            </View>
          ) : (
            <>
              {/* records */}
              <View style={{ marginTop: 24 }}>
                <SectionHeader title={t('workoutTab.prLabel')} />
                <View style={s.statsRow}>
                  <StatTile
                    icon="trophy"
                    color="#FFD700"
                    label={t('workoutTab.prLabel')}
                    value={<Text style={{ ...Type.statSm, color: theme.text }}>{fmtMeasure(pr)}</Text>}
                  />
                  <StatTile
                    icon="trending-up"
                    color={gain >= 0 ? Colors.electric : Colors.accent}
                    label={t('workoutTab.progressLabel')}
                    value={<Text style={{ ...Type.statSm, color: gain >= 0 ? Colors.electric : Colors.accent }}>{gain >= 0 ? '+' : ''}{fmtMeasure(Math.abs(gain))}</Text>}
                  />
                  <StatTile
                    icon="calendar-outline"
                    color={theme.textSecondary}
                    label={t('workoutTab.sessionsLabel')}
                    value={<CountUp value={points.length} style={{ ...Type.statSm, color: theme.text }} />}
                  />
                </View>
              </View>

              {/* chart */}
              <View style={[s.chartCard, { backgroundColor: theme.card }]}>
                <Text style={[Type.overline, { color: theme.textSecondary, marginBottom: 10 }]}>{chartTitle}</Text>
                <ProgressChart points={chartPoints} theme={theme} toDisplay={chartToDisplay} />
              </View>

              {/* history */}
              <View style={{ marginTop: 24 }}>
                <SectionHeader title={t('workoutTab.sessionHistory')} />
                <View style={[s.histCard, { backgroundColor: theme.card }]}>
                  {[...points].reverse().map((p, i) => (
                    <View key={i} style={[s.histRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.histDate, { color: theme.text }]}>{fmt(p.date)}</Text>
                        {measure === 'weight' && p.volume > 0 && (
                          <Text style={[s.histVol, { color: theme.textMuted }]}>{t('workoutSession.volume')}: {Math.round(toDisplayWeight(p.volume, weightUnit))} {wLabel}</Text>
                        )}
                      </View>
                      <Text style={[s.histBest, { color: val(p) === pr ? '#FFD700' : theme.textSecondary }]}>
                        {fmtMeasure(val(p))}{measure === 'weight' && p.reps ? ` × ${p.reps}` : ''}{val(p) === pr ? ' 🏆' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 14, marginTop: 8, marginBottom: 4 },
  heroTile: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.electric + '26' },
  heroImg: { width: 120, height: 120, borderRadius: 24, backgroundColor: '#fff' },
  heroName: { textAlign: 'center', marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 16 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barLabel: { fontSize: 13.5, fontFamily: Fonts.medium },
  barPct: { fontSize: 12, fontFamily: Fonts.monoBold },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  chartCard: { borderRadius: 16, padding: 16, marginTop: 24 },
  histCard: { borderRadius: 16, paddingHorizontal: 14 },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  histDate: { fontSize: 14, fontFamily: Fonts.medium },
  histVol: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  histBest: { fontSize: 14, fontFamily: Fonts.monoBold },
});
