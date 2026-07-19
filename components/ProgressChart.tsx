import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';

// Minimal dependency-free line chart (react-native-svg) — weight over sessions.
// ponytail: fixed-height, first/last x-labels only; upgrade to a charting lib if
// interactivity (scrub/zoom) is ever needed.
export default function ProgressChart({ points, theme }: {
  points: { date: string; weight: number }[];
  theme: typeof Colors.dark;
}) {
  const { width: winW } = useWindowDimensions();
  const W = Math.min(winW, 500) - 40 - 32; // screen padding + card padding
  const H = 180;
  const PAD = { top: 16, bottom: 24, left: 34, right: 12 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  if (points.length === 0) return null;

  const ws = points.map((p) => p.weight);
  let min = Math.min(...ws);
  let max = Math.max(...ws);
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; } // flat series → give the line room

  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (w: number) => PAD.top + ih - ((w - min) / (max - min)) * ih;

  const coords = points.map((p, i) => `${x(i)},${y(p.weight)}`).join(' ');
  const fill = `${PAD.left},${PAD.top + ih} ${coords} ${x(points.length - 1)},${PAD.top + ih}`;
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const gridWs = [max, (max + min) / 2, min];

  return (
    <View>
      <Svg width={W} height={H}>
        {gridWs.map((w, i) => (
          <React.Fragment key={i}>
            <Line x1={PAD.left} y1={y(w)} x2={W - PAD.right} y2={y(w)} stroke={theme.border} strokeWidth={1} strokeDasharray="3 5" />
            <SvgText x={PAD.left - 6} y={y(w) + 3.5} fill={theme.textMuted} fontSize={10} textAnchor="end">{Math.round(w)}</SvgText>
          </React.Fragment>
        ))}
        {points.length > 1 && <Polygon points={fill} fill={Colors.primary} opacity={0.08} />}
        {points.length > 1 && <Polyline points={coords} fill="none" stroke={Colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.weight)} r={i === points.length - 1 ? 5 : 3.5}
            fill={i === points.length - 1 ? Colors.primary : theme.background}
            stroke={Colors.primary} strokeWidth={2} />
        ))}
        <SvgText x={x(0)} y={H - 6} fill={theme.textMuted} fontSize={10} textAnchor="start">{fmt(points[0].date)}</SvgText>
        {points.length > 1 && (
          <SvgText x={x(points.length - 1)} y={H - 6} fill={theme.textMuted} fontSize={10} textAnchor="end">{fmt(points[points.length - 1].date)}</SvgText>
        )}
      </Svg>
    </View>
  );
}
