// Maps an enrollment onto the calendar: which (week, day) is "today", what a
// weekday's workout is (after in-week swap overrides), each day's done/skipped
// status, and simple per-program stats. Pure.
import type { Program, ProgramDay, Enrollment, WorkoutLog } from './app-context';

const DAY = 24 * 3600 * 1000;
export const WEEKDAY_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// The program as an ordered sequence of days (Day 1, Day 2, …) — sorted by
// week then day. Position in the plan is by this ordinal, NOT by weekday: the
// start date is Day 1 and each following calendar day is the next day here.
export interface SeqDay { ordinal: number; weekIndex: number; dayIndex: number; day: ProgramDay }
export function programSequence(program: Program): SeqDay[] {
  return [...(program.days || [])]
    .sort((a, b) => a.weekIndex - b.weekIndex || a.dayIndex - b.dayIndex)
    .map((day, ordinal) => ({ ordinal, weekIndex: day.weekIndex, dayIndex: day.dayIndex, day }));
}
export function ordinalOf(program: Program, week: number, dayIndex: number): number {
  const f = programSequence(program).find((s) => s.weekIndex === week && s.dayIndex === dayIndex);
  return f ? f.ordinal : -1;
}
// Calendar date a given ordinal falls on for this enrollment.
export function dateForOrdinal(enr: Enrollment, ordinal: number): Date {
  return new Date(startOfDay(new Date(enr.startDate)).getTime() + ordinal * DAY);
}

export interface Position { ordinal: number; week: number; dayIndex: number; started: boolean; finishedPlan: boolean }

// Where "today" sits in the plan — sequential from the start date.
export function positionToday(enr: Enrollment, program: Program, now = new Date()): Position {
  const seq = programSequence(program);
  const anchor = startOfDay(new Date(enr.startDate)).getTime();
  const today = startOfDay(now).getTime();
  const daysSince = Math.floor((today - anchor) / DAY);
  const started = today >= anchor;
  const finishedPlan = seq.length > 0 && daysSince >= seq.length;
  const idx = Math.max(0, Math.min(Math.max(0, seq.length - 1), daysSince));
  const cell = seq[idx];
  return { ordinal: idx, week: cell?.weekIndex ?? 0, dayIndex: cell?.dayIndex ?? 0, started, finishedPlan };
}

// The source day (after in-week override swaps) that a weekday slot shows.
export function sourceDayIndex(enr: Enrollment, week: number, weekday: number): number {
  const wk = enr.overrides?.[String(week)];
  const mapped = wk?.[String(weekday)];
  return typeof mapped === 'number' ? mapped : weekday;
}

export function resolveDay(program: Program, enr: Enrollment, week: number, weekday: number): ProgramDay | null {
  const src = sourceDayIndex(enr, week, weekday);
  return (program.days || []).find((d) => d.weekIndex === week && d.dayIndex === src) ?? null;
}

export function dayStatus(enr: Enrollment, week: number, weekday: number): 'done' | 'skipped' | null {
  const c = enr.completions?.find((x) => x.weekIndex === week && x.dayIndex === weekday);
  return c ? c.status : null;
}

// Swap two weekdays within a week (writes override entries both ways).
export function swapDays(enr: Enrollment, week: number, a: number, b: number): Enrollment['overrides'] {
  const next = { ...(enr.overrides || {}) };
  const wk = { ...(next[String(week)] || {}) };
  const srcA = sourceDayIndex(enr, week, a);
  const srcB = sourceDayIndex(enr, week, b);
  wk[String(a)] = srcB;
  wk[String(b)] = srcA;
  // if a slot maps back to itself, drop the noise
  if (wk[String(a)] === a) delete wk[String(a)];
  if (wk[String(b)] === b) delete wk[String(b)];
  next[String(week)] = wk;
  return next;
}

export interface ProgramStats { done: number; skipped: number; planned: number; adherencePct: number; volumeKg: number; sessions: number; minutes: number }

// done/skipped counts, adherence (done of decided), and volume from linked logs.
export function programStats(enr: Enrollment, program: Program, logs: WorkoutLog[]): ProgramStats {
  let planned = 0;
  for (const d of program.days || []) {
    if (!d.restDay && ((d.exercises && d.exercises.length) || d.templateId)) planned++;
  }
  const done = enr.completions.filter((c) => c.status === 'done').length;
  const skipped = enr.completions.filter((c) => c.status === 'skipped').length;
  const decided = done + skipped;
  const adherencePct = decided ? Math.round((done / decided) * 100) : 0;
  const logIds = new Set(enr.completions.map((c) => c.logId).filter(Boolean) as string[]);
  let volumeKg = 0;
  let sessions = 0;
  const logById = new Map(logs.map((l) => [l.id, l]));
  for (const id of logIds) { const l = logById.get(id); if (l) { volumeKg += l.totalVolumeKg || 0; sessions++; } }
  // total minutes: prefer the completion's own durationMin; else the linked log's
  let minutes = 0;
  for (const c of enr.completions) {
    if (c.status !== 'done') continue;
    if (c.durationMin) minutes += c.durationMin;
    else if (c.logId && logById.get(c.logId)) minutes += logById.get(c.logId)!.durationMinutes || 0;
  }
  return { done, skipped, planned, adherencePct, volumeKg, sessions, minutes };
}
