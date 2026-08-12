import React from 'react';
import { Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';

// Pill chip for filters / tags. Active = electric fill. Used for categories, amenities,
// specialties, muscle/equipment filters, etc.
export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <Pressable
      onPress={() => { if (onPress) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); } }}
      style={[
        s.chip,
        { backgroundColor: active ? Colors.electric : theme.card, borderColor: active ? Colors.electric : theme.border },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={13} color={active ? '#04120B' : theme.textSecondary} />}
      <Text style={[s.text, { color: active ? '#04120B' : theme.textSecondary }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1 },
  text: { fontFamily: Fonts.semibold, fontSize: 13 },
});
