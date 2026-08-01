// Original, owned stylized anatomy figure geometry (front + back). Single source
// used BOTH by the live <MuscleMap> component and by scripts/gen-muscle-svgs.mjs
// which writes an owned SVG asset per exercise into assets/exercises/. All original
// art — highlights the worked muscle from an exercise's body-target enums.

export type Shape = { cx: number; cy: number; rx: number; ry: number };

// which of the 26 body-target enums render on the BACK view
export const BACK_MUSCLES = new Set(['traps', 'upper_back', 'mid_back', 'lats', 'lower_back', 'erector_spinae', 'shoulders_posterior', 'triceps', 'glutes', 'hamstrings']);

export const FRONT_REGIONS: Record<string, Shape[]> = {
  shoulders_anterior: [{ cx: 33, cy: 40, rx: 8, ry: 7 }, { cx: 87, cy: 40, rx: 8, ry: 7 }],
  shoulders_lateral: [{ cx: 30, cy: 44, rx: 6, ry: 7 }, { cx: 90, cy: 44, rx: 6, ry: 7 }],
  chest: [{ cx: 51, cy: 50, rx: 9, ry: 7 }, { cx: 69, cy: 50, rx: 9, ry: 7 }],
  biceps: [{ cx: 26, cy: 60, rx: 5, ry: 9 }, { cx: 94, cy: 60, rx: 5, ry: 9 }],
  forearms: [{ cx: 22, cy: 82, rx: 4, ry: 10 }, { cx: 98, cy: 82, rx: 4, ry: 10 }],
  core_abs: [{ cx: 60, cy: 64, rx: 8, ry: 6 }, { cx: 60, cy: 78, rx: 8, ry: 6 }],
  obliques: [{ cx: 47, cy: 72, rx: 3.5, ry: 9 }, { cx: 73, cy: 72, rx: 3.5, ry: 9 }],
  hip_flexors: [{ cx: 60, cy: 96, rx: 8, ry: 5 }],
  quadriceps: [{ cx: 51, cy: 122, rx: 7, ry: 16 }, { cx: 69, cy: 122, rx: 7, ry: 16 }],
  adductors: [{ cx: 60, cy: 120, rx: 4, ry: 12 }],
  calves: [{ cx: 51, cy: 172, rx: 5, ry: 14 }, { cx: 69, cy: 172, rx: 5, ry: 14 }],
};
export const BACK_REGIONS: Record<string, Shape[]> = {
  traps: [{ cx: 60, cy: 36, rx: 12, ry: 7 }],
  shoulders_posterior: [{ cx: 33, cy: 42, rx: 8, ry: 6 }, { cx: 87, cy: 42, rx: 8, ry: 6 }],
  upper_back: [{ cx: 50, cy: 52, rx: 8, ry: 7 }, { cx: 70, cy: 52, rx: 8, ry: 7 }],
  mid_back: [{ cx: 60, cy: 60, rx: 10, ry: 6 }],
  lats: [{ cx: 45, cy: 66, rx: 6, ry: 12 }, { cx: 75, cy: 66, rx: 6, ry: 12 }],
  triceps: [{ cx: 26, cy: 60, rx: 5, ry: 9 }, { cx: 94, cy: 60, rx: 5, ry: 9 }],
  forearms: [{ cx: 22, cy: 82, rx: 4, ry: 10 }, { cx: 98, cy: 82, rx: 4, ry: 10 }],
  lower_back: [{ cx: 60, cy: 86, rx: 9, ry: 7 }],
  erector_spinae: [{ cx: 60, cy: 86, rx: 5, ry: 10 }],
  glutes: [{ cx: 51, cy: 108, rx: 8, ry: 8 }, { cx: 69, cy: 108, rx: 8, ry: 8 }],
  hamstrings: [{ cx: 51, cy: 138, rx: 7, ry: 15 }, { cx: 69, cy: 138, rx: 7, ry: 15 }],
  calves: [{ cx: 51, cy: 172, rx: 5, ry: 14 }, { cx: 69, cy: 172, rx: 5, ry: 14 }],
};

export const SILHOUETTE = 'M60 4 c6 0 11 5 11 11 c0 4 -2 8 -5 10 l8 3 c9 3 17 8 17 16 l3 30 c1 9 -1 12 -4 12 c-3 0 -5 -3 -6 -10 l-2 26 l3 22 c1 8 -1 20 -3 30 c-2 10 -3 22 -3 32 c0 6 -6 6 -7 0 l-4 -34 l-3 -22 l-2 22 l-4 34 c-1 6 -7 6 -7 0 c0 -10 -1 -22 -3 -32 c-2 -10 -4 -22 -3 -30 l3 -22 l-2 -26 c-1 7 -3 10 -6 10 c-3 0 -5 -3 -4 -12 l3 -30 c0 -8 8 -13 17 -16 l8 -3 c-3 -2 -5 -6 -5 -10 c0 -6 5 -11 11 -11 Z';

// Build a standalone owned SVG string for an exercise (used by the file generator).
export function muscleSvgString(muscles: string[], opts?: { base?: string; hi?: string; mid?: string; bg?: string }): string {
  const base = opts?.base ?? '#9aa0ab88';
  const hi = opts?.hi ?? '#FF6B35';       // Colors.accent
  const mid = opts?.mid ?? '#FF6B3577';
  const bg = opts?.bg ?? '#FFFFFF';
  const top = muscles[0] || '';
  const set = new Set(muscles);
  const map = BACK_MUSCLES.has(top) ? BACK_REGIONS : FRONT_REGIONS;
  const blobs = Object.entries(map).flatMap(([m, shapes]) =>
    set.has(m) ? shapes.map(s => `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${m === top ? hi : mid}"/>`) : [],
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 210"><rect width="120" height="210" fill="${bg}"/><path d="${SILHOUETTE}" fill="${base}" stroke="#9aa0ab33" stroke-width="1"/>${blobs}</svg>`;
}
