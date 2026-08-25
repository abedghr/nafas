// AI coach: multimodal "Create with AI" (one-shot) + a context-aware chat that
// asks questions, offers options, and proposes a program for the user to approve
// before it's saved. Exercises map to the real library where names match.
// Server-side only (Gemini key stays on the backend).
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../core/db";
import { exercises as exercisesTable, workoutLogs } from "./workout.db";
import { users } from "../identity/identity.db";
import { programEnrollments, programs } from "../programs/programs.db";
import { inbodyTests, inbodyTargets } from "../nutrition/nutrition.db";
import { workoutService } from "./workout.service";
import { geminiJSON, geminiChat, type ChatContent, type GeminiPart } from "../../core/gemini";

// ── name matching (shared with the media import scripts) ──
const STOP = new Set(["the", "a", "with", "and", "of", "to", "version", "grip"]);
const norm = (s: string) => s.toLowerCase().split(" - ")[0].replace(/[-_/().,'"]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s: string) => norm(s).split(" ").map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)).filter((w) => w && !STOP.has(w));
function jac(a: string[], b: string[]) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => B.has(x) && i++); const u = new Set([...a, ...b]).size; return u ? i / u : 0; }

// program draft schema — shared by the one-shot responseSchema and the chat tool
const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          restDay: { type: "boolean" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      reps: { type: "integer" },
                      weightKg: { type: "number" },
                      durationSeconds: { type: "integer" },
                      note: { type: "string" },
                    },
                  },
                },
                combo: {
                  type: "object",
                  properties: {
                    mode: { type: "string" },
                    rounds: { type: "integer" },
                    movements: {
                      type: "array",
                      items: { type: "object", properties: { name: { type: "string" }, reps: { type: "integer" }, durationSeconds: { type: "integer" }, weightKg: { type: "number" } }, required: ["name"] },
                    },
                  },
                },
              },
              required: ["name"],
            },
          },
        },
        required: ["name"],
      },
    },
  },
  required: ["name", "days"],
} as const;

type DraftSet = { reps?: number; weightKg?: number; durationSeconds?: number; note?: string };
type DraftMovement = { name: string; reps?: number; durationSeconds?: number; weightKg?: number };
type DraftCombo = { mode?: string; rounds?: number; movements?: DraftMovement[] };
type DraftExercise = { name: string; sets?: DraftSet[]; combo?: DraftCombo };
type DraftDay = { name?: string; restDay?: boolean; exercises?: DraftExercise[] };
type Draft = { name?: string; description?: string; days?: DraftDay[] };
type WorkoutDraft = { name?: string; exercises?: DraftExercise[] };

async function exerciseLib() {
  const rows = await db.select({ name: exercisesTable.name }).from(exercisesTable);
  return { names: rows.map((r) => r.name).sort(), lib: rows.map((r) => ({ name: r.name, tok: toks(r.name) })) };
}

// closure that maps a loose exercise name → the closest library name (or null)
function makeMatcher(lib: { name: string; tok: string[] }[]) {
  return (name: string) => {
    const nt = toks(name); let best: { name: string; score: number } | null = null;
    for (const l of lib) { const s = jac(nt, l.tok); if (!best || s > best.score) best = { name: l.name, score: s }; }
    return best && best.score >= 0.7 ? best.name : null;
  };
}
function mapSets(sets: DraftSet[] = []) {
  const out = sets.map((s) => {
    const isHold = s.durationSeconds != null && s.reps == null;
    return isHold
      ? { type: "hold", measure: "time", durationSeconds: s.durationSeconds, ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) }
      : { type: "reps", ...(s.reps != null ? { reps: s.reps } : {}), ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) };
  });
  return out.length ? out : [{ type: "reps", reps: 10 }];
}
// loose exercises → composable TemplateExercise[] (shared by program days and single workouts)
function mapExercises(exercises: DraftExercise[] = [], seed: number, match: (n: string) => string | null) {
  return exercises.map((e, j) => {
    // a circuit / AMRAP / EMOM done as rounds → one composable combo
    if (e.combo && Array.isArray(e.combo.movements) && e.combo.movements.length) {
      const c = e.combo;
      const mode = ["circuit", "amrap", "emom"].includes(String(c.mode)) ? (c.mode as string) : "circuit";
      return {
        exerciseId: `ai-combo-${seed}-${j}`,
        name: e.name || (c.movements || []).map((m) => m.name).join(" + "),
        muscleGroup: "Combo", restSeconds: 90, combo: true, unbroken: true,
        mode, intervalSeconds: 60, comboRounds: Math.max(1, Number(c.rounds) || 1),
        components: (c.movements || []).map((m, k) => {
          const mm = match(m.name);
          const isHold = m.durationSeconds != null && m.reps == null;
          return {
            exerciseId: `ai-${seed}-${j}-${k}`, name: mm || m.name, muscleGroup: "Full Body",
            setType: isHold ? "hold" : "reps",
            ...(m.reps != null ? { reps: m.reps } : {}),
            ...(m.durationSeconds != null ? { durationSeconds: m.durationSeconds } : {}),
            ...(m.weightKg != null ? { weight: m.weightKg } : {}),
          };
        }),
        sets: [],
      };
    }
    const matched = match(e.name);
    return { exerciseId: `ai-${seed}-${(matched || e.name).replace(/\s+/g, "-").toLowerCase()}`, name: matched || e.name, muscleGroup: "Full Body", restSeconds: 90, sets: mapSets(e.sets) };
  });
}

