import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';

// Compact metric tile: dot/icon + mono value + label. The `value` is normally a <CountUp>.
export function StatTile({
  value,
  label,
  color = Colors.electric,
  icon,
  style,
}: {
  value: React.ReactNode;
  label: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[s.tile, { backgroundColor: theme.card }, style]}>
      <View style={s.top}>
        {icon ? <Ionicons name={icon} size={14} color={color} /> : <View style={[s.dot, { backgroundColor: color }]} />}
      </View>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={[Type.statSm, { color: theme.text }]}>{value}</Text>
        : value}
      <Text style={[s.label, { color: theme.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, borderRadius: 16, padding: 14, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: Fonts.medium, fontSize: 11 },
});
