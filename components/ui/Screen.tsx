import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';

// Base screen wrapper: themed background + an ambient top glow (the near-black + faint
// brand halo of the reference decks). Pass `edges` to control safe-area padding.
export function Screen({
  children,
  style,
  glow = true,
  padTop = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  padTop?: boolean;
}) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: padTop ? insets.top : 0 }, style]}>
      {glow && (
        <LinearGradient
          colors={[theme.bgGlow, 'transparent']}
          style={[styles.glow, { height: 220 + insets.top }]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
});
