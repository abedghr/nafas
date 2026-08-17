import { ProgramCreateSchema } from "../modules/programs/programs.schema";
import { enduranceProgram } from "./endurance-program";

const p = ProgramCreateSchema.parse(enduranceProgram);
console.log("zod OK:", p.name, "| weeks", p.weeks, "| days", p.days.length);

// lint
let issues = 0;
const seen = new Set<string>();
for (const d of p.days) {
  const key = `${d.weekIndex}-${d.dayIndex}`;
  if (seen.has(key)) { console.log("DUP cell", key); issues++; }
  seen.add(key);
  if (d.restDay) continue;
  const exs = d.exercises as any[];
  if (!exs.length) { console.log("EMPTY day", key); issues++; }
  for (const e of exs) {
    if (e.kind === "combo") {
      if (!e.components?.length) { console.log("combo no comps", key, e.name); issues++; }
      if (e.mode === "amrap" && !e.timeCapSeconds) { console.log("amrap no cap", key, e.name); issues++; }
    } else if (e.kind === "intervals") {
      if (!e.intervals?.rounds) { console.log("interval no rounds", key, e.name); issues++; }
    } else {
      if (!e.sets?.length) { console.log("block no sets", key, e.name); issues++; }
    }
  }
}
// per-week day counts
const byWeek: Record<number, number> = {};
for (const d of p.days) byWeek[d.weekIndex] = (byWeek[d.weekIndex] || 0) + 1;
console.log("days/week:", byWeek);
console.log(issues ? `LINT ISSUES: ${issues}` : "lint clean");
