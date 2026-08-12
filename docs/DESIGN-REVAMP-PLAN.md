# Nafas — Full Design Revamp Plan

Goal: move from a flat, templated, "AI-generated" look to a **professional, editorial, energetic**
fitness product that impresses on first open. Quoted in spirit from the reference decks
(bold condensed display type, full-bleed athletic photography, one electric-green accent on
near-black, activity rings, glassy pills, kinetic motion) — but made **Nafas** (Arabic-native,
MENA), not a clone.

## Scope (read first)
- **Design only.** We quote the reference decks' **visual language** (layout, imagery,
  hierarchy, type, color energy, motion) — NOT their features or content. Every existing Nafas
  **feature, screen, route, and business rule stays exactly as-is.** Nothing is added or removed
  functionally; each screen is re-skinned.
- **Kill the "dry" screens.** The biggest offenders are the text-only list/directory/profile
  screens — **gyms, events, coaches, restaurants, community, programs.** Today: plain text +
  descriptions, no imagery, weak hierarchy. Target: photo-led cards, clear headings, ratings/tags
  as chips, hero headers — readable and impressive, same data underneath.

## Locked decisions (defaults — say the word to change any)
- **Accent:** electric emerald `#2BE38A` (ref look) + `#00A87A` pressed; teal `#00C896` → legacy/success. Orange demoted.
- **Display font:** Bebas Neue (Latin, uppercase condensed) + Cairo (Arabic display) + a mono for numbers/timers. Rubik → body.
- **Photography:** licensed athletic photos scoped to hero/discover/gym/event/coach surfaces; per-exercise stays the branded icon tile.

---

## 1. Design direction — "Kinetic Editorial, Arabic-native"

The single POV that carries the whole revamp. Four levers, in order of impact:

1. **Type is the hero.** The #1 reason the refs read "pro" and ours reads "flat" is the
   **heavy condensed display face** on headlines. Add one. Numbers/timers get a mono face so
   stats feel instrument-grade. Rubik drops to body only.
2. **One electric accent, ruthless discipline.** Keep Nafas green but push a brighter
   **electric emerald** for CTAs / rings / active states. Retire orange as a co-primary →
   rare secondary only (streak/nutrition). One loud color = pro; two = amateur.
3. **Photography, but scoped.** Hero / discover / coach / gym / marketing cards use full-bleed
   **athletic photography** with a gradient scrim + uppercase overlay title (the ref look).
   **Per-exercise stays the branded icon tile** (prior decision — owned, no licensing). Firm
   rule so the image question doesn't reopen.
4. **Depth + motion = the "wow".** Soft elevation, subtle top-glow gradients, glass tab bar,
   **animated activity rings + count-up stats**, staggered card entrance, press-scale, and
   hero→detail shared-element-style transitions (Reanimated 3). Motion is what makes it feel
   alive and expensive.

**Signature element (the one memorable thing):** the **activity-ring cluster** paired with
**kinetic stat counters** (numbers animate up on view) on the dashboard. Everything else stays
quiet around it.

---

## 2. Foundations (design system) — build FIRST, reskin everywhere

### 2.1 Color (`constants/colors.ts` → expand to tokens)
- Background ramp: `#07070B` (base) → `#101017` (surface) → `#17171F` (card) → `#20202B` (raised).
- Primary: keep brand `#00C896`; add **electric** `#2BE38A` (CTAs/rings/active) + `#00A87A` (pressed).
- Secondary (rare): orange `#FF6B35` — streak/nutrition accents only.
- Data-viz ring set (from refs): green `#2BE38A`, amber `#FFB020`, blue `#3B9EFF`.
- Semantic: success/warn/danger/info. Text ramp: `#FFFFFF` → `#A8A8B8` → `#5C5C72`.
- Light theme mirrors every token (app already supports dark/light).