// draft → full composable-model program (multi-week, ordered days)
function mapDraft(draft: Draft, lib: { name: string; tok: string[] }[]) {
  const match = makeMatcher(lib);
  const days = (draft.days || []).map((d, i) => ({
    weekIndex: Math.floor(i / 7), dayIndex: i % 7, restDay: !!d.restDay, templateId: null as string | null,
    name: d.name || `Day ${i + 1}`, label: "", notes: "",
    exercises: mapExercises(d.exercises, i, match),
  }));
  return { name: draft.name || "AI Program", startDate: null, weeks: Math.max(1, Math.ceil(days.length / 7)), notes: draft.description || "", weekMeta: [], days };
}

// draft → a single reusable workout (one session; saved as a template client-side)
function mapWorkout(draft: WorkoutDraft, lib: { name: string; tok: string[] }[]) {
  return { name: draft.name || "AI Workout", exercises: mapExercises(draft.exercises, 0, makeMatcher(lib)) };
}

// draft → a startable live-session shape: sets carry a `done` flag + a start offset,
// so the client can launch a running, resumable workout (some sets already completed).
type StartSet = DraftSet & { done?: boolean };
type StartExercise = { name: string; sets?: StartSet[] };
type StartDraft = { name?: string; startMinutesAgo?: number; exercises?: StartExercise[] };
function mapStart(draft: StartDraft, lib: { name: string; tok: string[] }[]) {
  const match = makeMatcher(lib);
  const exercises = (draft.exercises || []).map((e, j) => {
    const matched = match(e.name);
    const sets = (e.sets || []).map((s) => {
      const isHold = s.durationSeconds != null && s.reps == null;
      const base = isHold
        ? { type: "hold", measure: "time", durationSeconds: s.durationSeconds, ...(s.weightKg != null ? { weight: s.weightKg } : {}) }
        : { type: "reps", ...(s.reps != null ? { reps: s.reps } : {}), ...(s.weightKg != null ? { weight: s.weightKg } : {}) };
      return { ...base, done: !!s.done };
    });
    return { exerciseId: `ai-${j}-${(matched || e.name).replace(/\s+/g, "-").toLowerCase()}`, name: matched || e.name, muscleGroup: "Full Body", restSeconds: 90, sets: sets.length ? sets : [{ type: "reps", reps: 10, done: false }] };
  });
  return { name: draft.name || "Workout", startMinutesAgo: Math.max(0, Number(draft.startMinutesAgo) || 0), exercises };
}

// one-shot generate (kept for the simple Create-with-AI path)
export async function generateProgram(input: { text?: string; file?: { mimeType: string; data: string } }) {
  const { lib } = await exerciseLib();
  const parts: GeminiPart[] = [];
  if (input.file?.data) parts.push({ inline_data: { mime_type: input.file.mimeType, data: input.file.data } });
  parts.push({ text: input.text || "Create a complete, well-structured program from the attached file — transcribe every exercise, set and rep faithfully." });
  const draft = await geminiJSON<Draft>({ system: ONESHOT_SYSTEM, parts, schema: PROGRAM_SCHEMA as any });
  return mapDraft(draft, lib);
}

