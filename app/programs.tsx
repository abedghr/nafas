import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, type Program } from '@/lib/app-context';
import { confirmDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';

export default function ProgramsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { programs, addProgram, deleteProgram, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleNewProgram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = addProgram({ name: 'New Program', startDate: null, weeks: 4, notes: '', days: [] });
    router.push(('/program/' + id) as any);
  };

  const handleDelete = async (p: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (await confirmDialog({
      title: t('programs.deleteProgram'),
      message: t('programs.deleteProgramConfirm', { name: p.name }),
      destructive: true,
      confirmText: t('programs.delete'),
      cancelText: t('programs.cancel'),
    })) {
      deleteProgram(p.id);
    }
  };

  const plannedCount = (p: Program) =>
    p.days.filter(d => !d.restDay && (d.templateId || d.label)).length;

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]}>{t('programs.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 40 }}
      >
        <Pressable onPress={handleNewProgram} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginBottom: 16 }]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.newBtn}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.newBtnText}>{t('programs.newProgram')}</Text>
          </LinearGradient>
        </Pressable>

        {programs.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.card }]}>
            <Ionicons name="calendar-outline" size={40} color={theme.textMuted} />
            <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>{t('programs.noPrograms')}</Text>
            <Text style={[s.emptySub, { color: theme.textMuted }]}>{t('programs.noProgramsSub')}</Text>
          </View>
        ) : (
          programs.map(p => (
            <Pressable
              key={p.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(('/program/' + p.id) as any);
              }}
              style={({ pressed }) => [s.programCard, { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[s.programIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.programName, { color: theme.text }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[s.programMeta, { color: theme.textMuted }]} numberOfLines={1}>
                  {t('programs.weeksCount', { n: p.weeks })} · {t('programs.plannedDays', { n: plannedCount(p) })}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(p)} hitSlop={10} style={s.trashBtn}>
                <Ionicons name="trash-outline" size={18} color="#F87171" />
              </Pressable>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  programCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  programIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  programName: { fontSize: 15, fontWeight: '600' },
  programMeta: { fontSize: 12, marginTop: 2 },
  trashBtn: { padding: 4 },
});
