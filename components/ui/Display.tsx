import React from 'react';
import { Text, TextProps } from 'react-native';
import { useApp } from '@/lib/app-context';
import { Type, displayFamily } from '@/constants/typography';
import Colors from '@/constants/colors';

// Editorial display type. Latin = Bebas Neue (uppercase, condensed); Arabic = Cairo Black
// (not uppercased, nudged smaller since Cairo runs large). The app's signature typographic move.
export function Display({
  variant = 'd2',
  color,
  style,
  children,
  ...rest
}: TextProps & { variant?: 'd1' | 'd2' | 'd3'; color?: string }) {
  const { language, isDark } = useApp();
  const isAr = language === 'ar';
  const ink = color ?? (isDark ? Colors.dark.text : Colors.light.text);
  const t = Type[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: displayFamily(isAr),
          fontSize: isAr ? Math.round(t.fontSize * 0.82) : t.fontSize,
          lineHeight: isAr ? Math.round(t.fontSize * 0.98) : t.lineHeight,
          letterSpacing: isAr ? 0 : t.letterSpacing,
          textTransform: isAr ? 'none' : 'uppercase',
          color: ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
