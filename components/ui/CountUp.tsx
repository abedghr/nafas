import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { Fonts } from '@/constants/typography';
import { Duration } from '@/constants/motion';

// Animated number that counts up on mount (kinetic stat counters — the dashboard signature).
// Plain RAF, no dependency; formats with the given formatter.
export function CountUp({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = Duration.count,
  style,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  style?: TextStyle;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    const start = Date.now();
    const startVal = from.current;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(startVal + (value - startVal) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <Text style={[{ fontFamily: Fonts.monoBold, color: '#fff' }, style]}>{format(display)}</Text>;
}