const ONESHOT_SYSTEM = `You are a strength & conditioning coach for the Nafas app. Output a COMPLETE program as ordered days (Day 1..N; rest days allowed). Every training day lists real exercises, and every exercise has concrete sets: reps (plus weightKg if weighted) for lifts, or durationSeconds for holds/cardio. When movements are done together as rounds, output "combo" items (mode, rounds, movements[]), not separate per-movement exercises: same reps every round → one combo (rounds=N); reps change each round (a ladder/pyramid) → one combo PER round (rounds=1) with that round's movements/reps, grouped by round not by movement. Use clear standard English exercise names (e.g. "Barbell Bench Press", "Pull-Up"). When a program file is attached, transcribe it FAITHFULLY and IN FULL — capture every exercise, every set and rep, and any rounds/ladders/AMRAP/circuit structure exactly (put each round or rung in its own set, use the set note for context). If it spans multiple weeks, output EVERY week and EVERY day in order (a 4-week plan = ~28 day entries, rest days included); never stop after week 1. Never simplify or drop items.`;

// ── context-aware chat ──
// Compact, token-bounded snapshot of the athlete so the coach can answer about
// their training, records, programs, body composition and targets — personally.
async function userContext(userId: string): Promise<string> {
  const [u] = await db.select({ goal: users.goal, name: users.name }).from(users).where(eq(users.id, userId));
  const logs = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)).orderBy(desc(workoutLogs.date)).limit(12);
  const [enr] = await db.select().from(programEnrollments).where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.status, "active")));
  let activeName = "none";
  if (enr) { const [p] = await db.select({ name: programs.name }).from(programs).where(eq(programs.id, enr.programId)); activeName = p?.name ?? "one"; }
  const progRows = await db.select({ name: programs.name }).from(programs).where(eq(programs.userId, userId)).limit(6);
  const [ibTarget] = await db.select().from(inbodyTargets).where(eq(inbodyTargets.userId, userId));
  const ib = await db.select().from(inbodyTests).where(eq(inbodyTests.userId, userId)).orderBy(desc(inbodyTests.date)).limit(3);

  const lines: string[] = [];
  lines.push(`Athlete goal: ${u?.goal || "unspecified"}.`);
  const recentNames = [...new Set(logs.map((l) => l.name))].slice(0, 8).join(", ") || "no workouts logged yet";
  const vol = logs.reduce((a, l) => a + (Number(l.totalVolumeKg) || 0), 0);
  lines.push(`Recent training: ${logs.length} sessions logged; workouts: ${recentNames}; ~${Math.round(vol)} kg total volume.`);

  // personal records (top lifts by heaviest done set)
  try {
    const prs = await workoutService.prs(userId, 5);
    if (prs.length) lines.push(`Personal records: ${prs.map((p) => `${p.name} ${p.weight}kg×${p.reps}`).join("; ")}.`);
  } catch { /* prs optional */ }

  // programs
  const progNames = progRows.map((p) => p.name).filter(Boolean);
  lines.push(`Programs: ${progNames.length ? progNames.join(", ") : "none"}. Active program: ${activeName}.`);

  // body composition (InBody) — latest + trend + target
  if (ib.length) {
    const l = ib[0], prev = ib[1];
    const d = (cur?: number | null, p?: number | null) => (cur != null && p != null ? ` (${cur - p >= 0 ? "+" : ""}${Math.round((cur - p) * 10) / 10} vs prev)` : "");
    lines.push(`Body composition (InBody, ${l.date}): weight ${l.weight ?? "?"}kg${d(l.weight, prev?.weight)}, body fat ${l.bodyFat ?? "?"}%${d(l.bodyFat, prev?.bodyFat)}, skeletal muscle ${l.skeletalMuscle ?? "?"}kg${d(l.skeletalMuscle, prev?.skeletalMuscle)}. ${ib.length} tests on record.`);
  } else {
    lines.push(`Body composition: no InBody tests uploaded yet.`);
  }
  if (ibTarget && (ibTarget.weight != null || ibTarget.bodyFat != null || ibTarget.skeletalMuscle != null)) {
    lines.push(`Body target: ${[ibTarget.weight != null ? `weight ${ibTarget.weight}kg` : "", ibTarget.bodyFat != null ? `body fat ${ibTarget.bodyFat}%` : "", ibTarget.skeletalMuscle != null ? `skeletal muscle ${ibTarget.skeletalMuscle}kg` : ""].filter(Boolean).join(", ")}.`);
  }
  return lines.join(" ");
}

