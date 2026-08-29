// Celebratory modal shown when a program run ends — whether the athlete
// completed every day (completed=true) or ended it early (completed=false).
// Primary action jumps to that run's statistics report.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function ProgramCompleteModal({
  visible, programName, completed, onView, onClose, theme,
}: {
  visible: boolean;
  programName: string;
  completed: boolean;
  onView: () => void;
  onClose: () => void;
  theme: any;
}) {
  const { t } = useTranslation();
  const accent = completed ? Colors.electric : Colors.accent;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.card, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
          <View style={[s.icon, { backgroundColor: accent + '22' }]}>
            <Ionicons name={completed ? 'trophy' : 'flag'} size={34} color={accent} />
          </View>
          <Text style={[s.title, { color: theme.text }]}>
            {completed ? t('programs.finishModalTitle', { defaultValue: 'Program complete!' }) : t('programs.endedModalTitle', { defaultValue: 'Program ended' })}
          </Text>
          <Text style={[s.body, { color: theme.textSecondary }]}>
            {completed
              ? t('programs.finishModalBody', { name: programName, defaultValue: `You finished "${programName}". See your full journey and your coach's analysis.` })
              : t('programs.endedModalBody', { name: programName, defaultValue: `You ended "${programName}". See how it went and your coach's analysis.` })}
          </Text>
          <Pressable
            onPress={onView}
            style={({ pressed }) => [s.primary, { backgroundColor: accent, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="stats-chart" size={17} color="#04120B" />
            <Text style={s.primaryText}>{t('programs.viewStats', { defaultValue: 'View statistics' })}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.secondary}>
            <Text style={[s.secondaryText, { color: theme.textMuted }]}>{t('programs.later', { defaultValue: 'Later' })}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '86%', maxWidth: 380, borderRadius: 22, padding: 24, alignItems: 'center' },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 21, fontFamily: Fonts.bold, textAlign: 'center' },
  body: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', borderRadius: 14, paddingVertical: 14, marginTop: 20 },
  primaryText: { fontSize: 15, fontFamily: Fonts.semibold, color: '#04120B' },
  secondary: { paddingVertical: 12, marginTop: 2 },
  secondaryText: { fontSize: 14, fontFamily: Fonts.medium },
});
