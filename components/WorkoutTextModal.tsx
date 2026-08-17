// Bottom-sheet that lists a workout's full detail as plain text (bullet lines
// per set / combo move / interval). Opened from a program day's "view as text".
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Type } from '@/constants/typography';
import { workoutSummary } from '@/lib/workout-summary';

export default function WorkoutTextModal({
  visible, onClose, title, exercises,
}: { visible: boolean; onClose: () => void; title: string; exercises: any[] }) {
  const { isDark, weightUnit } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const blocks = workoutSummary(exercises || [], weightUnit);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handleWrap}><View style={[s.handle, { backgroundColor: theme.border }]} /></View>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
            {blocks.length === 0 ? (
              <Text style={[Type.body, { color: theme.textMuted, paddingVertical: 24, textAlign: 'center' }]}>No exercises.</Text>
            ) : blocks.map((b, i) => (
              <View key={i} style={[s.card, { backgroundColor: theme.card }]}>
                <View style={s.cardHead}>
                  <Text style={[s.cardTitle, { color: theme.text }]}>{i + 1}. {b.title}</Text>
                  {!!b.sub && <Text style={[s.cardSub, { color: Colors.electric }]}>{b.sub}</Text>}
                </View>
                {b.lines.map((ln, j) => (
                  <View key={j} style={s.row}>
                    <View style={[s.dot, { backgroundColor: theme.textMuted }]} />
                    <Text style={[s.line, { color: theme.textSecondary }]}>{ln}</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: Platform.OS === 'web' ? '85%' : '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 6 },
  handleWrap: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  title: { ...Type.h1, flex: 1 },
  card: { borderRadius: 14, padding: 14, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { ...Type.bodyMed, flex: 1 },
  cardSub: { ...Type.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
  line: { ...Type.body, fontSize: 13.5, flex: 1 },
});
