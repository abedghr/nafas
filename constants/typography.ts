// Nafas type system. Display = Bebas Neue (Latin, uppercase condensed) / Cairo (Arabic).
// Body/UI = Rubik. Numbers/timers = Space Mono (tabular, no jitter).
// Use the tokens below, not raw fontFamily strings, so the whole app stays consistent.

export const Fonts = {
  displayLatin: 'BebasNeue_400Regular',
  displayAr: 'Cairo_900Black',
  displayArMed: 'Cairo_700Bold',
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

// Latin display face is condensed/uppercase; Arabic can't condense, so it swaps to Cairo Black.
export const displayFamily = (isAr: boolean) => (isAr ? Fonts.displayAr : Fonts.displayLatin);

// Type scale. Display roles are meant for the display family (set via <Display>).
// Sizes are the Latin baseline; Arabic display nudges smaller in the component (Cairo runs large).
export const Type = {
  d1: { fontSize: 44, lineHeight: 44, letterSpacing: 0.5 },
  d2: { fontSize: 32, lineHeight: 34, letterSpacing: 0.5 },
  d3: { fontSize: 24, lineHeight: 26, letterSpacing: 0.5 },
  h1: { fontFamily: Fonts.bold, fontSize: 20, lineHeight: 26 },
  h2: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMed: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  overline: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 13, letterSpacing: 1, textTransform: 'uppercase' as const },
  stat: { fontFamily: Fonts.monoBold, fontSize: 28, lineHeight: 30 },
  statSm: { fontFamily: Fonts.monoBold, fontSize: 18, lineHeight: 20 },
} as const;
