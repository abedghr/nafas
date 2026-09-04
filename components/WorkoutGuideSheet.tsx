// A read-only help sheet explaining the workout types (set types, blocks, combo
// modes) with a one-line description + a concrete example for each. Opened from
// the workout builder's tool row.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';

type Item = { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; desc: string; example: string };

export default function WorkoutGuideSheet({ visible, onClose, theme }: {
  visible: boolean;
  onClose: () => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();

  const sections: { key: string; heading: string; sub: string; items: Item[] }[] = [
    {
      key: 'sets',
      heading: t('guide.setsHeading', { defaultValue: 'Set types' }),
      sub: t('guide.setsSub', { defaultValue: 'How one set is measured' }),
      items: [
        { icon: 'repeat', color: Colors.electric, title: t('guide.repsTitle', { defaultValue: 'Reps' }),
          desc: t('guide.repsDesc', { defaultValue: 'A number of repetitions, with optional weight.' }),
          example: t('guide.repsEx', { defaultValue: 'Bench Press, 10 reps at 60 kg.' }) },
        { icon: 'timer-outline', color: Colors.semantic.info, title: t('guide.holdTitle', { defaultValue: 'Hold' }),
          desc: t('guide.holdDesc', { defaultValue: 'An isometric hold for a number of seconds (no reps). Can also be a max hold to failure.' }),
          example: t('guide.holdEx', { defaultValue: 'Plank for 60 s, or a 90° Dip Hold for 20 s.' }) },
        { icon: 'stopwatch-outline', color: Colors.accent, title: t('guide.emomSetTitle', { defaultValue: 'EMOM' }),
          desc: t('guide.emomSetDesc', { defaultValue: 'Every Minute On the Minute: do fixed reps at the start of each interval, rest the rest of the minute, repeat for N intervals.' }),
          example: t('guide.emomSetEx', { defaultValue: '5 Pull-ups every 60 s for 10 minutes = 50 total.' }) },
      ],
    },
    {
      key: 'blocks',
      heading: t('guide.blocksHeading', { defaultValue: 'Block types' }),
      sub: t('guide.blocksSub', { defaultValue: 'What one row in the workout is' }),
      items: [
        { icon: 'barbell-outline', color: Colors.electric, title: t('guide.exerciseTitle', { defaultValue: 'Exercise' }),
          desc: t('guide.exerciseDesc', { defaultValue: 'One movement with its own sets.' }),
          example: t('guide.exerciseEx', { defaultValue: 'Squat: 8, 8, 6 reps across 3 sets.' }) },
        { icon: 'git-merge-outline', color: Colors.accent, title: t('guide.comboTitle', { defaultValue: 'Combo' }),
          desc: t('guide.comboDesc', { defaultValue: 'Several movements chained back-to-back as one unit (a superset / circuit). It has a mode, below.' }),
          example: t('guide.comboEx', { defaultValue: 'Pull-up + Dip + Push-up done together.' }) },
        { icon: 'bicycle-outline', color: Colors.semantic.info, title: t('guide.intervalsTitle', { defaultValue: 'Intervals' }),
          desc: t('guide.intervalsDesc', { defaultValue: 'A cardio work / recovery block (run, bike, row), repeated for rounds. Work and recovery can be by time or distance, with an optional target pace.' }),
          example: t('guide.intervalsEx', { defaultValue: 'Run 400 m hard, jog 200 m easy, × 8.' }) },
      ],
    },
    {
      key: 'modes',
      heading: t('guide.modesHeading', { defaultValue: 'Combo modes' }),
      sub: t('guide.modesSub', { defaultValue: 'How a combo is paced' }),
      items: [
        { icon: 'sync-outline', color: Colors.electric, title: t('guide.circuitTitle', { defaultValue: 'Circuit' }),
          desc: t('guide.circuitDesc', { defaultValue: 'Do each move once in sequence = one round, rest, repeat for R rounds.' }),
          example: t('guide.circuitEx', { defaultValue: '3 rounds of 10 Pull-ups + 15 Dips + 20 Push-ups.' }) },
        { icon: 'stopwatch-outline', color: Colors.accent, title: t('guide.emomComboTitle', { defaultValue: 'EMOM (combo)' }),
          desc: t('guide.emomComboDesc', { defaultValue: 'The combo is paced by the clock: start the next round each minute, rest the remainder.' }),
          example: t('guide.emomComboEx', { defaultValue: 'Every minute: 5 Thrusters + 5 Burpees, for 10 minutes.' }) },
        { icon: 'infinite-outline', color: Colors.semantic.info, title: t('guide.amrapTitle', { defaultValue: 'AMRAP' }),
          desc: t('guide.amrapDesc', { defaultValue: 'As Many Rounds As Possible inside a fixed time cap. You count completed rounds.' }),
          example: t('guide.amrapEx', { defaultValue: '10-min AMRAP of 5 Pull-ups + 10 Push-ups + 15 Squats.' }) },
        { icon: 'link-outline', color: Colors.semantic.warn, title: t('guide.unbrokenTitle', { defaultValue: 'Unbroken' }),
          desc: t('guide.unbrokenDesc', { defaultValue: 'A flag on a combo: do all moves in a round with no rest and without putting the weight down.' }),
          example: t('guide.unbrokenEx', { defaultValue: 'Unbroken set of Curl + Press + Row, no rest until the round ends.' }) },
      ],
    },
  ];

  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: theme.background }]}>
          <View style={s.handleWrap}><View style={[s.handle, { backgroundColor: theme.border }]} /></View>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]}>{t('guide.title', { defaultValue: 'Workout types' })}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
            {sections.map((sec) => (
              <View key={sec.key} style={{ marginTop: 18 }}>
                <Text style={[s.secHeading, { color: theme.text }]}>{sec.heading}</Text>
                <Text style={[s.secSub, { color: theme.textMuted }]}>{sec.sub}</Text>
                {sec.items.map((it) => (
                  <View key={it.title} style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={s.cardHead}>
                      <View style={[s.iconBox, { backgroundColor: it.color + '22' }]}>
                        <Ionicons name={it.icon} size={17} color={it.color} />
                      </View>
                      <Text style={[s.cardTitle, { color: theme.text }]}>{it.title}</Text>
                    </View>
                    <Text style={[s.cardDesc, { color: theme.textSecondary }]}>{it.desc}</Text>
                    <View style={[s.exampleRow, { backgroundColor: theme.cardAlt }]}>
                      <Ionicons name="bulb-outline" size={13} color={it.color} />
                      <Text style={[s.exampleText, { color: theme.textSecondary }]}>{it.example}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingHorizontal: 16 },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  secHeading: { fontSize: 16, fontWeight: '800' },
  secSub: { fontSize: 12.5, fontWeight: '500', marginTop: 2, marginBottom: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '700' },
  cardDesc: { fontSize: 13.5, fontWeight: '400', lineHeight: 20, marginTop: 8 },
  exampleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 10, padding: 10, marginTop: 10 },
  exampleText: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
});
