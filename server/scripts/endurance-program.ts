// Flomarrec "Endurance Program" — 4-week advanced calisthenics endurance plan.
// Authored as one ProgramCreate payload on Nafas' composable prescription model
// (single-exercise rich sets + combo blocks + interval blocks). Structural where
// the model expresses it; day `notes` carry the nuances the primitives can't
// (round-by-round alternation, "one shot", max-time, running pace/recovery split)
// so the import is lossless. Original program © 2021 Flomarrec.
import type { ProgramCreate } from "../modules/programs/programs.schema";

let _n = 0;
const uid = () => `end-${_n++}`;

// movement registry → [display name (matches catalog for images + progression), muscleGroup]
const M = {
  PU: ["Pull-up", "Back"],
  DIP: ["Dips", "Chest"],
  BDIP: ["Straight Bar Dip", "Chest"],
  PSH: ["Push-ups", "Chest"],
  MU: ["Muscle-up", "Back"],
  RUN: ["Running (Outdoor)", "Cardio"],
  CHIN: ["Chin-Over-Bar Hold", "Back"], // iso chin above
  DEAD: ["Bottom Pull-up Hold", "Back"], // head below / dead hang / arms straight
  DIP90: ["90° Dip Hold", "Chest"], // dips 90° / iso mid
  DIPS: ["Dip Support Hold", "Chest"], // arms-straight dip support / iso bottom
  // Legs Day movements
  LC: ["Leg Curl", "Legs"],
  SQ: ["Barbell Back Squat", "Legs"],
  DL: ["Deadlift", "Legs"],
  HT: ["Hip Thrust", "Legs"],
  ADD: ["Hip Adduction (Machine)", "Legs"],
  ABD: ["Hip Abduction (Machine)", "Legs"],
  CALF: ["Standing Calf Raise", "Legs"],
} as const;
type Mv = keyof typeof M;

// ── set builders (single-exercise blocks) ──
const rp = (reps: number, o: any = {}) => ({ type: "reps", reps, ...o });
const wt = (weight: number, o: any = {}) => ({ type: "reps", weight, ...o }); // weight target, reps left open
const hd = (sec: number, o: any = {}) => ({ type: "hold", durationSeconds: sec, measure: "time", ...o });
const fail = (o: any = {}) => ({ type: "reps", toFailure: true, ...o }); // max reps / one-shot

const block = (mv: Mv, sets: any[], rest = 120) => {
  const [name, muscleGroup] = M[mv];
  return { exerciseId: uid(), name, muscleGroup, restSeconds: rest, sets, kind: "exercise" as const };
};
const py = (mv: Mv, reps: number[], rest = 120) => block(mv, reps.map((r) => rp(r)), rest);

// ── combo blocks (circuit / emom / amrap) ──
type Comp = { exerciseId: string; name: string; muscleGroup: string; setType: "reps" | "hold"; reps?: number; weight?: number; durationSeconds?: number };
const C = (mv: Mv, o: { reps?: number; weight?: number; hold?: number } = {}): Comp => {
  const [name, muscleGroup] = M[mv];
  const isHold = o.hold != null;
  return { exerciseId: uid(), name, muscleGroup, setType: isHold ? "hold" : "reps", ...(o.reps != null ? { reps: o.reps } : {}), ...(o.weight != null ? { weight: o.weight } : {}), ...(isHold ? { durationSeconds: o.hold } : {}) };
};
const combo = (
  label: string,
  comps: Comp[],
  o: { mode?: "circuit" | "emom" | "amrap"; rounds?: number; rest?: number; unbroken?: boolean; cap?: number; slot?: number } = {},
) => ({
  exerciseId: uid(),
  name: label,
  muscleGroup: comps[0].muscleGroup,
  restSeconds: o.rest ?? 120,
  sets: [] as any[],
  kind: "combo" as const,
  combo: true,
  unbroken: o.unbroken ?? false,
  mode: o.mode ?? "circuit",
  comboRounds: o.rounds ?? 1,
  ...(o.cap ? { timeCapSeconds: o.cap } : {}),
  ...(o.slot ? { intervalSeconds: o.slot } : {}),
  components: comps,
});

