import React from 'react';
import { Text, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Spring, PressScale } from '@/constants/motion';

const AP = Animated.createAnimatedComponent(Pressable);

// Primary CTA is the white pill with an electric-green circular play/arrow button on the end
// (the reference "Start Workout" affordance). Also: icon and ghost variants.
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  playIcon = 'play',
  disabled,
  style,
}: {
  label?: string;
  onPress?: () => void;
  variant?: 'primary' | 'solid' | 'ghost' | 'icon';
  icon?: keyof typeof Ionicons.glyphMap;
  playIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };
  const down = () => { scale.value = withSpring(PressScale, Spring.press); };
  const up = () => { scale.value = withSpring(1, Spring.press); };

  if (variant === 'icon') {
    return (
      <AP onPress={press} onPressIn={down} onPressOut={up} style={[aStyle, s.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
        <Ionicons name={icon || 'ellipsis-horizontal'} size={20} color={theme.text} />
      </AP>
    );
  }

  if (variant === 'ghost') {
    return (
      <AP onPress={press} onPressIn={down} onPressOut={up} style={[aStyle, s.ghost, { borderColor: theme.border }, style]}>
        {icon && <Ionicons name={icon} size={18} color={theme.text} />}
        <Text style={[s.ghostText, { color: theme.text }]}>{label}</Text>
      </AP>
    );
  }

  if (variant === 'solid') {
    return (
      <AP onPress={press} onPressIn={down} onPressOut={up} style={[aStyle, s.solid, { backgroundColor: Colors.electric, opacity: disabled ? 0.5 : 1 }, style]}>
        <Text style={s.solidText}>{label}</Text>
        {icon && <Ionicons name={icon} size={18} color="#04120B" />}
      </AP>
    );
  }

  // primary: white pill + electric circular play button
  return (
    <AP onPress={press} onPressIn={down} onPressOut={up} style={[aStyle, s.primary, { opacity: disabled ? 0.5 : 1 }, style]}>
      <Text style={s.primaryText}>{label}</Text>
      <View style={s.playCircle}><Ionicons name={playIcon} size={16} color="#04120B" /></View>
    </AP>
  );
}

const s = StyleSheet.create({
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 999, paddingLeft: 20, paddingRight: 6, height: 52 },
  primaryText: { fontFamily: Fonts.bold, fontSize: 15, color: '#0A0A0F' },
  playCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.electric, alignItems: 'center', justifyContent: 'center' },
  solid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, height: 52, paddingHorizontal: 24 },
  solidText: { fontFamily: Fonts.bold, fontSize: 15, color: '#04120B' },
  ghost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, height: 48, paddingHorizontal: 20, borderWidth: 1 },
  ghostText: { fontFamily: Fonts.semibold, fontSize: 14 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
