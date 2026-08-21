// Program history — every day you marked done / skipped / rested for a program,
// newest first, plus headline stats. Tracks progress across the program.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type, Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';
import { programStats, ordinalOf } from '@/lib/program-schedule';

export default function ProgramHistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs, enrollments, workoutLogs, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const program = programs.find((p: any) => p.id === id);
  // most-recent enrollment for this program
  const enr = useMemo(() => enrollments.filter((e) => e.programId === id)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0], [enrollments, id]);

  const rows = useMemo(() => {
    if (!enr) return [];
    return [...enr.completions].sort((a, b) => new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime());
  }, [enr]);

  const st = program && enr ? programStats(enr, program, workoutLogs) : null;
  const dayName = (w: number, d: number) => program?.days?.find((x: any) => x.weekIndex === w && x.dayIndex === d)?.name || t('programs.restDay');
  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const chip = (status: string) => status === 'done'
    ? { c: Colors.semantic.success, i: 'checkmark-circle' as const }
    : status === 'skipped' ? { c: Colors.semantic.warn, i: 'close-circle' as const }
    : { c: theme.textSecondary, i: 'moon' as const }; // rest

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{t('programs.history', { defaultValue: 'History' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {!program || !enr ? (
          <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 40 }]}>{t('programs.noHistory', { defaultValue: 'No history yet.' })}</Text>
        ) : (
          <>
            <Text style={[s.progName, { color: theme.text }]}>{program.name}</Text>
            {st && (
              <View style={s.statsRow}>
                {[
                  { label: t('programs.statDone', { defaultValue: 'Done' }), value: String(st.done), color: Colors.semantic.success },
                  { label: t('programs.statSkipped', { defaultValue: 'Skipped' }), value: String(st.skipped), color: Colors.semantic.warn },
                  { label: t('programs.statRest', { defaultValue: 'Rest' }), value: String(st.rest), color: theme.textSecondary },
                  { label: t('programs.statTime', { defaultValue: 'Time' }), value: st.minutes >= 60 ? `${Math.floor(st.minutes / 60)}h ${st.minutes % 60}m` : `${st.minutes}m`, color: theme.text },
                ].map((ti, i) => (
                  <View key={i} style={[s.statTile, { backgroundColor: theme.card }]}>
                    <Text style={[s.statValue, { color: ti.color }]} numberOfLines={1}>{ti.value}</Text>
                    <Text style={[s.statLabel, { color: theme.textMuted }]}>{ti.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ gap: 10, marginTop: 20 }}>
              {rows.length === 0 ? (
                <Text style={[Type.body, { color: theme.textMuted, textAlign: 'center', marginTop: 20 }]}>{t('programs.noHistory', { defaultValue: 'No history yet.' })}</Text>
              ) : rows.map((c, i) => {
                const ord = program ? ordinalOf(program, c.weekIndex, c.dayIndex) : -1;
                const ch = chip(c.status);
                return (
                  <View key={i} style={[s.row, { backgroundColor: theme.card }]}>
                    <View style={[s.rowIcon, { backgroundColor: ch.c + '1E' }]}><Ionicons name={ch.i} size={18} color={ch.c} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.rowTitle, { color: theme.text }]} numberOfLines={1}>{ord >= 0 ? `${t('programs.dayN', { n: ord + 1, defaultValue: `Day ${ord + 1}` })} · ` : ''}{dayName(c.weekIndex, c.dayIndex)}</Text>
                      <Text style={[s.rowMeta, { color: theme.textMuted }]}>{fmtDate(c.completedDate)}{c.durationMin ? `  ·  ${c.durationMin}m` : ''}</Text>
                    </View>
                    <Text style={[s.rowStatus, { color: ch.c }]}>{t(`programs.${c.status}`, { defaultValue: c.status })}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerTitle: { ...Type.h1, flex: 1, textAlign: 'center' },
  progName: { ...Type.h2, marginTop: 8, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statTile: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: Fonts.monoBold, fontSize: 16 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...Type.bodyMed },
  rowMeta: { ...Type.caption, marginTop: 2 },
  rowStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