// ── interval block (running) ──
const run = (workSec: number, recSec: number, rounds: number, pace?: string, recKind: "passive" | "active" = "passive") => ({
  exerciseId: uid(),
  name: M.RUN[0],
  muscleGroup: "Cardio",
  restSeconds: 0,
  sets: [] as any[],
  kind: "intervals" as const,
  intervals: {
    work: { measure: "time" as const, durationSeconds: workSec, ...(pace ? { pace } : {}) },
    recovery: { measure: "time" as const, durationSeconds: recSec, kind: recKind },
    rounds,
  },
});

const day = (weekIndex: number, dayIndex: number, name: string, label: string, notes: string, exercises: any[]) => ({
  weekIndex,
  dayIndex,
  restDay: false,
  templateId: null,
  name,
  exercises,
  label,
  notes,
});

// ────────────────────────────────────────────────────────── WEEK 1
const w1 = [
  day(0, 0, "Pyramids + Volume", "≈ moderate",
    "Volume block ×4: alternate head-above / head-below emphasis each round.",
    [
      py("MU", [1, 2, 3, 2, 1]),
      py("PU", [5, 10, 15, 10, 5]),
      py("DIP", [10, 20, 30, 20, 10]),
      py("PSH", [15, 25, 35, 25, 15]),
      combo("Volume block ×4",
        [C("PU", { reps: 10 }), C("PSH", { reps: 20 }), C("CHIN", { hold: 10 }), C("DIP90", { hold: 10 }),
         C("PU", { reps: 10 }), C("PSH", { reps: 20 }), C("DEAD", { hold: 10 }), C("DIP90", { hold: 10 })],
        { rounds: 4 }),
    ]),
  day(0, 1, "Circuits + Routines + EMOM", "+ hard",
    "Circuit 3: first rep is a muscle-up-grip pull-up +10 kg. EMOM 6 min alternates: odd min = 10s dip-iso-mid + 6 dips, even min = 10s push-up-iso-mid + 10 push-ups.",
    [
      combo("Circuit 1", [C("MU", { reps: 2 }), C("DIP", { reps: 25 }), C("PU", { reps: 14 }), C("PSH", { reps: 30 })]),
      combo("Circuit 2", [C("MU", { reps: 1 }), C("DIP", { reps: 20 }), C("PU", { reps: 12 }), C("PSH", { reps: 25 })]),
      combo("Circuit 3", [C("PU", { reps: 1, weight: 10 }), C("DIP", { reps: 15 }), C("PU", { reps: 10 }), C("PSH", { reps: 20 })]),
      combo("Routine 1", [C("PU", { reps: 5 }), C("CHIN", { hold: 5 }), C("PU", { reps: 5 }), C("DEAD", { hold: 5 }), C("PU", { reps: 5 }), C("DIPS", { hold: 5 })], { rounds: 2 }),
      combo("Routine 2", [C("CHIN", { hold: 10 }), C("DEAD", { hold: 10 }), C("DEAD", { hold: 10, weight: 10 })]),
      combo("Routine 3", [C("CHIN", { hold: 10 }), C("DEAD", { hold: 10 }), C("DEAD", { hold: 10 })]),
      combo("EMOM 6 min", [C("DIP90", { hold: 10 }), C("DIP", { reps: 6 }), C("PSH", { hold: 10 }), C("PSH", { reps: 10 })], { mode: "emom", rounds: 3, slot: 60, rest: 0 }),
    ]),
  day(0, 3, "Set on bar + Drop sets", "+ hard",
    "Set on bar = chain reps without letting go of the bar. Dips drop: +5 kg → band-resisted → bodyweight.",
    [
      combo("Set on bar 1", [C("MU", { reps: 1 }), C("BDIP", { reps: 5 }), C("MU", { reps: 1 }), C("BDIP", { reps: 5 }), C("PU", { reps: 15 }), C("CHIN", { hold: 6 })], { unbroken: true }),
      combo("Set on bar 2", [C("MU", { reps: 1 }), C("BDIP", { reps: 6 }), C("MU", { reps: 1 }), C("BDIP", { reps: 6 }), C("PU", { reps: 13 }), C("CHIN", { hold: 8 })], { unbroken: true }),
      combo("Set on bar 3", [C("MU", { reps: 1 }), C("BDIP", { reps: 7 }), C("MU", { reps: 1 }), C("BDIP", { reps: 7 }), C("PU", { reps: 11 }), C("CHIN", { hold: 10 })], { unbroken: true }),
      combo("Set on bar 4", [C("MU", { reps: 1 }), C("BDIP", { reps: 8 }), C("MU", { reps: 1 }), C("BDIP", { reps: 8 }), C("PU", { reps: 9 }), C("CHIN", { hold: 12 })], { unbroken: true }),
      combo("Set on bar 5", [C("MU", { reps: 1 }), C("BDIP", { reps: 9 }), C("MU", { reps: 1 }), C("BDIP", { reps: 9 }), C("PU", { reps: 7 }), C("CHIN", { hold: 14 })], { unbroken: true }),
      block("MU", [
        rp(1, { weight: 2, dropSteps: [{ value: 2, load: 0 }, { value: 3, assist: "band" }] }),
        rp(1, { weight: 2, dropSteps: [{ value: 2, load: 0 }, { value: 3, assist: "band" }] }),
        rp(1, { weight: 2, dropSteps: [{ value: 2, load: 0 }, { value: 3, assist: "band" }] }),
      ]),
      block("PU", [rp(8, { weight: 5, dropSteps: [{ value: 8, load: 0 }, { value: 8, assist: "band" }] })]),
      block("DIP", [rp(15, { weight: 5, dropSteps: [{ value: 15, assist: "band" }, { value: 15, load: 0 }] })]),
    ]),
  day(0, 4, "Speed + Dead-stop circuits + AMRAP", "≈ moderate",
    "Speed circuits: 30s rest between the two segments of each circuit. Dead-stop circuits: 1 min rest between segments. AMRAP pull-ups & dips from dead-stop.",
    [
      combo("Speed circuit 1", [C("PSH", { reps: 10 }), C("PU", { reps: 5 }), C("DIP", { reps: 10 }), C("PSH", { reps: 10 }), C("PU", { reps: 5, weight: 10 }), C("DIP", { reps: 10, weight: 10 })], { rest: 30 }),
      combo("Speed circuit 2", [C("PU", { reps: 5, weight: 10 }), C("DIP", { reps: 10, weight: 10 }), C("PSH", { reps: 10 }), C("PU", { reps: 5 }), C("DIP", { reps: 10 })], { rest: 30 }),
      combo("Dead-stop circuit 1", [C("PU", { reps: 5 }), C("PSH", { reps: 10 }), C("DIP", { reps: 15 }), C("DIP", { reps: 15, weight: 10 }), C("PSH", { reps: 10, weight: 10 }), C("PU", { reps: 5, weight: 10 })]),
      combo("Dead-stop circuit 2", [C("PU", { reps: 5, weight: 10 }), C("DIP", { reps: 10, weight: 10 }), C("PU", { reps: 5 }), C("DIP", { reps: 10, weight: 10 }), C("PSH", { reps: 10, weight: 10 }), C("PSH", { reps: 10 })]),
      combo("AMRAP 10 min", [C("CHIN", { hold: 10, weight: 15 }), C("DIP90", { hold: 10, weight: 15 }), C("PU", { reps: 5 }), C("DIP", { reps: 5 })], { mode: "amrap", cap: 600, rest: 0 }),
    ]),
  day(0, 5, "Running intervals", "running",
    "Warm-up: 1 km easy jog + athletic drills. Main: 3 min run (pace ≥ 4:30/km) + 1:30 passive recovery (walk) ×4.",
    [run(180, 90, 4, "4:30/km", "passive")]),
];

