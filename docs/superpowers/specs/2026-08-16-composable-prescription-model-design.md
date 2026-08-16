# Composable Prescription Model — Design Spec

Date: 2026-08-16 · Status: approved (Option B)

## Goal
Let Nafas represent **any** training prescription losslessly — not just the current
reps/hold/EMOM/combo set. Driven by the Flomarrec Endurance Program (pyramids, drop sets,
tempo, max-time holds, AMRAP, interval running, band assistance), but designed so future
programs (HIIT, running plans, powerlifting %1RM, mobility) fall out for free.

## Principle
Most "methods" are **straight sets with a richer per-movement target**, not new structures.
So we add:
1. **One enriched set target** (covers ~6 methods at once), and
2. **Two real block structures**: AMRAP + Intervals.
Circuit / superset / set-on-bar / one-shot / routines = existing **combos**. EMOM = exists.
No growing list of one-off types.

## Storage note (low migration cost)
Sets and blocks already live in **jsonb** (`SetConfig`, active-session exercises, template
`exercises`, program-day `exercises`). All additions below are **new optional fields on
existing jsonb shapes** → no SQL migration for the core; readers treat missing fields as
today's behavior. Backward-compatible by construction.

## 1. Enriched set target (`SetConfig` additions)
Today: `{ type: reps|hold|emom, reps?, weight?, durationSeconds?, ... }`. Add:
- `measure?: 'reps' | 'time' | 'distance'` — default derived from `type` (reps→reps, hold→time).
- `distanceMeters?: number` — for distance-measured work (runs, carries).
- `tempo?: string` — e.g. `"3/1/2/0"` (ecc/pause/con/pause) or `"x/2/2/1"`.
- `assist?: 'none' | 'band' | 'assisted' | 'partner'` — band-assisted / machine-assisted.
- `toFailure?: boolean` — max-time holds, AMRAP-of-one-move ("max chin-above").
- `rpe?: number` — 1–10 target effort (not in this program; common, free to include).
- `dropSteps?: { value?: number; load?: number; assist?: SetConfig['assist'] }[]` — a drop
  set as one logical set with descending sub-steps.
Keep `type`/`reps`/`durationSeconds`/`weight` as-is for back-compat.

### Methods this closes (from the program)
| Program method | Representation (no new type) |
|---|---|
| Pyramid `5/10/15/10/5` | straight sets, `value`/reps varied |
| Stress (pyramid, no rest) | same, `rest=0` |
| Drop set `+5kg→bw→band` | one set, `dropSteps` (load ↓, last `assist:band`) |
| Tempo `x/2/2/1` | `tempo` |
| Max-time hold | `measure:time, toFailure:true` |
| Band-assisted / +Nkg | `assist` / `weight` |

## 2. New block structures
### AMRAP (reuse combo machinery)
Combos already carry `mode: 'circuit' | 'emom'`, `components`, `rounds`, `unbroken`. Add:
- `mode: 'amrap'` + `timeCapSeconds: number`.
Runner shows a countdown of `timeCapSeconds`; user taps to complete rounds; each round =
one pass through `components`. Log = rounds completed + partial reps.
- Example (program): AMRAP 10 min → `mode:amrap, timeCapSeconds:600, components:[10″ chin-above +15kg (time), 10″ dips 90° +15kg (time), 5 pull-ups ds (reps), 5 dips ds (reps)]`.

### Intervals (new block — the general cardio/HIIT engine)
A block type `intervals`:
- `work: { measure:'time'|'distance', durationSeconds?|distanceMeters?, pace?: string }`
- `recovery: { measure, durationSeconds?|distanceMeters?, kind:'passive'|'active' }`
- `rounds: number`
Runner drives work→recovery countdown ×rounds; captures distance/pace where relevant.
- Example (program Sat): `work: run 180s @≥4'30/km, recovery: walk 90s passive, rounds:4`.
- Example (wk3): `work 30s hard / recovery 30s, rounds:6`.

Where it lives: a session exercise/`ProgramDay` entry can be `kind:'intervals'` alongside
normal exercises and combos (a third block kind besides single-exercise and combo).

## Phases (each ships usable)
- **P1 — Data model + mapping.** Extend `SetConfig`, combo `mode:'amrap'`+`timeCapSeconds`,
  add `intervals` block type across the shared types (`lib/app-context` + server zod schemas
  for templates/programs/logs). No UI yet. Acceptance: a program/template/log carrying the
  new fields round-trips through the API unchanged; existing data still loads.
- **P2 — Authoring.** Set editor gains tempo / assist / measure / toFailure / RPE. Add an
  **AMRAP builder** (time cap + component list, reuse ComboBuilder) and an **Interval builder**
  (work/recovery/rounds/pace/distance). Wired into prepare-workout, ComboBuilder, and the
  program-day editor. Acceptance: can author each program method from the mapping table.
- **P3 — Live runner.** AMRAP countdown + round tally; interval work/rest auto-advance timer
  with distance/pace capture; tempo/assist/toFailure shown as cues; distance/time sets input.
  Acceptance: run an AMRAP and an interval block end-to-end; logged correctly.
- **P4 — Stats.** Progress/summary aggregate across mixed measures (weighted-rep volume,
  time-under-tension, distance totals) without double-counting. Acceptance: a mixed session
  shows correct per-measure totals.
- **P5 — Import the Endurance Program.** Author all 4 weeks on the new model under the
  owner's account (seed script or authenticated create). Acceptance: every session from the
  PDF represented with no "see notes" fallback for AMRAP/intervals/tempo.

## Non-goals / deferred
- GPS auto-distance for runs (manual/entered distance first; GPS later).
- %1RM auto-load calculators, RIR analytics — the fields exist; smart tooling later.
- No rewrite of the existing reps/hold/emom/combo runner — purely additive.

## Risks
- Runner complexity (timers) — isolate AMRAP/interval runners as their own components.
- Stats mixing measures — keep per-measure buckets; never sum reps+seconds+meters.
- Backward-compat — every new field optional; missing = current behavior (covered by design).
