import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { Duration } from '@/constants/motion';
import { Fonts } from '@/constants/typography';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

const ACircle = Animated.createAnimatedComponent(Circle);

// Single percentage ring with a centered label (e.g. "20%" plan progress).
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = Colors.electric,
  track,
  labelColor,
  label,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  labelColor?: string;
  label?: string;
}) {
  const { isDark } = useApp();
  const trackColor = track ?? (isDark ? '#FFFFFF14' : '#00000012');
  const inkColor = labelColor ?? (isDark ? Colors.dark.text : Colors.light.text);
  const r = size / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: Duration.slow, easing: Easing.out(Easing.cubic) }); }, [value]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={circ} animatedProps={ap} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {!!label && <Text style={{ fontFamily: Fonts.monoBold, fontSize: size * 0.24, color: inkColor }}>{label}</Text>}
    </View>
  );
}
