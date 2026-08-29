// All finished / ended programs across the account, newest first. Each row
// opens that run's full report. (Per-program day history lives at ./[id].)
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';
import { buildReport, gradeOf } from '@/lib/program-report';

export default function EndedProgramsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { programs, enrollments, workoutLogs, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const rows = useMemo(() => {
    return (enrollments ?? [])
      .filter((e) => e.status !== 'active')
      .map((e) => {
        // live program, or the frozen snapshot if it was edited/deleted
        const program = (programs.find((p: any) => p.id === e.programId) ?? e.programSnapshot) as any;
        if (!program) return null; // pre-snapshot legacy run whose program is gone — nothing to show
        const r = buildReport(e, program, workoutLogs);
        return { e, program, r };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.r.endDate).getTime() - new Date(a!.r.endDate).getTime()) as { e: any; program: any; r: ReturnType<typeof buildReport> }[];
  }, [enrollments, programs, workoutLogs]);

  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
        <Text style={[s.headerTitle, { color: theme.text }]}>{t('history.title', { defaultValue: 'Program history' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ribbon-outline" size={40} color={theme.textMuted} />
            <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 12 }]}>
              {t('history.empty', { defaultValue: 'No finished programs yet. Complete or end a program to see it here.' })}
            </Text>
          </View>
        ) : rows.map(({ e, program, r }) => {
          const statusColor = e.status === 'finished' ? Colors.electric : Colors.semantic.warn;
          const statusLabel = e.status === 'finished' ? t('report.completed', { defaultValue: 'Completed' }) : t('report.endedEarly', { defaultValue: 'Ended early' });
          return (
            <Pressable
              key={e.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/program-report/${e.id}` as any); }}
              style={({ pressed }) => [s.row, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[s.gradeCircle, { borderColor: statusColor }]}>
                <Text style={[s.gradeText, { color: statusColor }]}>{gradeOf(r.completionRate)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
                <Text style={[s.sub, { color: theme.textMuted }]} numberOfLines={1}>
                  {fmt(r.startDate)} – {fmt(r.endDate)}
                </Text>
                <View style={s.metaRow}>
                  <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <Text style={[s.metaVal, { color: theme.textSecondary }]}>{Math.round(r.completionRate * 100)}% · {r.done + r.substituted}/{r.plannedSessions}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: Fonts.semibold },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  gradeCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 16, fontFamily: Fonts.bold },
  name: { fontSize: 15.5, fontFamily: Fonts.semibold },
  sub: { fontSize: 12.5, fontFamily: Fonts.regular, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaVal: { fontSize: 12.5, fontFamily: Fonts.medium },
});
