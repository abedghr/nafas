// Writes an OWNED SVG asset per exercise into assets/exercises/<slug>.svg,
// built from our muscle-figure geometry + each exercise's body-targets.
// These are our own files (no external/copyrighted images). Run via tsx:
//   psql ... > /tmp/ex_targets.json ; npx tsx scripts/gen-muscle-svgs.ts
import fs from 'fs';
import { muscleSvgString } from '../lib/muscle-figure';

export const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const rows: { name: string; targets: { m: string; p: number }[] }[] =
  JSON.parse(fs.readFileSync('/tmp/ex_targets.json', 'utf8'));

const dir = 'assets/exercises';
fs.mkdirSync(dir, { recursive: true });
let n = 0;
for (const r of rows) {
  const muscles = (r.targets || []).sort((a, b) => b.p - a.p).map(t => t.m);
  if (!muscles.length) continue;
  fs.writeFileSync(`${dir}/${slugify(r.name)}.svg`, muscleSvgString(muscles));
  n++;
}
console.log(`wrote ${n} owned SVGs to ${dir}/`);
