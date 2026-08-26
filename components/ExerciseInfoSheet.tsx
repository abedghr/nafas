import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { bodyTargetLabel, muscleLabel, equipLabel } from '@/lib/exercise-i18n';

// Exercise info as a Modal (not a pushed screen), so it floats ABOVE any host
// modal (the program day sheet, the combo builder) instead of rendering behind
// it. Reads everything from the passed exercise object — no fetch, no nav.
export default function ExerciseInfoSheet({ ex, onClose }: { ex: any | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { isDark, language } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const isAr = language === 'ar';
  const media = ex?.gifUrl || ex?.imageUrl;
  const targets: { bodyTarget: string; percentage: number }[] = ex?.bodyTargets || [];
  const steps: string[] = Array.isArray(ex?.instructions) ? ex.instructions : (ex?.instructions ? String(ex.instructions).split('\n').filter(Boolean) : []);

  return (
    <Modal visible={!!ex} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: theme.background }]}>
          <View style={s.handleWrap}><View style={[s.handle, { backgroundColor: theme.border }]} /></View>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>{ex?.name}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>
          {ex && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
              {media ? (
                <Image source={{ uri: media }} style={s.media} resizeMode="contain" />
              ) : (
                <LinearGradient colors={[Colors.electric + '2E', Colors.electric + '0A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.media, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="body-outline" size={44} color={Colors.electric} />
                </LinearGradient>
              )}
              <View style={s.chips}>
                {!!ex.primaryMuscle && <View style={[s.chip, { backgroundColor: Colors.electric + '20' }]}><Text style={[s.chipText, { color: Colors.electric }]}>{muscleLabel(ex.primaryMuscle, isAr)}</Text></View>}
                {!!ex.equipment && <View style={[s.chip, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}><Ionicons name="barbell-outline" size={13} color={theme.textSecondary} /><Text style={[s.chipText, { color: theme.textSecondary }]}>{equipLabel(ex.equipment, isAr)}</Text></View>}
              </View>

              {!!ex.description && (
                <>
                  <Text style={[s.sectionTitle, { color: theme.textMuted }]}>{t('workoutTab.about', { defaultValue: 'About' })}</Text>
                  <View style={[s.card, { backgroundColor: theme.card }]}>
                    <Text style={[Type.body, { color: theme.textSecondary }]}>{ex.description}</Text>
                  </View>
                </>
              )}

              {steps.length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { color: theme.textMuted }]}>{t('workoutTab.howTo', { defaultValue: 'How to do it' })}</Text>
                  <View style={[s.card, { backgroundColor: theme.card, gap: 10 }]}>
                    {steps.map((st, i) => (
                      <View key={i} style={s.stepRow}>
                        <View style={[s.stepNum, { backgroundColor: Colors.electric + '20' }]}><Text style={[s.stepNumText, { color: Colors.electric }]}>{i + 1}</Text></View>
                        <Text style={[Type.body, { color: theme.textSecondary, flex: 1 }]}>{st}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {targets.length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { color: theme.textMuted }]}>{t('workoutTab.targetMuscles', { defaultValue: 'Target muscles' })}</Text>
                  <View style={[s.card, { backgroundColor: theme.card, gap: 12 }]}>
                    {targets.map((tg) => (
                      <View key={tg.bodyTarget}>
                        <View style={s.barTop}>
                          <Text style={[s.barLabel, { color: theme.text }]}>{bodyTargetLabel(tg.bodyTarget, isAr)}</Text>
                          <Text style={[s.barPct, { color: theme.textMuted }]}>{tg.percentage}%</Text>
                        </View>
                        <View style={[s.barTrack, { backgroundColor: theme.cardAlt }]}>
                          <View style={[s.barFill, { width: `${tg.percentage}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '88%' },
  handleWrap: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { flex: 1, fontFamily: Fonts.bold, fontSize: 20, marginRight: 12 },
  media: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipText: { fontFamily: Fonts.semibold, fontSize: 13 },
  sectionTitle: { fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  card: { borderRadius: 16, padding: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 12, fontFamily: Fonts.bold },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontFamily: Fonts.semibold, fontSize: 14 },
  barPct: { fontFamily: Fonts.monoBold, fontSize: 13 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: Colors.electric },
});