// ────────────────────────────────────────────────────────── WEEK 2
const w2 = [
  day(1, 0, "Routines + Finisher", "+ hard",
    "Routines are mini drop-sets: added-weight reps then bodyweight reps, per the set counts. Finisher = descending set-on-bar (pull-ups from dead-stop).",
    [
      block("MU", Array.from({ length: 4 }, () => rp(2, { weight: 2, dropSteps: [{ value: 2, load: 0 }] }))),
      block("PU", Array.from({ length: 3 }, () => rp(10, { weight: 10, dropSteps: [{ value: 10, load: 0 }] }))),
      block("DIP", Array.from({ length: 3 }, () => rp(20, { weight: 10, dropSteps: [{ value: 20, load: 0 }] }))),
      combo("Finisher 1", [C("BDIP", { reps: 15 }), C("PU", { reps: 10 }), C("DIP", { reps: 15 })], { unbroken: true, rest: 90 }),
      combo("Finisher 2", [C("BDIP", { reps: 12 }), C("PU", { reps: 8 }), C("DIP", { reps: 12 })], { unbroken: true, rest: 90 }),
      combo("Finisher 3", [C("BDIP", { reps: 9 }), C("PU", { reps: 6 }), C("DIP", { reps: 9 })], { unbroken: true, rest: 90 }),
      combo("Finisher 4", [C("BDIP", { reps: 6 }), C("PU", { reps: 4 }), C("DIP", { reps: 6 })], { unbroken: true, rest: 90 }),
    ]),
  day(1, 1, "Circuits + EMOM", "+ hard",
    "Circuit 2: 45s rest between the two segments. EMOM A alternates: odd min = 6s chin-above + 4 pull-ups, even min = 6s head-below + 4 pull-ups.",
    [
      combo("Circuit 1", [C("MU", { reps: 1, weight: 2 }), C("MU", { reps: 2 }), C("DIP", { reps: 5, weight: 10 }), C("DIP", { reps: 10 }), C("PU", { reps: 4, weight: 10 }), C("PU", { reps: 8 }), C("PSH", { reps: 30 })]),
      combo("Circuit 2", [C("PU", { reps: 15 }), C("DIP", { reps: 30 }), C("PSH", { reps: 40 }), C("PU", { reps: 7 }), C("DIP", { reps: 15 }), C("PSH", { reps: 20 })], { rest: 45 }),
      combo("Circuit 3", [C("CHIN", { hold: 20, weight: 5 }), C("DIP", { reps: 20 }), C("PSH", { reps: 20 }), C("DEAD", { hold: 20, weight: 5 })]),
      combo("EMOM 6 min A", [C("CHIN", { hold: 6 }), C("PU", { reps: 4 }), C("DEAD", { hold: 6 }), C("PU", { reps: 4 })], { mode: "emom", rounds: 3, slot: 60, rest: 0 }),
      combo("EMOM 6 min B", [C("DIP90", { hold: 10 }), C("DIP", { reps: 10 })], { mode: "emom", rounds: 6, slot: 60, rest: 0 }),
    ]),
  day(1, 2, "Running intervals", "running",
    "Warm-up: 1 km easy jog + drills. Main: 3 min run (pace ≥ 4:30/km) + 1:30 passive recovery (walk) ×5.",
    [run(180, 90, 5, "4:30/km", "passive")]),
  day(1, 4, "Set on bar + Max-time routines", "++ very hard",
    "Routines: each first hold is MAX TIME (to failure), +10 kg, then the bar-dips / pull-ups.",
    [
      combo("Set on bar 1", [C("MU", { reps: 1 }), C("BDIP", { reps: 20 }), C("PU", { reps: 16, weight: 2 })], { unbroken: true }),
      combo("Set on bar 2", [C("MU", { reps: 1 }), C("BDIP", { reps: 20 }), C("PU", { reps: 16 })], { unbroken: true }),
      combo("Set on bar 3", [C("MU", { reps: 1 }), C("BDIP", { reps: 15 }), C("PU", { reps: 12, weight: 2 })], { unbroken: true }),
      combo("Set on bar 4", [C("MU", { reps: 1 }), C("BDIP", { reps: 15 }), C("PU", { reps: 12 })], { unbroken: true }),
      combo("Routine 1 (max-time chin above +10 kg)", [C("CHIN", { hold: 0, weight: 10 }), C("BDIP", { reps: 20 })]),
      combo("Routine 2 (max-time head below +10 kg)", [C("DEAD", { hold: 0, weight: 10 }), C("BDIP", { reps: 20 })]),
      combo("Routine 3 (max-time dips bottom +10 kg)", [C("DIPS", { hold: 0, weight: 10 }), C("PU", { reps: 10 })]),
      combo("Routine 4 (max-time dips mid +10 kg)", [C("DIP90", { hold: 0, weight: 10 }), C("PU", { reps: 10 })]),
    ]),
  day(1, 5, "Isometric pyramid + AMRAP", "≈ moderate",
    "Iso pyramid: chin-above + dips-mid holds ascending then descending; repeat the whole pyramid with HEAD BELOW instead of chin above.",
    [
      combo("Iso pyramid (chin above)", [
        C("CHIN", { hold: 10, weight: 10 }), C("DIP90", { hold: 10, weight: 10 }),
        C("CHIN", { hold: 15, weight: 5 }), C("DIP90", { hold: 15, weight: 5 }),
        C("CHIN", { hold: 20 }), C("DIP90", { hold: 20 }),
        C("CHIN", { hold: 15, weight: 5 }), C("DIP90", { hold: 15, weight: 5 }),
        C("CHIN", { hold: 10, weight: 10 }), C("DIP90", { hold: 10, weight: 10 })]),
      combo("Iso pyramid (head below)", [
        C("DEAD", { hold: 10, weight: 10 }), C("DIP90", { hold: 10, weight: 10 }),
        C("DEAD", { hold: 15, weight: 5 }), C("DIP90", { hold: 15, weight: 5 }),
        C("DEAD", { hold: 20 }), C("DIP90", { hold: 20 }),
        C("DEAD", { hold: 15, weight: 5 }), C("DIP90", { hold: 15, weight: 5 }),
        C("DEAD", { hold: 10, weight: 10 }), C("DIP90", { hold: 10, weight: 10 })]),
      combo("AMRAP 10 min", [C("DEAD", { hold: 10, weight: 5 }), C("BDIP", { reps: 10 }), C("CHIN", { hold: 10, weight: 5 }), C("DIP", { reps: 5 })], { mode: "amrap", cap: 600, rest: 0 }),
    ]),
];

