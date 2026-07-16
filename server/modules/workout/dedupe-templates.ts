import { inArray } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { workoutTemplates } from "./workout.db";

// One-off: remove duplicate workout templates (same user + name + type + exercises),
// keeping the earliest by createdAt. Fixes dups created before the save-once guard landed.
const sigOf = (t: any) =>
  JSON.stringify({
    u: t.userId,
    n: String(t.name || "").trim().toLowerCase(),
    t: t.workoutTypeId || "",
    e: (t.exercises || []).map((x: any) => ({ id: x.exerciseId, s: x.sets })),
  });

async function dedupe() {
  const rows = await db.select().from(workoutTemplates);
  const seen = new Set<string>();
  const toDelete: string[] = [];
  // earliest first → keep the first occurrence of each signature
  rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  for (const r of rows) {
    const sig = sigOf(r);
    if (seen.has(sig)) toDelete.push(r.id);
    else seen.add(sig);
  }
  if (toDelete.length) {
    // delete in chunks to keep the IN list sane
    for (let i = 0; i < toDelete.length; i += 100) {
      await db.delete(workoutTemplates).where(inArray(workoutTemplates.id, toDelete.slice(i, i + 100)));
    }
  }
  console.log(`✓ dedupe templates: ${rows.length} total → kept ${seen.size}, deleted ${toDelete.length}`);
}

dedupe().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
