import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';
import Colors from '@/constants/colors';
import { FRONT_REGIONS, BACK_REGIONS, BACK_MUSCLES, SILHOUETTE } from '@/lib/muscle-figure';

// Original, owned stylized anatomy figure — highlights the worked muscle(s) live
// from the exercise's body-targets. Shares its geometry with lib/muscle-figure.ts
// (also used to generate the owned SVG files in assets/exercises/).
export default function MuscleMap({ muscles, primary, size = 44 }: {
  muscles?: string[];
  primary?: string;
  size?: number;
}) {
  const set = new Set(muscles || []);
  const top = primary || (muscles && muscles[0]) || '';
  const map = BACK_MUSCLES.has(top) ? BACK_REGIONS : FRONT_REGIONS;
  const base = Colors.dark.textMuted + '55';
  const hi = Colors.accent;
  const mid = Colors.accent + '77';

  return (
    <Svg width={size} height={size} viewBox="0 0 120 210">
      <Path d={SILHOUETTE} fill={base} stroke={Colors.dark.textMuted + '33'} strokeWidth={1} />
      {Object.entries(map).map(([m, shapes]) =>
        set.has(m) ? shapes.map((s, i) => (
          <Ellipse key={m + i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={m === top ? hi : mid} />
        )) : null,
      )}
    </Svg>
  );
}
