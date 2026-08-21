// Turn a workout's exercises (single blocks, combos, interval blocks) into plain
// text — used by the day "view as text" sheet and by a pinned program shown as
// the weekly plan. Pure; pass the user's weightUnit so loads read in kg/lb.
import { toDisplayWeight, unitLabel, type WeightUnit } from './units';
import type { Program, ProgramDay } from './app-context';

const round1 = (n: number) => Math.round(n * 10) / 10;
const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`);
const dist = (m: number) => (m >= 1000 ? `${round1(m / 1000)}km` : `${Math.round(m)}m`);

const W = (kg: number, u: WeightUnit) => `${round1(toDisplayWeight(kg, u))}${unitLabel(u)}`;

// one set of a single-exercise block → "8 × 70kg", "10s", "Max reps +10kg", "3:00"
function setLabel(s: any, u: WeightUnit): string {
  const extra: string[] = [];
  if (s.tempo) extra.push(`tempo ${s.tempo}`);
  if (s.assist && s.assist !== 'none') extra.push(s.assist);
  if (s.rpe) extra.push(`RPE ${s.rpe}`);
  if (Array.isArray(s.dropSteps) && s.dropSteps.length) {
    const steps = s.dropSteps.map((d: any) => (d.assist && d.assist !== 'none') ? d.assist : (d.load != null ? `${d.value ?? ''}×${W(d.load, u)}` : `${d.value ?? ''}`));
    extra.push(`drop: ${steps.join(' → ')}`);
  }
  const suffix = extra.length ? ` (${extra.join(', ')})` : '';

  const isHold = s.type === 'hold' || s.measure === 'time' || s.durationSeconds != null;
  if (s.measure === 'distance' || s.distanceMeters != null) {
    return `${dist(s.distanceMeters || 0)}${s.weight ? ` +${W(s.weight, u)}` : ''}${suffix}`;
  }
  if (isHold) {
    const base = s.toFailure ? 'Max hold' : secs(s.durationSeconds || 0);
    return `${base}${s.weight ? ` +${W(s.weight, u)}` : ''}${suffix}`;
  }
  if (s.toFailure) return `Max reps${s.weight ? ` +${W(s.weight, u)}` : ''}${suffix}`;
  if (s.reps == null && s.weight != null) return `${W(s.weight, u)}${suffix}`; // weight-only target
  const reps = s.reps != null ? `${s.reps}` : '—';
  return `${reps}${s.weight ? ` × ${W(s.weight, u)}` : ' reps'}${suffix}`;
}

// one combo component → "2 × Muscle-up", "10s Chin-Over-Bar Hold +10kg"
function compLabel(c: any, u: WeightUnit): string {
  const w = c.weight ? ` +${W(c.weight, u)}` : '';
  if (c.setType === 'hold' || c.durationSeconds != null) return `${c.durationSeconds != null ? secs(c.durationSeconds) + ' ' : 'Max hold '}${c.name}${w}`;
  return `${c.reps != null ? c.reps + ' × ' : ''}${c.name}${w}`;
}

export interface SummaryBlock { title: string; sub?: string; lines: string[]; added?: boolean }

const withAdded = (b: SummaryBlock, e: any): SummaryBlock => (e.addedByUser ? { ...b, added: true, sub: b.sub ? `${b.sub} · added` : 'added' } : b);

// Full detail: one titled block per exercise, one line per set/component.
export function workoutSummary(exercises: any[], u: WeightUnit): SummaryBlock[] {
  return (exercises || []).map((e) => withAdded(summarizeOne(e, u), e));
}

function summarizeOne(e: any, u: WeightUnit): SummaryBlock {
  {
    if (e.kind === 'intervals' && e.intervals) {
      const iv = e.intervals;
      const work = iv.work?.measure === 'distance' ? dist(iv.work.distanceMeters || 0) : secs(iv.work?.durationSeconds || 0);
      const lines = [`Work: ${work}${iv.work?.pace ? ` @ ${iv.work.pace}` : ''}`];
      if (iv.recovery) {
        const rec = iv.recovery.measure === 'distance' ? dist(iv.recovery.distanceMeters || 0) : secs(iv.recovery.durationSeconds || 0);
        lines.push(`Recovery: ${rec}${iv.recovery.kind ? ` ${iv.recovery.kind}` : ''}`);
      }
      lines.push(`Rounds: ${iv.rounds}`);
      return { title: e.name, sub: 'Interval', lines };
    }
    if (e.kind === 'combo' || e.combo) {
      const mode = e.mode || 'circuit';
      const sub = mode === 'amrap' ? `AMRAP · ${secs(e.timeCapSeconds || 0)} cap`
        : mode === 'emom' ? `EMOM · ${e.comboRounds || 1} min`
        : `${mode} · ${e.comboRounds || 1} round${(e.comboRounds || 1) > 1 ? 's' : ''}${e.unbroken ? ' · unbroken' : ''}`;
      return { title: e.name, sub, lines: (e.components || []).map((c: any) => compLabel(c, u)) };
    }
    const sets = e.sets || [];
    return { title: e.name, sub: e.muscleGroup, lines: sets.map((s: any, i: number) => `Set ${i + 1}: ${setLabel(s, u)}`) };
  }
}

// Compact: one line per exercise, for the weekly-plan bullet list.
export function workoutPlanLines(exercises: any[], u: WeightUnit): string[] {
  return (exercises || []).map((e) => {
    if (e.kind === 'intervals' && e.intervals) {
      const iv = e.intervals;
      const work = iv.work?.measure === 'distance' ? dist(iv.work.distanceMeters || 0) : secs(iv.work?.durationSeconds || 0);
      return `${e.name}: ${iv.rounds} × ${work}${iv.work?.pace ? ` @ ${iv.work.pace}` : ''}`;
    }
    if (e.kind === 'combo' || e.combo) {
      const n = (e.components || []).length;
      const mode = e.mode || 'circuit';
      return `${e.name} (${mode}, ${n} move${n === 1 ? '' : 's'})`;
    }
    const sets = e.sets || [];
    // collapse: if all reps equal → "3 × 10", else list "8/65, 8/60…"
    const brief = sets.map((s: any) => setLabel(s, u).replace(' reps', '')).join(', ');
    return `${e.name}: ${brief}`;
  });
}

// weekday index (0=Mon..6=Sun) → short label
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Which week of a running program is "now" — from startDate, else week 0.
export function currentWeekIndex(program: Program): number {
  if (!program.startDate) return 0;
  const start = new Date(program.startDate).getTime();
  if (Number.isNaN(start)) return 0;
  const wk = Math.floor((Date.now() - start) / (7 * 24 * 3600 * 1000));
  return Math.max(0, Math.min(program.weeks - 1, wk));
}

// Program → the weekly-plan shape the coach tab renders (name, days[]).
export function programToWeeklyPlan(program: Program, u: WeightUnit): { name: string; days: { day: string; focus: string; exercises: string[] }[] } {
  const wk = currentWeekIndex(program);
  const days = (program.days || []).filter((d: ProgramDay) => d.weekIndex === wk);
  const rows = WEEKDAYS.map((label, dayIdx) => {
    const d = days.find((x) => x.dayIndex === dayIdx);
    if (!d || (!d.restDay && !(d.exercises && d.exercises.length))) return null;
    if (d.restDay) return { day: label, focus: 'Rest', exercises: ['Recovery'] };
    return { day: label, focus: d.name || d.label || 'Workout', exercises: workoutPlanLines(d.exercises || [], u) };
  }).filter(Boolean) as { day: string; focus: string; exercises: string[] }[];
  return { name: program.name, days: rows };
}
