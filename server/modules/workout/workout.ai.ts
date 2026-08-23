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

type DraftDay = { name?: string; restDay?: boolean; exercises?: { name: string; sets?: { reps?: number; weightKg?: number; durationSeconds?: number; note?: string }[] }[] };
type Draft = { name?: string; description?: string; days?: DraftDay[] };

async function exerciseLib() {
  const rows = await db.select({ name: exercisesTable.name }).from(exercisesTable);
  return { names: rows.map((r) => r.name).sort(), lib: rows.map((r) => ({ name: r.name, tok: toks(r.name) })) };
}

// draft (loose JSON from the model) → full composable-model program
function mapDraft(draft: Draft, lib: { name: string; tok: string[] }[]) {
  const matchName = (name: string) => {
    const nt = toks(name); let best: { name: string; score: number } | null = null;
    for (const l of lib) { const s = jac(nt, l.tok); if (!best || s > best.score) best = { name: l.name, score: s }; }
    return best && best.score >= 0.7 ? best.name : null;
  };
  const days = (draft.days || []).map((d, i) => ({
    weekIndex: Math.floor(i / 7), dayIndex: i % 7, restDay: !!d.restDay, templateId: null as string | null,
    name: d.name || `Day ${i + 1}`, label: "", notes: "",
    exercises: (d.exercises || []).map((e) => {
      const matched = matchName(e.name);
      const sets = (e.sets || []).map((s) => {
        const isHold = s.durationSeconds != null && s.reps == null;
        return isHold
          ? { type: "hold", measure: "time", durationSeconds: s.durationSeconds, ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) }
          : { type: "reps", ...(s.reps != null ? { reps: s.reps } : {}), ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) };
      });
      return { exerciseId: `ai-${i}-${(matched || e.name).replace(/\s+/g, "-").toLowerCase()}`, name: matched || e.name, muscleGroup: "Full Body", restSeconds: 90, sets: sets.length ? sets : [{ type: "reps", reps: 10 }] };
    }),
  }));
  return { name: draft.name || "AI Program", startDate: null, weeks: Math.max(1, Math.ceil(days.length / 7)), notes: draft.description || "", weekMeta: [], days };
}

// one-shot generate (kept for the simple Create-with-AI path)
export async function generateProgram(input: { text?: string; file?: { mimeType: string; data: string } }) {
  const { names, lib } = await exerciseLib();
  const parts: GeminiPart[] = [];
  if (input.file?.data) parts.push({ inline_data: { mime_type: input.file.mimeType, data: input.file.data } });
  parts.push({ text: `ALLOWED EXERCISES (prefer verbatim):\n${names.join("\n")}\n\nREQUEST:\n${input.text || "Create a balanced program from the attached file."}` });
  const draft = await geminiJSON<Draft>({ system: ONESHOT_SYSTEM, parts, schema: PROGRAM_SCHEMA as any });
  return mapDraft(draft, lib);
}

const ONESHOT_SYSTEM = `You are a strength & conditioning coach for the Nafas app. Output a program as ordered days (Day 1..N; rest days allowed). Prefer exercise names from ALLOWED EXERCISES verbatim; otherwise use a clear standard English name. Each set: reps (+weightKg if weighted) OR durationSeconds for holds. Faithfully transcribe any attached program file.`;

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

const CHAT_SYSTEM = (ctx: string, names: string[]) => `You are the Nafas AI training coach — friendly, concise, expert. Help the athlete build or adjust a training program.

ATHLETE CONTEXT: ${ctx}

HOW TO BEHAVE:
- Have a short back-and-forth. Ask only what you need (goal, experience, days/week, session length, equipment/location, injuries). Offer clear options the athlete can pick from.
- Before generating, briefly say what you'll build. When you have enough, CALL the tool "propose_program" with the full draft — do NOT print the program as text. The app shows it to the athlete to APPROVE before saving.
- Tailor to the athlete's context (goal, history, active program). If they attach a file/photo of a program, transcribe it faithfully via propose_program.
- Prefer exercise names from ALLOWED EXERCISES verbatim so they link to the app's library; else use a clear standard English name.
- Keep replies short and mobile-friendly. You may reply in the athlete's language.

ALLOWED EXERCISES (prefer verbatim): ${names.join(", ")}`;

const PROPOSE_TOOL = { name: "propose_program", description: "Propose a complete training program for the athlete to review and approve before it is saved.", parameters: PROGRAM_SCHEMA as any };

export async function chat(userId: string, input: { messages: { role: "user" | "model"; text: string }[]; files?: { mimeType: string; data: string }[] }) {
  const { names, lib } = await exerciseLib();
  const ctx = await userContext(userId);
  const contents: ChatContent[] = input.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] as GeminiPart[] }));
  // attach any files to the latest user turn
  if (input.files?.length && contents.length) {
    const last = contents[contents.length - 1];
    for (const f of input.files) last.parts.unshift({ inline_data: { mime_type: f.mimeType, data: f.data } });
  }
  const r = await geminiChat({ system: CHAT_SYSTEM(ctx, names), contents, tools: [PROPOSE_TOOL] });
  if (r.call?.name === "propose_program") {
    return { type: "proposal" as const, message: r.text || "Here's a program I put together — review and approve it.", program: mapDraft(r.call.args as Draft, lib) };
  }
  return { type: "message" as const, message: r.text || "…" };
}
