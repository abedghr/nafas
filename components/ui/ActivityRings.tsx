import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { Duration } from '@/constants/motion';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

const ACircle = Animated.createAnimatedComponent(Circle);

// Concentric activity rings (the dashboard signature). Each ring animates its fill on mount.
// Values are 0..1. Default palette matches the reference decks (green / amber / blue).
export function ActivityRings({
  size = 120,
  stroke = 9,
  gap = 5,
  rings = [
    { value: 0.68, color: Colors.ring.green },
    { value: 0.5, color: Colors.ring.amber },
    { value: 0.35, color: Colors.ring.blue },
  ],
  trackColor,
}: {
  size?: number;
  stroke?: number;
  gap?: number;
  rings?: { value: number; color: string }[];
  trackColor?: string;
}) {
  const { isDark } = useApp();
  const track = trackColor ?? (isDark ? '#FFFFFF12' : '#0000000D');
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap);
          return <Ring key={i} cx={size / 2} cy={size / 2} radius={radius} stroke={stroke} color={r.color} value={r.value} track={track} delay={i * 120} />;
        })}
      </Svg>
    </View>
  );
}

function Ring({ cx, cy, radius, stroke, color, value, track, delay }: { cx: number; cy: number; radius: number; stroke: number; color: string; value: number; track: string; delay: number }) {
  const circ = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), { duration: Duration.slow + 200, easing: Easing.out(Easing.cubic) });
  }, [value]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - progress.value) }));
  return (
    <>
      <Circle cx={cx} cy={cy} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
      <ACircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        animatedProps={animatedProps}
        // start at 12 o'clock
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}