// ────────────────────────────────────────────────────────── WEEK 3
const w3 = [
  day(2, 0, "EMOM + Volume + Routine +5 kg", "++ very hard",
    "EMOM 6 min: each minute = 1 muscle-up + 1 muscle-up with head-down descent. Routine +5 kg is a pull/push wave — all reps at +5 kg.",
    [
      combo("EMOM 6 min", [C("MU", { reps: 1 }), C("MU", { reps: 1 })], { mode: "emom", rounds: 6, slot: 60, rest: 0 }),
      block("PU", Array.from({ length: 4 }, () => rp(18)), 120),
      block("DIP", Array.from({ length: 4 }, () => rp(35)), 120),
      block("PSH", Array.from({ length: 4 }, () => rp(40)), 120),
      combo("Routine +5 kg (wave)", [
        C("PU", { reps: 12, weight: 5 }), C("PSH", { reps: 20, weight: 5 }),
        C("PU", { reps: 10, weight: 5 }), C("PSH", { reps: 18, weight: 5 }),
        C("PU", { reps: 8, weight: 5 }), C("PSH", { reps: 16, weight: 5 }),
        C("PU", { reps: 4, weight: 5 }), C("PSH", { reps: 14, weight: 5 }),
        C("PU", { reps: 8, weight: 5 }), C("PSH", { reps: 16, weight: 5 }),
        C("PU", { reps: 10, weight: 5 }), C("PSH", { reps: 18, weight: 5 }),
        C("PU", { reps: 12, weight: 5 }), C("PSH", { reps: 20, weight: 5 })]),
    ]),
  day(2, 1, "Running intervals", "+ hard",
    "Warm-up: 1 km easy jog + drills. Main: 30s hard run / 30s recovery ×6 (recovery active on the first 3 rounds, passive on the last 3). Total high-intensity ≈ 360s.",
    [run(30, 30, 6, undefined, "active")]),
  day(2, 2, "Circuits + EMOM", "+ hard",
    "",
    [
      combo("Circuit 1", [C("MU", { reps: 3 }), C("DIP", { reps: 30 }), C("PU", { reps: 15 }), C("PSH", { reps: 40 })]),
      combo("Circuit 2", [C("MU", { reps: 2 }), C("DIP", { reps: 20 }), C("PU", { reps: 12 }), C("PSH", { reps: 30 })]),
      combo("Circuit 3", [C("MU", { reps: 1 }), C("DIP", { reps: 15, weight: 5 }), C("PU", { reps: 10, weight: 5 }), C("PSH", { reps: 20, weight: 5 })]),
      combo("Circuit 4", [C("DIP", { reps: 10, weight: 10 }), C("PU", { reps: 5, weight: 10 }), C("PSH", { reps: 15, weight: 10 })]),
      combo("EMOM 6 min A", [C("PU", { reps: 5 }), C("DIP", { reps: 8 })], { mode: "emom", rounds: 6, slot: 60, rest: 0 }),
      combo("EMOM 6 min B", [C("PSH", { reps: 10 }), C("PU", { reps: 5 })], { mode: "emom", rounds: 6, slot: 60, rest: 0 }),
    ]),
  day(2, 4, "One-shot sets + Iso sets + EMOM", "++ very hard",
    "Set 1 = one shot (without releasing the bar), then the push-ups/dips. EMOM 8 min: 20s arms-straight hold + 2 pull-ups at tempo x/2/2/1.",
    [
      combo("Set 1 (one shot) — a", [C("PU", { reps: 2 }), C("MU", { reps: 1 }), C("PSH", { reps: 5 })], { unbroken: true }),
      combo("Set 1 (one shot) — b", [C("PU", { reps: 4 }), C("MU", { reps: 2 }), C("PSH", { reps: 10 })], { unbroken: true }),
      combo("Set 1 (one shot) — c", [C("PU", { reps: 6 }), C("MU", { reps: 3 }), C("PSH", { reps: 15 })], { unbroken: true }),
      combo("Set 1 (one shot) — d", [C("PU", { reps: 8 }), C("MU", { reps: 4 }), C("DIP", { reps: 20 })], { unbroken: true }),
      combo("Set 2 — a", [C("MU", { reps: 1 }), C("DIPS", { hold: 10 }), C("BDIP", { reps: 10, weight: 10 })], { unbroken: true }),
      combo("Set 2 — b", [C("MU", { reps: 1 }), C("CHIN", { hold: 10 }), C("PU", { reps: 5 }), C("DEAD", { hold: 10, weight: 5 })], { unbroken: true }),
      combo("Set 2 — c", [C("MU", { reps: 1 }), C("DIPS", { hold: 10 }), C("BDIP", { reps: 20 })], { unbroken: true }),
      combo("Set 2 — d", [C("MU", { reps: 1 }), C("CHIN", { hold: 10 }), C("PU", { reps: 10 }), C("DEAD", { hold: 10 })], { unbroken: true }),
      combo("EMOM 8 min", [C("DEAD", { hold: 20 }), C("PU", { reps: 2 })], { mode: "emom", rounds: 8, slot: 60, rest: 0 }),
    ]),
  day(2, 5, "Push circuit + Finishers", "≈ moderate",
    "Push circuit is 4 descending rounds — reps 15 → 12 → 9 → 6, the two 90° holds stay constant.",
    [
      combo("Push circuit R1", [C("DIP90", { hold: 10, weight: 10 }), C("DIP", { reps: 15 }), C("PSH", { reps: 15 }), C("BDIP", { reps: 15 }), C("PSH", { hold: 10, weight: 10 })], { rest: 90 }),
      combo("Push circuit R2", [C("DIP90", { hold: 10, weight: 10 }), C("DIP", { reps: 12 }), C("PSH", { reps: 12 }), C("BDIP", { reps: 12 }), C("PSH", { hold: 10, weight: 10 })], { rest: 90 }),
      combo("Push circuit R3", [C("DIP90", { hold: 10, weight: 10 }), C("DIP", { reps: 9 }), C("PSH", { reps: 9 }), C("BDIP", { reps: 9 }), C("PSH", { hold: 10, weight: 10 })], { rest: 90 }),
      combo("Push circuit R4", [C("DIP90", { hold: 10, weight: 10 }), C("DIP", { reps: 6 }), C("PSH", { reps: 6 }), C("BDIP", { reps: 6 }), C("PSH", { hold: 10, weight: 10 })], { rest: 90 }),
      combo("EMOM 10 min (push)", [C("PSH", { reps: 15 }), C("PSH", { hold: 5 })], { mode: "emom", rounds: 10, slot: 60, rest: 0 }),
      combo("AMRAP 8 min", [C("PU", { reps: 2 }), C("DIP", { reps: 5 }), C("PSH", { reps: 10 })], { mode: "amrap", cap: 480, rest: 0 }),
    ]),
];

