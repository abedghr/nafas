// Maps an enrollment onto the calendar: which (week, day) is "today", what a
// weekday's workout is (after in-week swap overrides), each day's done/skipped
// status, and simple per-program stats. Pure.
import type { Program, ProgramDay, Enrollment, WorkoutLog } from './app-context';

const DAY = 24 * 3600 * 1000;
export const WEEKDAY_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;

// JS Sun=0..Sat=6 → our Mon=0..Sun=6
const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Monday (00:00) on or before the start date — the anchor for "week 1, day 0".
function anchorMonday(startDate: string): number {
  const s = startOfDay(new Date(startDate));
  return s.getTime() - weekdayOf(s) * DAY;
}

export interface Position { week: number; dayIndex: number; started: boolean; finishedPlan: boolean }

// Where "today" sits in the plan.
export function positionToday(enr: Enrollment, program: Program, now = new Date()): Position {
  const anchor = anchorMonday(enr.startDate);
  const today = startOfDay(now).getTime();
  const daysSince = Math.floor((today - anchor) / DAY);
  const started = today >= startOfDay(new Date(enr.startDate)).getTime();
  let week = Math.floor(daysSince / 7);
  const dayIndex = ((daysSince % 7) + 7) % 7;
  const finishedPlan = week >= program.weeks;
  if (week < 0) week = 0;
  if (week > program.weeks - 1) week = program.weeks - 1;
  return { week, dayIndex, started, finishedPlan };
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

export interface StripCell { weekday: number; day: ProgramDay | null; status: 'done' | 'skipped' | null; isToday: boolean; planned: boolean }

export function weekStrip(enr: Enrollment, program: Program, week: number, now = new Date()): StripCell[] {
  const pos = positionToday(enr, program, now);
  return WEEKDAY_KEYS.map((_, weekday) => {
    const day = resolveDay(program, enr, week, weekday);
    const planned = !!day && (!!day.restDay || !!(day.exercises && day.exercises.length) || !!day.templateId);
    return { weekday, day, status: dayStatus(enr, week, weekday), isToday: week === pos.week && weekday === pos.dayIndex && pos.started && !pos.finishedPlan, planned };
  });
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
