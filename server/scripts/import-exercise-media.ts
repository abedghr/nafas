// Match Nafas exercises to the free-exercise-db (Unlicense / public domain) and
// set imageUrl to the dataset's GitHub-raw photo. Data source is CC0 so hotlink
// is fine for now; later, re-run with a rewritten base to point at S3/Backblaze.
//
//   DATABASE_URL='postgresql://…' npx tsx server/scripts/import-exercise-media.ts          # dry run (report only)
//   DATABASE_URL='postgresql://…' npx tsx server/scripts/import-exercise-media.ts --apply  # write imageUrl
import { eq } from "drizzle-orm";
import { db, pool } from "../core/db";
import { exercises } from "../modules/workout/workout.db";

const DATASET = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const APPLY = process.argv.includes("--apply");

// normalize a name to a comparable token set
const STOP = new Set(["the", "a", "with", "and", "of", "to", "version", "medium", "wide", "close", "grip", "standing", "seated", "lying"]);
function norm(s: string): string {
  return s.toLowerCase().split(" - ")[0].replace(/[-_/().,'"]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string): string[] {
  return norm(s).split(" ").map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)).filter((w) => w && !STOP.has(w));
}
// hand aliases: Nafas name (normalized) → dataset name substring to prefer
const ALIAS: Record<string, string> = {
  "pull up": "pullups", "push up": "pushups", "chin up": "chin up", "muscle up": "muscle up",
  "dips": "dips triceps", "straight bar dip": "dips triceps", "bar dip": "dips triceps",
  "squat": "barbell squat", "barbell back squat": "barbell squat", "deadlift": "barbell deadlift",
  "hip thrust": "barbell hip thrust", "leg curl": "lying leg curls", "hip adduction machine": "thigh adductor",
  "hip abduction machine": "thigh abductor", "standing calf raise": "standing calf raises",
};

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  let inter = 0; A.forEach((x) => B.has(x) && inter++);
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

async function main() {
  const raw = await fetch(DATASET).then((r) => r.json()) as any[];
  const ds = raw.filter((e) => e.images?.length).map((e) => ({ name: e.name, tok: tokens(e.name), img: e.images[0], equipment: e.equipment, primary: e.primaryMuscles }));

  const exs = await db.select().from(exercises);
  let matched = 0, already = 0;
  const unmatched: string[] = [];
  const updates: { id: string; name: string; ds: string; url: string }[] = [];

  for (const ex of exs) {
    if (ex.imageUrl) { already++; continue; }
    const nTok = tokens(ex.name);
    const alias = ALIAS[norm(ex.name)];
    let best: { d: typeof ds[0]; score: number } | null = null;
    for (const d of ds) {
      // token-set similarity; require real overlap so we never show a wrong image.
      let score = jaccard(nTok, d.tok);
      if (alias && norm(d.name).includes(alias)) score = 100; // alias is authoritative
      if (!best || score > best.score) best = { d, score };
    }
    if (best && best.score >= 0.7) {
      matched++;
      updates.push({ id: ex.id, name: ex.name, ds: best.d.name, url: RAW_BASE + best.d.img });
    } else {
      unmatched.push(ex.name);
    }
  }

  console.log(`exercises: ${exs.length} | already have image: ${already} | matched: ${matched} | unmatched: ${unmatched.length}`);
  console.log("\n— sample matches —");
  updates.slice(0, 25).forEach((u) => console.log(`  ${u.name}  →  ${u.ds}`));
  console.log("\n— unmatched (icon fallback) —");
  console.log("  " + unmatched.slice(0, 60).join(", ") + (unmatched.length > 60 ? ` … +${unmatched.length - 60}` : ""));

  if (APPLY) {
    for (const u of updates) await db.update(exercises).set({ imageUrl: u.url }).where(eq(exercises.id, u.id));
    console.log(`\nAPPLIED: set imageUrl on ${updates.length} exercises`);
  } else {
    console.log("\n(dry run — pass --apply to write)");
  }
  pool.end();
}
main().catch((e) => { console.error(e); pool.end(); process.exit(1); });
