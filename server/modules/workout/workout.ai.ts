// AI coach: multimodal "Create with AI" (one-shot) + a context-aware chat that
// asks questions, offers options, and proposes a program for the user to approve
// before it's saved. Exercises map to the real library where names match.
// Server-side only (Gemini key stays on the backend).
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../core/db";
import { exercises as exercisesTable, workoutLogs } from "./workout.db";
import { users } from "../identity/identity.db";
import { programEnrollments, programs } from "../programs/programs.db";
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
type DraftExercise = { name: string; sets?: DraftSet[] };
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
  return exercises.map((e) => {
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

// one-shot generate (kept for the simple Create-with-AI path)
export async function generateProgram(input: { text?: string; file?: { mimeType: string; data: string } }) {
  const { lib } = await exerciseLib();
  const parts: GeminiPart[] = [];
  if (input.file?.data) parts.push({ inline_data: { mime_type: input.file.mimeType, data: input.file.data } });
  parts.push({ text: input.text || "Create a complete, well-structured program from the attached file — transcribe every exercise, set and rep faithfully." });
  const draft = await geminiJSON<Draft>({ system: ONESHOT_SYSTEM, parts, schema: PROGRAM_SCHEMA as any });
  return mapDraft(draft, lib);
}

const ONESHOT_SYSTEM = `You are a strength & conditioning coach for the Nafas app. Output a COMPLETE program as ordered days (Day 1..N; rest days allowed). Every training day lists real exercises, and every exercise has concrete sets: reps (plus weightKg if weighted) for lifts, or durationSeconds for holds/cardio. Use clear standard English exercise names (e.g. "Barbell Bench Press", "Pull-Up"). When a program file is attached, transcribe it FAITHFULLY and IN FULL — capture every exercise, every set and rep, and any rounds/ladders/AMRAP/circuit structure exactly (put each round or rung in its own set, use the set note for context). If it spans multiple weeks, output EVERY week and EVERY day in order (a 4-week plan = ~28 day entries, rest days included); never stop after week 1. Never simplify or drop items.`;

// ── context-aware chat ──
async function userContext(userId: string): Promise<string> {
  const [u] = await db.select({ goal: users.goal, name: users.name }).from(users).where(eq(users.id, userId));
  const logs = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)).orderBy(desc(workoutLogs.date)).limit(12);
  const [enr] = await db.select().from(programEnrollments).where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.status, "active")));
  let activeName = "none";
  if (enr) { const [p] = await db.select({ name: programs.name }).from(programs).where(eq(programs.id, enr.programId)); activeName = p?.name ?? "one"; }
  const recentNames = [...new Set(logs.map((l) => l.name))].slice(0, 8).join(", ") || "no workouts logged yet";
  const vol = logs.reduce((a, l) => a + (Number(l.totalVolumeKg) || 0), 0);
  return [
    `Athlete goal: ${u?.goal || "unspecified"}.`,
    `Sessions logged recently: ${logs.length}. Recent workouts: ${recentNames}.`,
    `Approx recent total volume: ${Math.round(vol)} kg.`,
    `Active program: ${activeName}.`,
  ].join(" ");
}

const CHAT_SYSTEM = (ctx: string) => `You are the Nafas AI training coach — friendly, expert, concise. You help with ANYTHING in the workout section and choose the right action for what the athlete actually asked.

ATHLETE CONTEXT: ${ctx}

WHAT YOU CAN DO (pick per request):
1. ANSWER / ADVISE in plain text — technique and form cues, exercise selection, how to progress, or reading an attached photo/PDF (identify the equipment or exercise, critique form, describe what it shows). Do this whenever the athlete asks a question or wants feedback rather than a plan to save. Do NOT force a workout/program on them.
2. Build a SINGLE WORKOUT — call "propose_workout" for a one-off session ("give me a push day", "a 30-min dumbbell workout", "turn this photo into a workout", "today's legs"). Saved as a reusable workout.
3. Build a MULTI-WEEK PROGRAM — call "propose_program" for an ongoing plan ("a 4-week program", "a weekly split", "a plan to follow day by day", or transcribing a multi-day/multi-week program file).

RULES FOR BOTH TOOLS:
- If you're missing essentials (goal, experience, days/week, session length, equipment/location, injuries) ask at most 1-3 questions first, offering concrete options; then build.
- Every exercise has concrete sets — reps (plus a weightKg or an RPE note) for lifts, or durationSeconds for holds/planks/cardio. Never a vague "3 sets" without numbers.
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
        },
        required: ["name"],
      },
    },
  },
  required: ["name", "exercises"],
} as const;

const PROPOSE_TOOL = { name: "propose_program", description: "Propose a complete MULTI-WEEK training program (ordered days across one or more weeks) for the athlete to review and save.", parameters: PROGRAM_SCHEMA as any };
const PROPOSE_WORKOUT_TOOL = { name: "propose_workout", description: "Propose a SINGLE workout session (one list of exercises with sets) for the athlete to review and save as a reusable workout.", parameters: WORKOUT_SCHEMA as any };

export async function chat(userId: string, input: { messages: { role: "user" | "model"; text: string }[]; files?: { mimeType: string; data: string }[] }) {
  const { lib } = await exerciseLib();
  const ctx = await userContext(userId);
  const contents: ChatContent[] = input.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] as GeminiPart[] }));
  // attach any files to the latest user turn
  if (input.files?.length && contents.length) {
    const last = contents[contents.length - 1];
    for (const f of input.files) last.parts.unshift({ inline_data: { mime_type: f.mimeType, data: f.data } });
  }
  const r = await geminiChat({ system: CHAT_SYSTEM(ctx), contents, tools: [PROPOSE_TOOL, PROPOSE_WORKOUT_TOOL] });
  if (r.call?.name === "propose_program") {
    return { type: "proposal" as const, message: r.text || "Here's a program I put together — review it and save when you're happy.", program: mapDraft(r.call.args as Draft, lib) };
  }
  if (r.call?.name === "propose_workout") {
    return { type: "workout" as const, message: r.text || "Here's a workout — review it and save when you're happy.", workout: mapWorkout(r.call.args as WorkoutDraft, lib) };
  }
  return { type: "message" as const, message: r.text || "…" };
}
