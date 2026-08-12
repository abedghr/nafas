import React from 'react';
import { View, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp, type Program } from '@/lib/app-context';
import { confirmDialog } from '@/lib/dialog';
import { Button, Chip, ProgressRing, EmptyState, Display } from '@/components/ui';
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text}>{t('programs.title')}</Display>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View entering={FadeInDown.duration(450)} style={{ marginBottom: 20 }}>
          <Button
            variant="primary"
            label={t('programs.newProgram')}
            playIcon="add"
            onPress={handleNewProgram}
          />
        </Animated.View>

        {programs.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('programs.noPrograms')}
            subtitle={t('programs.noProgramsSub')}
          />
        ) : (
          programs.map((p, index) => {
            const planned = plannedCount(p);
            const progress = p.weeks > 0 ? Math.min(1, planned / (p.weeks * 7)) : 0;
            return (
              <Animated.View key={p.id} entering={FadeInDown.duration(350).delay(index * 70)}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(('/program/' + p.id) as any);
                  }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
                >
                  <View style={[s.programCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <ProgressRing value={progress} size={56} stroke={5} color={Colors.electric} />
                    <View style={{ flex: 1 }}>
                      <Display variant="d3" color={theme.text} numberOfLines={1}>{p.name}</Display>
                      <View style={s.chipRow}>
                        <Chip label={t('programs.weeksCount', { n: p.weeks })} icon="calendar-outline" />
                        <Chip label={t('programs.plannedDays', { n: planned })} icon="barbell-outline" />
                      </View>
                    </View>
                    <Pressable onPress={() => handleDelete(p)} hitSlop={10} style={s.trashBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.semantic.danger} />
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  programCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  trashBtn: { padding: 6 },
});
