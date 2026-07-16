import { db, pool } from "../../core/db";
import { workoutTemplates } from "./workout.db";
import { desc, inArray } from "drizzle-orm";

// One-off: collapse same-name templates per user (keep newest, delete the rest).
// Names auto-derive from workout type ("Pull Day" etc.) so old-bug artifacts pile up
// under one name; this clears the clutter. Pass `--content` to only collapse
// content-identical dups instead.
async function dedup() {
  const byContent = process.argv.includes("--content");
  const rows = await db.select().from(workoutTemplates).orderBy(desc(workoutTemplates.createdAt));
  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const r of rows) {
    const sig = byContent
      ? `${r.userId}::${r.name}::${JSON.stringify(r.exercises ?? [])}`
      : `${r.userId}::${r.name}`;
    if (seen.has(sig)) toDelete.push(r.id);
    else seen.add(sig);
  }
  if (toDelete.length) await db.delete(workoutTemplates).where(inArray(workoutTemplates.id, toDelete));
  console.log(`✓ dedup templates: ${rows.length} total, deleted ${toDelete.length} duplicates`);
}

if (process.argv[1]?.includes("dedup-templates")) {
  dedup().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