// ────────────────────────────────────────────────────────── WEEK 4
const w4 = [
  day(3, 0, "Pyramids + Weighted routines", "++ very hard",
    "Weighted routines: middle set is a dead-stop rep ladder +10 kg (pull-ups 2/4/6/8; dips 4/8/12/16), bracketed by the straight sets.",
    [
      py("MU", [2, 4, 6, 4, 2]),
      py("PU", [10, 15, 20, 15, 10]),
      py("DIP", [20, 30, 40, 30, 20]),
      block("PU", [rp(15), rp(2, { weight: 10, dropSteps: [{ value: 4 }, { value: 6 }, { value: 8 }] }), rp(12)]),
      block("DIP", [rp(30), rp(4, { weight: 10, dropSteps: [{ value: 8 }, { value: 12 }, { value: 16 }] }), rp(20)]),
      combo("EMOM 8 min", [C("BDIP", { reps: 10 })], { mode: "emom", rounds: 8, slot: 60, rest: 0 }),
    ]),
  day(3, 1, "Circuits + EMOM", "+ hard",
    "",
    [
      combo("Circuit 1", [C("MU", { reps: 4 }), C("DIP", { reps: 32 }), C("PU", { reps: 18 }), C("PSH", { reps: 42 })]),
      combo("Circuit 2", [C("MU", { reps: 3 }), C("DIP", { reps: 22 }), C("PU", { reps: 14 }), C("PSH", { reps: 32 })]),
      combo("Circuit 3", [C("MU", { reps: 1 }), C("DIP", { reps: 18, weight: 5 }), C("PU", { reps: 12, weight: 5 }), C("PSH", { reps: 20, weight: 5 })]),
      combo("EMOM 5 min A", [C("PU", { reps: 5 }), C("DIP", { reps: 8, weight: 5 })], { mode: "emom", rounds: 5, slot: 60, rest: 0 }),
      combo("EMOM 5 min B", [C("PSH", { reps: 10 }), C("PU", { reps: 5, weight: 5 })], { mode: "emom", rounds: 5, slot: 60, rest: 0 }),
    ]),
  day(3, 2, "Running intervals", "+ hard",
    "Warm-up: 1 km easy jog + drills. Main: 30s hard run / 30s recovery ×8 (active first 3, passive last 5). Total high-intensity ≈ 480s.",
    [run(30, 30, 8, undefined, "active")]),
  day(3, 3, "Set on bar + Routines + EMOM", "++ very hard",
    "EMOM 6 min: odd min = 10s chin-above + 10s head-below + 10s arms-straight (pull-up bar); even min = 10s iso-bottom + 10s iso-mid + 10s iso-top (dips).",
    [
      combo("Set on bar 1", [C("MU", { reps: 4 }), C("BDIP", { reps: 15 }), C("PU", { reps: 18 })], { unbroken: true }),
      combo("Set on bar 2", [C("MU", { reps: 3 }), C("BDIP", { reps: 12 }), C("PU", { reps: 16 })], { unbroken: true }),
      combo("Set on bar 3", [C("MU", { reps: 2 }), C("BDIP", { reps: 10 }), C("PU", { reps: 14 })], { unbroken: true }),
      combo("Set on bar 4", [C("MU", { reps: 1 }), C("BDIP", { reps: 8 }), C("PU", { reps: 12 })], { unbroken: true }),
      combo("Routine 1", [C("PU", { reps: 10 }), C("PSH", { reps: 20 })], { rounds: 4 }),
      combo("Routine 2", [C("DIP", { reps: 20 }), C("PU", { reps: 10 })], { rounds: 4 }),
      combo("EMOM 6 min", [C("CHIN", { hold: 10 }), C("DEAD", { hold: 10 }), C("DEAD", { hold: 10 }), C("DIPS", { hold: 10 }), C("DIP90", { hold: 10 }), C("DIPS", { hold: 10 })], { mode: "emom", rounds: 3, slot: 60, rest: 0 }),
    ]),
  day(3, 5, "Stress sets + Intervals", "++ very hard",
    "Stress = pyramid performed with NO rest between rungs. Then ¾ min rest before each max-effort one-shot set. Intervals: short-rest reps.",
    [
      block("PU", [
        rp(4, { dropSteps: [{ value: 4, load: 10 }, { value: 4, load: 15 }, { value: 4, load: 10 }, { value: 4, load: 0 }] }),
        fail({ weight: 10 }),
        rp(5, { weight: 10, dropSteps: [{ value: 5, load: 15 }, { value: 5, load: 10 }] }),
        fail(),
      ], 45),
      block("DIP", [
        rp(6, { dropSteps: [{ value: 6, load: 10 }, { value: 6, load: 15 }, { value: 6, load: 10 }, { value: 6, load: 0 }] }),
        fail({ weight: 10 }),
        rp(8, { weight: 10, dropSteps: [{ value: 8, load: 15 }, { value: 8, load: 10 }] }),
        fail(),
      ], 45),
      block("PU", Array.from({ length: 5 }, () => rp(5)), 5),
      block("DIP", Array.from({ length: 5 }, () => rp(8)), 5),
    ]),
];