### 2.2 Type
- **Display:** Bebas Neue (Latin, uppercase condensed — the "PUSH YOURSELF HARDER" look).
- **Body/UI:** Rubik (keep, 400/500/600/700).
- **Numeric/timers:** a mono (e.g. Rubik already has tabular-ish; add `Martian Mono` or
  `JetBrains Mono` for timers/weights so digits don't jitter).
- **Arabic:** Bebas has no Arabic → **Cairo** (bold weights) as the AR display + a strong body;
  headline size/weight tuned so AR hero cards feel as bold as Latin. Never condense Arabic.
- Type scale (Latin display / Rubik text): D1 40, D2 30, D3 22 · H1 20, H2 17, Body 15, Small 13,
  Caption 11. Line-heights + letter-spacing tuned per role (display tight, body relaxed).

### 2.3 Space / radius / elevation / motion tokens
- Spacing: 4-pt scale (4/8/12/16/20/24/32/40).
- Radius: 8 / 12 / 16 / 20 / 24 / full.
- Elevation: 3 levels (subtle shadow + hairline border on dark).
- Motion: durations (fast 150 / base 250 / slow 400), spring presets (press, enter, sheet),
  standard easings. One file (`constants/motion.ts`).

### 2.4 Component kit (`components/ui/`) — the multiplier
Build once, every screen inherits the new look:
`Screen` (safe-area + bg glow), `AppHeader` (avatar + greeting + actions), `Button`
(primary / pill-with-play / icon / ghost), `HeroCard` (photo + scrim + uppercase title + CTA),
`PhotoTile`, `StatTile`, `ActivityRings`, `CountUp`, `DayStrip`, `Chip`/`SegmentedToggle`,
`SectionHeader` (title + See-all), `ListRow`, `Sheet`, `Badge`, `Avatar`, `ProgressRing`,
`Skeleton`, `EmptyState`. All theme + RTL aware, Reanimated press states baked in.

---

## 3. Screen coverage — EVERY screen (nothing skipped)

Full re-skin of all screens + shared components. "Now" = current dryness; "Revamp" = kit
components + design moves applied. Business/logic unchanged in every row.

### Phase 0 — Foundations (unlocks everything; build first)
Color tokens, font stack, motion tokens, and the `components/ui/` kit (§2.4). Also re-skin the
**global chrome**: `app/(tabs)/_layout.tsx` glass tab bar, `app/_layout.tsx` providers/splash,
`ErrorBoundary`/`ErrorFallback`, `+not-found`, `CompleteProfileBanner`.

### Phase 1 — Workout core loop
| Screen | Now | Revamp |
|---|---|---|
| `(tabs)/coach` (Workout home) | flat cards, glyphs | hero photo card + CTA, day-strip, **activity-ring cluster + count-up stats**, program rail, section headers |
| `live-workout` | dense grid rows | premium set-table, animated rest ring, sticky glass header, per-exercise photo/tile, celebratory set-done motion |
| `prepare-workout` | plain form + sheets | hero header, photo type-picker, kit chips/sheets, sticky primary CTA |
| `workout-logger` | plain list | photo-led exercise cards, editorial headers |
| `exercise-progress` (detail) | basic chart | hero tile + stat tiles + animated `ProgressChart` + muscle bars + history rows |
| `workout-summary` | text stats | full-screen "win" moment — big numbers count-up, PR badges, share hero |
| `workout-detail/*` | text list | photo header + set breakdown cards |
| `saved-workouts` | text rows | photo template cards + tags + duration/level chips |
| `programs` + `program/*` | text list | photo program cards, week timeline, progress ring |
| `ComboBuilderModal`, `ExerciseRow`, `ExerciseFilterBar` | ok-ish | move onto kit tokens/type; keep icon tiles |

### Phase 2 — Daily: nutrition + profile + entry
| Screen | Now | Revamp |
|---|---|---|
| `(tabs)/nutrition` | plain macros | **macro rings** + kinetic calorie counter, meal timeline, food photo rows, water tracker |
| `meal-logger` | plain form/list | photo food cards, quick-add chips, kit sheet + search |
| `nutrition-targets` | form | goal hero + slider tiles + macro donut preview |
| `(tabs)/profile` | list rows | hero header (avatar + cover), stat tiles, achievement grid, interest chips, kit setting rows |
| `edit-profile` | form | sectioned kit form, avatar/cover picker, sticky save |
| `InBodySection` | table | metric tiles + trend sparklines |
| `onboarding` | basic steps | **full-bleed photo splash + progress dots** (ref splash), bold type, smooth step motion |
| `auth/*` (login/signup/otp/reset) | plain forms | branded photo/gradient hero, kit inputs, first-run must dazzle |

### Phase 3 — The "dry" ones: discover / social / marketplace
| Screen | Now | Revamp |
|---|---|---|
| `(tabs)/events` (Discover) | text list | trending photo hero, category rail, photo event cards w/ date badge + location chip |
| `event-profile/*` | text | photo hero, date/place/price chips, agenda, sticky register CTA |
| `(tabs)/index` + `community/*` + `comments/*` | text feed | rich feed cards (media, avatar, reactions), story-style rail, comment sheet |
| `coaching` + `coach-profile/*` | text bio | photo hero, verified badge, rating chips, specialty tags, package cards, book CTA |
| `gym-profile/*` + `my-gyms` | dry text | **photo gallery hero**, amenities as icon chips, rating, map preview, hours, join CTA |
| `restaurant-profile/*` | dry text | photo hero, cuisine/price chips, healthy-menu cards |
| `user-profile/*` | text | hero header, stat tiles, activity grid |
| `find-partner` | text list | photo partner cards, match chips, distance/level badges |
| `map` | bare map | branded markers, glass bottom-sheet result cards |

### Phase 4 — Management + long tail
| Screen | Revamp |
|---|---|
| `manage-gym`, `manage-events` | dashboard tiles, photo entity headers, kit tables/forms |
| `gym-leads`, `event-registrants` | clean list rows, status chips, avatars, empty states |
| `my-events` | photo event cards + status badges |
| `share-workout` | polished share hero (already gradient) → kit tokens |
| `DateTimeField`, `NativeMap(.web)`, `ProgressChart`, `MuscleMap`, `KeyboardAwareScrollViewCompat` | retokenize to the system |

### Cross-cutting (every phase, every screen)
Empty / loading (**skeletons**) / error / offline / rate-limited states · **AR + RTL parity** ·
dark **and** light · small-screen responsiveness · a11y (focus, reduced-motion, contrast) · haptics ·
FlatList for every long list.

---

## 4. RN execution notes
- **Reanimated 3** for all motion (press-scale, staggered `FadeInDown`, animated rings/counters,
  sheet springs). Keep on UI thread; respect reduced-motion.
- **expo-linear-gradient** (installed) for scrims/glows; **expo-blur** (installed) for glass tab
  bar + sheets; verify **expo-image** (add if missing) for cached photography, else `Image`.
- **FlatList** for every long list (exercise picker, feeds, directories) — no ScrollView+map.
- Fonts via `@expo-google-fonts/*` (bebas-neue, cairo, a mono) loaded in `app/_layout.tsx`.
- Migrate screen-by-screen onto the kit; delete per-screen `StyleSheet` bloat as we go.
- One PR per phase; typecheck + on-device check each; keep prod deployable throughout.

---

## 5. Open decisions (finalize before Phase 0)
1. **Accent:** keep teal `#00C896` vs shift to electric emerald `#2BE38A` (ref look).
2. **Display font:** Bebas Neue (uppercase condensed, most athletic) vs softer bold grotesk (Anton/Archivo).
3. **Photography:** OK to use licensed stock athletic photos on hero/marketing surfaces
   (max realism, external assets) vs owned gradient/illustration only (no licensing).

Recommended: electric emerald · Bebas Neue · licensed photography scoped to hero surfaces.

## 6. Sequencing
Phase 0 → 1 → 2 → 3 → 4. Ship each phase; the app looks progressively more premium and never
breaks. Estimated: Phase 0 largest; Phases 1-2 the visible transformation; 3-4 polish + parity.