const CHAT_SYSTEM = (ctx: string) => `You are the Nafas AI training coach — friendly, expert, concise. You help with ANYTHING in the workout section and choose the right action for what the athlete actually asked.

ATHLETE CONTEXT: ${ctx}

WHAT YOU CAN DO (pick per request):
1. ANSWER / ADVISE in plain text — use the ATHLETE CONTEXT to answer PERSONALLY about their training, personal records, programs, targets, and body composition (InBody weight / body fat / muscle and its trend): e.g. "how is my bench trending", "am I losing fat or muscle", "will I hit my body-fat target", "what should I train next". Also technique/form cues, exercise selection, progression, and reading an attached photo/PDF (identify equipment/exercise, critique form). Do this whenever the athlete asks a question or wants feedback rather than a plan to save — do NOT force a workout/program on them.
2. Build a SINGLE WORKOUT — call "propose_workout" for a one-off session ("give me a push day", "a 30-min dumbbell workout", "turn this photo into a workout", "today's legs"). Saved as a reusable workout.
3. Build a MULTI-WEEK PROGRAM — call "propose_program" for an ongoing plan ("a 4-week program", "a weekly split", "a plan to follow day by day", or transcribing a multi-day/multi-week program file).
4. START a live workout NOW — call "start_workout" when the athlete wants to BEGIN or LOG a session they are doing now or already started ("start a workout with these exercises", "I began 15 minutes ago", "log this workout I'm doing"). Capture each exercise + set; mark sets that are already completed (a checkmark ✓ next to them) with done=true; set startMinutesAgo from what they say (e.g. "started 15 minutes ago" → 15, otherwise 0). This launches a RUNNING, resumable session — do NOT save it as a template.

RULES FOR BOTH TOOLS:
- If you're missing essentials (goal, experience, days/week, session length, equipment/location, injuries) ask at most 1-3 questions first, offering concrete options; then build.
- Every exercise has concrete sets — reps (plus a weightKg or an RPE note) for lifts, or durationSeconds for holds/planks/cardio. Never a vague "3 sets" without numbers.
- CIRCUITS/COMBOS: when several movements are performed TOGETHER as rounds, output them as "combo" objects ({mode: "circuit"|"amrap"|"emom", rounds, movements:[{name, reps OR durationSeconds}]}), NOT as separate per-movement exercises.
  · If every round has the SAME reps → ONE combo item with rounds=N.
  · If the reps CHANGE each round (a ladder/pyramid — e.g. round 1: 5 muscle-ups + 12 dips + 6 pull-ups + 30 squats; round 2: 4 muscle-ups + 14 dips + 7 pull-ups + 15 push-ups; … down to 1 + 20 + 10) → output ONE combo PER ROUND, in order. Each round is its own combo item (rounds=1) whose movements carry THAT round's reps (and that round's finisher, e.g. 30 squats or 15 push-ups). NEVER merge all rounds of a single movement into one exercise; group by round, not by movement.
- Never print a workout/program as chat text; always use the tool. The app shows the proposal for the athlete to review and save — nothing saves automatically.
- Transcribe an attached program file FAITHFULLY and IN FULL: every exercise, set and rep, and any rounds/ladders/AMRAP/circuit exactly (each round/rung = its own set, use the set note). A single session → propose_workout; multiple days/weeks → propose_program with EVERY week and day in order (a 4-week plan = ~28 day entries incl. rest days), never stopping after week 1.
- Use clear standard English exercise names (e.g. "Barbell Bench Press", "Pull-Up") so they link to the app's library.
- Keep chat replies short and mobile-friendly. You may reply in the athlete's language.`;

const WORKOUT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                reps: { type: "integer" },
                weightKg: { type: "number" },
                durationSeconds: { type: "integer" },
                note: { type: "string" },
              },
            },
          },
          combo: {
            type: "object",
            properties: {
              mode: { type: "string" },
              rounds: { type: "integer" },
              movements: {
                type: "array",
                items: { type: "object", properties: { name: { type: "string" }, reps: { type: "integer" }, durationSeconds: { type: "integer" }, weightKg: { type: "number" } }, required: ["name"] },
              },
            },
          },
        },
        required: ["name"],
      },
    },
  },
  required: ["name", "exercises"],
} as const;

const START_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    startMinutesAgo: { type: "integer" }, // e.g. "I started 15 min ago" -> 15
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                reps: { type: "integer" },
                weightKg: { type: "number" },
                durationSeconds: { type: "integer" },
                done: { type: "boolean" }, // this set is already completed (e.g. a checkmark)
              },
            },
          },
        },
        required: ["name"],
      },
    },
  },
  required: ["name", "exercises"],
} as const;

