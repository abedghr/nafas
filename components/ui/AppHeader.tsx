import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';

// Top-of-screen identity row: avatar + greeting/name + optional actions (bell/settings).
export function AppHeader({
  name,
  greeting,
  avatar,
  onAvatar,
  actionIcon,
  onAction,
  actionBadge,
  secondaryActionIcon,
  onSecondaryAction,
  secondaryTint,
  style,
}: {
  name: string;
  greeting?: string;
  avatar?: ImageSourcePropType;
  onAvatar?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  actionBadge?: boolean;
  secondaryActionIcon?: keyof typeof Ionicons.glyphMap;
  onSecondaryAction?: () => void;
  secondaryTint?: string;
  style?: any;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[s.row, style]}>
      <Pressable onPress={onAvatar} style={s.left} hitSlop={6}>
        {avatar
          ? <Image source={avatar} style={s.avatar} contentFit="cover" />
          : <View style={[s.avatar, { backgroundColor: Colors.electric + '22', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={18} color={Colors.electric} /></View>}
        <View style={{ minWidth: 0 }}>
          {!!greeting && <Text style={[s.greeting, { color: theme.textMuted }]} numberOfLines={1}>{greeting}</Text>}
          <Text style={[Type.h2, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        </View>
      </Pressable>
      <View style={s.actions}>
        {secondaryActionIcon && (
          <Pressable
            onPress={onSecondaryAction}
            style={[s.action, secondaryTint ? { backgroundColor: secondaryTint + '1F', borderColor: secondaryTint + '55' } : { backgroundColor: theme.card, borderColor: theme.border }]}
            hitSlop={6}
          >
            <Ionicons name={secondaryActionIcon} size={20} color={secondaryTint || theme.text} />
          </Pressable>
        )}
        {actionIcon && (
          <Pressable onPress={onAction} style={[s.action, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={6}>
            <Ionicons name={actionIcon} size={20} color={theme.text} />
            {actionBadge && <View style={s.badge} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222' },
  greeting: { fontFamily: Fonts.medium, fontSize: 12 },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.semantic.danger },
});
