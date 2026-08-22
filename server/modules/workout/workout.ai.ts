// AI "Create with AI": turn a text prompt and/or an uploaded image/PDF into a
// Nafas program draft, using Gemini. Exercises are mapped to the real library
// (so they get media + progression) where names match; unmatched stay as
// plain-named entries. Server-side only (key stays on the backend).
import { db } from "../../core/db";
import { exercises as exercisesTable } from "./workout.db";
import { geminiJSON } from "../../core/gemini";

// ── name matching (shared shape with the media import scripts) ──
const STOP = new Set(["the", "a", "with", "and", "of", "to", "version", "grip"]);
const norm = (s: string) => s.toLowerCase().split(" - ")[0].replace(/[-_/().,'"]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s: string) => norm(s).split(" ").map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)).filter((w) => w && !STOP.has(w));
function jac(a: string[], b: string[]) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => B.has(x) && i++); const u = new Set([...a, ...b]).size; return u ? i / u : 0; }

// Gemini structured-output schema for a program draft (kept simple; the server
// enriches it into the full composable model).
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

const SYSTEM = `You are a strength & conditioning coach building a training program for the Nafas fitness app.
- Output a program as an ordered list of days (Day 1, Day 2, …). Rest days are allowed (set restDay true, no exercises).
- Prefer exercise names from the provided ALLOWED EXERCISES list verbatim so they link to the app's library. If a needed movement is not in the list, use a clear, standard English name.
- For each set give the target: reps (+ weightKg if weighted), OR durationSeconds for holds/timed work. Keep numbers realistic for the stated level.
- If the user provides an image or PDF of a program, transcribe it faithfully into this structure.
- Keep it concise and safe; respect the user's goal, level, equipment, days/week, and any injuries.`;

export async function generateProgram(input: { text?: string; file?: { mimeType: string; data: string } }) {
  // compact catalog of real library names to steer the model
  const rows = await db.select({ name: exercisesTable.name, eq: exercisesTable.equipment }).from(exercisesTable);
  const catalog = rows.map((r) => r.name).sort();
  const lib = rows.map((r) => ({ name: r.name, tok: toks(r.name) }));

  const parts: any[] = [];
  if (input.file?.data) parts.push({ inline_data: { mime_type: input.file.mimeType, data: input.file.data } });
  parts.push({ text: `ALLOWED EXERCISES (prefer these names):\n${catalog.join("\n")}\n\nREQUEST:\n${input.text || "Create a balanced program from the attached file."}` });

  const draft = await geminiJSON<{ name: string; description?: string; days: { name: string; restDay?: boolean; exercises?: { name: string; sets?: { reps?: number; weightKg?: number; durationSeconds?: number; note?: string }[] }[] }[] }>({
    system: SYSTEM, parts, schema: PROGRAM_SCHEMA as any,
  });

  // map each exercise name → real library row (conservative), enrich into the composable model
  const matchName = (name: string) => {
    const nt = toks(name); let best: { name: string; score: number } | null = null;
    for (const l of lib) { const s = jac(nt, l.tok); if (!best || s > best.score) best = { name: l.name, score: s }; }
    return best && best.score >= 0.7 ? best.name : null;
  };

  const days = (draft.days || []).map((d, i) => ({
    weekIndex: Math.floor(i / 7),
    dayIndex: i % 7,
    restDay: !!d.restDay,
    templateId: null as string | null,
    name: d.name || `Day ${i + 1}`,
    label: "",
    notes: "",
    exercises: (d.exercises || []).map((e) => {
      const matched = matchName(e.name);
      const sets = (e.sets || []).map((s) => {
        const isHold = s.durationSeconds != null && s.reps == null;
        return isHold
          ? { type: "hold", measure: "time", durationSeconds: s.durationSeconds, ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) }
          : { type: "reps", ...(s.reps != null ? { reps: s.reps } : {}), ...(s.weightKg != null ? { weight: s.weightKg } : {}), ...(s.note ? { note: s.note } : {}) };
      });
      return {
        exerciseId: `ai-${i}-${(matched || e.name).replace(/\s+/g, "-").toLowerCase()}`,
        name: matched || e.name,
        muscleGroup: "Full Body",
        restSeconds: 90,
        matchedToLibrary: !!matched,
        sets: sets.length ? sets : [{ type: "reps", reps: 10 }],
      };
    }),
  }));

  return {
    name: draft.name || "AI Program",
    startDate: null,
    weeks: Math.max(1, Math.ceil(days.length / 7)),
    notes: draft.description || "",
    weekMeta: [],
    days,
  };
}
