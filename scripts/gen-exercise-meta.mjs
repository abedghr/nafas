// Generates server/modules/workout/seed-data/exercise-meta.map.ts:
//   EXERCISE_EQUIPMENT  — from the PUBLIC-DOMAIN free-exercise-db equipment field
//                         when matched (accurate), else derived from the name.
//   EXERCISE_IMAGE      — matched to the free-exercise-db images (Unlicense/public
//                         domain — free to use; NOT Hevy's images).
// Matching is token-set based (handles "Bench Press (Barbell)" ↔ "Barbell Bench Press").
// Run: node scripts/gen-exercise-meta.mjs
import fs from 'fs';

const DATASET = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const existing = fs.readFileSync('/tmp/existing_ex.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const hevy = fs.readFileSync('/tmp/hevy_ex.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const newNames = fs.existsSync('/tmp/hevy_new.txt')
  ? fs.readFileSync('/tmp/hevy_new.txt', 'utf8').split('\n').map(l => l.split('|')[0].trim()).filter(Boolean) : [];
const names = [...new Set([...existing, ...hevy, ...newNames])].sort();

// ── tokens (drop equipment/filler words for MATCHING, but keep for scoring core) ─
const STOP = new Set(['the','a','of','with','and','to','on','grip','single','arm','one','two','close','wide','standing','seated','lying','incline','decline','flat','bar','v']);
const EQWORD = new Set(['barbell','dumbbell','cable','machine','smith','kettlebell','plate','band','bands','suspension','weighted','assisted','bodyweight','trx']);
const toks = s => new Set(s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
  .filter(w => w && !STOP.has(w)).map(w => w.replace(/s$/, '')));
const coreToks = s => new Set([...toks(s)].filter(w => !EQWORD.has(w)));

// ── equipment ───────────────────────────────────────────────────────────────
const DS_EQUIP = { 'body only': 'None', barbell: 'Barbell', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell',
  cable: 'Machine', machine: 'Machine', 'e-z curl bar': 'Barbell', bands: 'Resistance Band',
  'medicine ball': 'Other', 'exercise ball': 'Other', 'foam roll': 'Other', other: 'Other' };
function equipFromName(raw) {
  const n = raw.toLowerCase();
  if (/\bsmith\b/.test(n)) return 'Machine';
  if (/\(machine|\bmachine\b|treadmill|rowing machine|stair machine|recumbent|ski erg|spinning|stationary|elliptical|assault bike|air bike|leg press|pendulum|vertical traction|seated dip machine|hack squat|lat ?pulldown|pulldown|\bcable\b|pushdown|pressdown|\brope\b|pec deck|belt squat/.test(n)) return 'Machine';
  if (/\bdumbbell\b|zottman|pinwheel|waiter|spider curl|concentration curl|preacher curl \(dumbbell/.test(n)) return 'Dumbbell';
  if (/\bkettlebell\b/.test(n)) return 'Kettlebell';
  if (/\bplate\b/.test(n)) return 'Plate';
  if (/\bband\b|resistance band|pullapart/.test(n)) return 'Resistance Band';
  if (/\bsuspension\b|\btrx\b/.test(n)) return 'Suspension Band';
  if (/\bsled\b|\btire\b|sandbag|wall ball|ball slam|wrist roller|farmer|suitcase|battle rope|medicine ball/.test(n)) return 'Other';
  // barbell movements named without an equipment word
  if (/\bbarbell\b|pendlay|deadlift|romanian deadlift|sumo deadlift|straight leg deadlift|stiff leg|zercher|power clean|hang clean|clean ?& ?jerk|split jerk|power snatch|\bsnatch\b|press under|rack pull|good morning|military press|push press|bench press|overhead press|floor press|thruster/.test(n) && !/dumbbell|machine|smith|cable|kettlebell|plate|\bband\b|suspension/.test(n)) return 'Barbell';
  return 'None'; // bodyweight / calisthenics / cardio-no-machine / holds
}

const res = await fetch(DATASET);
const data = await res.json();
const entries = data.filter(e => e.images && e.images.length).map(e => ({
  core: coreToks(e.name), all: toks(e.name),
  equip: DS_EQUIP[(e.equipment || '').toLowerCase()] || '',
  img: IMG_BASE + e.images[0],
}));

// best dataset match for one of our names: all our core tokens present in the entry,
// then maximize token coverage. Requires ≥1 shared core token.
function match(name) {
  const oc = coreToks(name), oa = toks(name);
  if (!oc.size) return null;
  let best = null, bestScore = 0;
  for (const e of entries) {
    let coreHit = 0; for (const w of oc) if (e.core.has(w)) coreHit++;
    if (coreHit < oc.size) continue;          // entry must contain ALL our core movement tokens
    let allHit = 0; for (const w of oa) if (e.all.has(w)) allHit++;
    const score = allHit / (oa.size + e.all.size - allHit); // Jaccard on all tokens
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best; // may be null
}

const equip = {}, image = {};
let matched = 0, dsEquip = 0;
for (const name of names) {
  const m = match(name);
  if (m) { image[name] = m.img; matched++; }
  // prefer accurate dataset equipment when matched, else name heuristic
  const e = (m && m.equip) ? m.equip : equipFromName(name);
  if (m && m.equip) dsEquip++;
  equip[name] = e;
}
// ponytail: evaluated wger (v2 exerciseimage) as a 2nd image source — dropped.
// Its ~360 images resolve to mixed-language names (language=2 filter ignored) and
// the English subset is all basic lifts free-exercise-db already covers (~0 net
// gap fills), while each image carries a per-image license needing attribution.
// Not worth it. Gaps are covered by the owned muscle-map SVG fallback instead.

const q = s => JSON.stringify(s);
const out = `// AUTO-GENERATED by scripts/gen-exercise-meta.mjs — do not hand-edit.
// EQUIPMENT: from the PUBLIC-DOMAIN free-exercise-db when matched, else name-derived.
// IMAGE: free-exercise-db (Unlicense, public domain) — free to use; NOT Hevy's images.
export const EXERCISE_EQUIPMENT: Record<string, string> = {
${names.map(n => `  ${q(n)}: ${q(equip[n])},`).join('\n')}
};

export const EXERCISE_IMAGE: Record<string, string> = {
${Object.keys(image).sort().map(n => `  ${q(n)}: ${q(image[n])},`).join('\n')}
};
`;
fs.writeFileSync('server/modules/workout/seed-data/exercise-meta.map.ts', out);
console.log(`names ${names.length} | images matched ${matched} | equipment-from-dataset ${dsEquip}`);
