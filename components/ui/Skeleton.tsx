import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';

// Shimmer placeholder for loading states.
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: ViewStyle }) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(o);
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: theme.cardAlt }, aStyle, style]} />;
}
