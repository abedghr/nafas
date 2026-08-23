// Populate exercises.instructions / target_muscle / secondary_muscles (and
// equipment where empty) from hasaneyldrm/exercises-dataset. That TEXT data is
// MIT-licensed and free for commercial use — we import ONLY the text; the
// dataset's images/GIFs are © Gym Visual (paid) and are NOT touched here.
// Matches Nafas exercises by normalized name; conservative (jaccard >= 0.7) so a
// wrong description never shows. Fills only empty fields. Dry-run by default; --apply writes.
import { eq } from "drizzle-orm";
import { db, pool } from "../core/db";
import { exercises } from "../modules/workout/workout.db";

const DATASET = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
const APPLY = process.argv.includes("--apply");

const STOP = new Set(["the", "a", "with", "and", "of", "to", "version", "medium", "wide", "close", "grip", "standing", "seated", "lying"]);
const norm = (s: string) => s.toLowerCase().split(" - ")[0].replace(/[-_/().,'"]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w)).filter((w) => w && !STOP.has(w));
const ALIAS: Record<string, string> = {
  "pull up": "pull-up", "push up": "push-up", "chin up": "chin-up",
  "barbell back squat": "barbell full squat", "squat": "barbell full squat", "deadlift": "barbell deadlift",
};
function jaccard(a: string[], b: string[]) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => B.has(x) && i++); const u = new Set([...a, ...b]).size; return u ? i / u : 0; }

// dataset equipment label -> Nafas label
const EQUIP: Record<string, string> = {
  "body weight": "None",
  "barbell": "Barbell", "olympic barbell": "Barbell", "ez barbell": "Barbell", "trap bar": "Barbell",
  "dumbbell": "Dumbbell", "kettlebell": "Kettlebell", "weighted": "Plate",
  "cable": "Machine", "leverage machine": "Machine", "smith machine": "Machine", "hammer": "Machine",
  "sled machine": "Machine", "assisted": "Machine", "skierg machine": "Machine", "stepmill machine": "Machine",
  "elliptical machine": "Machine", "stationary bike": "Machine", "upper body ergometer": "Machine",
  "band": "Resistance Band", "resistance band": "Resistance Band",
};
const equipLabel = (e: string) => EQUIP[e] || "Other";

type DsItem = { name: string; tok: string[]; steps: string; target: string; secondary: string; equipment: string };

async function fetchAll(): Promise<DsItem[]> {
  const raw = await fetch(DATASET).then((r) => r.json()) as any[];
  return raw.map((e) => ({
    name: e.name,
    tok: tokens(e.name),
    steps: (e.instruction_steps?.en || []).join("\n").trim(),
    target: e.target || e.muscle_group || "",
    secondary: Array.isArray(e.secondary_muscles) ? e.secondary_muscles.join(", ") : "",
    equipment: e.equipment || "",
  }));
}

async function main() {
  const ds = await fetchAll();
  console.log("dataset total:", ds.length);
  const exs = await db.select().from(exercises);
  let matched = 0;
  const unmatched: string[] = [];
  const updates: { id: string; name: string; dsName: string; set: Partial<typeof exercises.$inferInsert> }[] = [];

  for (const ex of exs) {
    const nTok = tokens(ex.name);
    const alias = ALIAS[norm(ex.name)];
    let best: { d: DsItem; score: number } | null = null;
    for (const d of ds) {
      let score = jaccard(nTok, d.tok);
      if (alias && norm(d.name) === alias) score = 100;
      if (!best || score > best.score) best = { d, score };
    }
    if (!best || best.score < 0.7) { unmatched.push(ex.name); continue; }
    const d = best.d;
    const set: Partial<typeof exercises.$inferInsert> = {};
    if (!ex.instructions && d.steps) set.instructions = d.steps;
    if (!ex.targetMuscle && d.target) set.targetMuscle = d.target;
    if (!ex.secondaryMuscles && d.secondary) set.secondaryMuscles = d.secondary;
    if (!ex.equipment && d.equipment) set.equipment = equipLabel(d.equipment);
    if (Object.keys(set).length === 0) continue; // nothing new to add
    matched++;
    updates.push({ id: ex.id, name: ex.name, dsName: d.name, set });
  }

  console.log(`exercises: ${exs.length} | will update: ${updates.length} | unmatched: ${unmatched.length}`);
  console.log("\n— sample —");
  updates.slice(0, 25).forEach((u) => console.log(`  ${u.name} → ${u.dsName}  [${Object.keys(u.set).join(", ")}]`));
  if (APPLY) {
    for (const u of updates) await db.update(exercises).set(u.set).where(eq(exercises.id, u.id));
    console.log(`\nAPPLIED: updated ${updates.length} exercises`);
  } else console.log("\n(dry run — pass --apply to write)");
  pool.end();
}
main().catch((e) => { console.error(e); pool.end(); process.exit(1); });
