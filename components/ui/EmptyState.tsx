import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Button } from './Button';

// Consistent empty screen: icon + title + subtitle + optional action. An empty screen is an
// invitation to act.
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={s.wrap}>
      <View style={[s.iconCircle, { backgroundColor: Colors.electric + '18' }]}>
        <Ionicons name={icon} size={28} color={Colors.electric} />
      </View>
      <Text style={[Type.h2, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
      {!!subtitle && <Text style={[s.sub, { color: theme.textMuted }]}>{subtitle}</Text>}
      {actionLabel && onAction && <Button label={actionLabel} variant="solid" onPress={onAction} style={{ marginTop: 8 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sub: { fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