// ────────────────────────────────────────────────────────── LEGS DAY (every Sunday)
const legsDay = (weekIndex: number) =>
  day(weekIndex, 6, "Legs Day", "legs", "", [
    block("LC", [rp(8, { weight: 70 }), rp(8, { weight: 65 }), rp(8, { weight: 60 })], 90),
    block("SQ", [rp(8, { weight: 130 }), rp(8, { weight: 120 })], 120),
    block("DL", [rp(6, { weight: 120 }), rp(6, { weight: 120 })], 150),
    block("HT", [wt(80), wt(80), wt(80)], 90),
    block("ADD", [wt(70), wt(70)], 60),
    block("ABD", [wt(60), wt(60)], 60),
    block("CALF", [wt(130), wt(130), wt(130)], 60),
  ]);

export const enduranceProgram: ProgramCreate = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  name: "Endurance Program",
  startDate: null,
  weeks: 4,
  notes:
    "4-week advanced calisthenics endurance plan by Flomarrec — pull-ups, dips, push-ups and muscle-ups plus interval running. " +
    "Prerequisites: 20 pull-ups, 40+ dips, 50+ push-ups, 5 muscle-ups. Warm up first; the numbers are targets — scale reps / added weight as needed. " +
    "Original program © 2021 Flomarrec.",
  weekMeta: [
    { index: 0, name: "Week 1", notes: "Base endurance volume — moderate to hard." },
    { index: 1, name: "Week 2", notes: "Added weight and max-time holds — hard to very hard." },
    { index: 2, name: "Week 3", notes: "Density, waves and one-shots — very hard." },
    { index: 3, name: "Week 4", notes: "Peak: stress sets and one-shots — very hard." },
  ],
  days: [...w1, ...w2, ...w3, ...w4, legsDay(0), legsDay(1), legsDay(2), legsDay(3)],
};