const PROPOSE_TOOL = { name: "propose_program", description: "Propose a complete MULTI-WEEK training program (ordered days across one or more weeks) for the athlete to review and save.", parameters: PROGRAM_SCHEMA as any };
const PROPOSE_WORKOUT_TOOL = { name: "propose_workout", description: "Propose a SINGLE workout session (one list of exercises with sets) for the athlete to review and save as a reusable workout.", parameters: WORKOUT_SCHEMA as any };
const START_WORKOUT_TOOL = { name: "start_workout", description: "START a live, resumable workout session NOW with the given exercises/sets. Use when the athlete wants to begin/log a workout they are doing now or already started — capture which sets are already DONE and how many minutes ago it started (startMinutesAgo). The app launches the running session; nothing is saved as a template.", parameters: START_SCHEMA as any };

// Real post-workout insight: compares the just-finished session to the athlete's
// previous sessions of the same workout + recent activity. Returns 2-3 sentences.
const LOG_INSIGHT_SYSTEM = `You are the Nafas training assistant. Given a just-finished workout and the athlete's previous sessions of the SAME workout (newest first) plus their recent activity, write a short, specific insight (2-3 sentences): how this session compares to last time (volume, reps, sets, or key lifts), any real progress or personal best, and ONE concrete suggestion for next time. Use actual numbers. Be encouraging and honest — if it was lighter than last time, say so kindly. No medical claims. Reply in the athlete's language if evident, else English.`;

export async function workoutInsight(userId: string, log: { name?: string; date?: string; durationMinutes?: number; totalVolumeKg?: number; totalSets?: number; completedSets?: number; totalReps?: number; exercises?: any[] }): Promise<string> {
  const name = log.name || "";
  const sameName = name
    ? await db.select().from(workoutLogs).where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.name, name))).orderBy(desc(workoutLogs.date)).limit(6)
    : [];
  const recent = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)).orderBy(desc(workoutLogs.date)).limit(12);
  const slim = (l: any) => ({ date: String(l.date).split("T")[0], volumeKg: Math.round(Number(l.totalVolumeKg) || 0), sets: `${l.completedSets}/${l.totalSets}`, reps: Number(l.totalReps) || 0, min: Number(l.durationMinutes) || 0, exercises: (l.exercises || []).slice(0, 12).map((e: any) => e.name) });
  const ctx = {
    justFinished: { name, date: log.date, min: log.durationMinutes, volumeKg: Math.round(log.totalVolumeKg || 0), sets: `${log.completedSets}/${log.totalSets}`, reps: log.totalReps, exercises: (log.exercises || []).slice(0, 12).map((e: any) => e.name) },
    previousSameWorkout: sameName.slice(0, 5).map(slim),
    recentActivity: `${recent.length} sessions logged recently; last workouts: ${[...new Set(recent.map((l) => l.name))].slice(0, 6).join(", ") || "none"}`,
  };
  const r = await geminiJSON<{ insight: string }>({
    system: LOG_INSIGHT_SYSTEM,
    parts: [{ text: JSON.stringify(ctx) }],
    schema: { type: "object", properties: { insight: { type: "string" } }, required: ["insight"] } as any,
    maxOutputTokens: 400,
  });
  return r.insight;
}

export async function chat(userId: string, input: { messages: { role: "user" | "model"; text: string }[]; files?: { mimeType: string; data: string }[] }) {
  const { lib } = await exerciseLib();
  const ctx = await userContext(userId);
  const contents: ChatContent[] = input.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] as GeminiPart[] }));
  // attach any files to the latest user turn
  if (input.files?.length && contents.length) {
    const last = contents[contents.length - 1];
    for (const f of input.files) last.parts.unshift({ inline_data: { mime_type: f.mimeType, data: f.data } });
  }
  const r = await geminiChat({ system: CHAT_SYSTEM(ctx), contents, tools: [PROPOSE_TOOL, PROPOSE_WORKOUT_TOOL, START_WORKOUT_TOOL] });
  if (r.call?.name === "start_workout") {
    return { type: "start" as const, message: r.text || "Ready to start — review and begin.", session: mapStart(r.call.args as StartDraft, lib) };
  }
  if (r.call?.name === "propose_program") {
    return { type: "proposal" as const, message: r.text || "Here's a program I put together — review it and save when you're happy.", program: mapDraft(r.call.args as Draft, lib) };
  }
  if (r.call?.name === "propose_workout") {
    return { type: "workout" as const, message: r.text || "Here's a workout — review it and save when you're happy.", workout: mapWorkout(r.call.args as WorkoutDraft, lib) };
  }
  return { type: "message" as const, message: r.text || "…" };
}
