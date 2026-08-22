// Populate exercises.gif_url from the ExerciseDB dataset mirrored on GitHub
// (bootstrapping-lab/exercisedb-api: full JSON + 1500 GIFs, served from raw
// GitHub — free, no rate limit). The media is the Gym Visual set; grey-licensed,
// used for the prototype per decision #2 — swap to a licensed/self-hosted copy
// before launch. Matches Nafas exercises by normalized name; conservative so a
// wrong demo never shows. Dry-run by default; --apply writes.
import { eq } from "drizzle-orm";
import { db, pool } from "../core/db";
import { exercises } from "../modules/workout/workout.db";

const DATASET = "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json";
const GIF_BASE = "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/media/"; // <exerciseId>.gif
const APPLY = process.argv.includes("--apply");

const STOP = new Set(["the", "a", "with", "and", "of", "to", "version", "medium", "wide", "close", "grip", "standing", "seated", "lying"]);
const norm = (s: string) => s.toLowerCase().split(" - ")[0].replace(/[-_/().,'"]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)).filter((w) => w && !STOP.has(w));
const ALIAS: Record<string, string> = {
  "pull up": "pull up", "push up": "push up", "chin up": "chin up", "muscle up": "muscle up",
  "dips": "triceps dip", "straight bar dip": "triceps dip", "bar dip": "triceps dip",
  "barbell back squat": "barbell full squat", "squat": "barbell full squat", "deadlift": "barbell deadlift",
  "hip thrust": "barbell hip thrust", "leg curl": "lever leg curl", "standing calf raise": "lever standing calf raise",
  "hip adduction machine": "lever seated hip adduction", "hip abduction machine": "lever seated hip abduction",
};
function jaccard(a: string[], b: string[]) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => B.has(x) && i++); const u = new Set([...a, ...b]).size; return u ? i / u : 0; }

async function fetchAll(): Promise<{ name: string; gif: string }[]> {
  const raw = await fetch(DATASET).then((r) => r.json()) as any[];
  return raw.filter((e) => e.exerciseId).map((e) => ({ name: e.name, gif: GIF_BASE + e.exerciseId + ".gif" }));
}

async function main() {
  const ds = (await fetchAll()).map((d) => ({ ...d, tok: tokens(d.name) }));
  console.log("ExerciseDB total:", ds.length);
  const exs = await db.select().from(exercises);
  let matched = 0, already = 0;
  const unmatched: string[] = [];
  const updates: { id: string; name: string; ds: string; gif: string }[] = [];

  for (const ex of exs) {
    if (ex.gifUrl) { already++; continue; }
    const nTok = tokens(ex.name);
    const alias = ALIAS[norm(ex.name)];
    let best: { d: typeof ds[0]; score: number } | null = null;
    for (const d of ds) {
      let score = jaccard(nTok, d.tok);
      if (alias && norm(d.name) === alias) score = 100;
      if (!best || score > best.score) best = { d, score };
    }
    if (best && best.score >= 0.7) { matched++; updates.push({ id: ex.id, name: ex.name, ds: best.d.name, gif: best.d.gif }); }
    else unmatched.push(ex.name);
  }

  console.log(`exercises: ${exs.length} | already have gif: ${already} | matched: ${matched} | unmatched: ${unmatched.length}`);
  console.log("\n— sample matches —");
  updates.slice(0, 30).forEach((u) => console.log(`  ${u.name}  →  ${u.ds}`));
  if (APPLY) {
    for (const u of updates) await db.update(exercises).set({ gifUrl: u.gif }).where(eq(exercises.id, u.id));
    console.log(`\nAPPLIED: set gifUrl on ${updates.length} exercises`);
  } else console.log("\n(dry run — pass --apply to write)");
  pool.end();
}
main().catch((e) => { console.error(e); pool.end(); process.exit(1); });
