// Motion tokens — one source for durations + spring presets so animation feels consistent.
// Reanimated 3. Respect reduced-motion at call sites where it matters.

export const Duration = { fast: 150, base: 250, slow: 400, count: 900 } as const;

export const Spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },   // button/card press-scale
  enter: { damping: 20, stiffness: 180, mass: 0.9 },    // element entrance
  sheet: { damping: 24, stiffness: 240, mass: 1 },      // bottom sheets
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },   // celebratory (set done, PR)
} as const;

export const PressScale = 0.97;
