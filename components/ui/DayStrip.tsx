import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';

// Weekly day selector — tall rounded pills, active one filled electric (reference "Weekly Plan").
export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: { num: string; label: string }[];
  selected: number;
  onSelect?: (i: number) => void;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={s.row}>
      {days.map((d, i) => {
        const active = i === selected;
        return (
          <Pressable
            key={i}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect?.(i); }}
            style={[s.pill, { backgroundColor: active ? Colors.electric : theme.card }]}
          >
            <Text style={[s.num, { color: active ? '#04120B' : theme.text }]}>{d.num}</Text>
            <Text style={[s.label, { color: active ? '#04120B' : theme.textMuted }]}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  pill: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: 999 },
  num: { fontFamily: Fonts.bold, fontSize: 15 },
  label: { fontFamily: Fonts.medium, fontSize: 11 },
});
