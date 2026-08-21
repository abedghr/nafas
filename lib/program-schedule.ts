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
const key = (w: number, d: number) => `${w}-${d}`;

// Ordered day sequence. Default order is by (week,day); if an enrollment carries
// a dayOrder permutation (from swaps), that wins — unknown keys fall to the end.
export function programSequence(program: Program, enr?: Enrollment | null): SeqDay[] {
  const days = [...(program.days || [])].sort((a, b) => a.weekIndex - b.weekIndex || a.dayIndex - b.dayIndex);
  const order = enr?.dayOrder;
  if (order && order.length) {
    const rank = new Map(order.map((k, i) => [k, i]));
    days.sort((a, b) => {
      const ra = rank.has(key(a.weekIndex, a.dayIndex)) ? rank.get(key(a.weekIndex, a.dayIndex))! : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(key(b.weekIndex, b.dayIndex)) ? rank.get(key(b.weekIndex, b.dayIndex))! : Number.MAX_SAFE_INTEGER;
      return ra - rb || (a.weekIndex - b.weekIndex) || (a.dayIndex - b.dayIndex);
    });
  }
  return days.map((day, ordinal) => ({ ordinal, weekIndex: day.weekIndex, dayIndex: day.dayIndex, day }));
}

// Swap two positions in the enrollment's day order; returns the new order array
// (full list of "w-d" keys) to persist.
export function swapDayOrder(enr: Enrollment, program: Program, ordinalA: number, ordinalB: number): string[] {
  const seq = programSequence(program, enr);
  const keys = seq.map((s) => key(s.weekIndex, s.dayIndex));
  if (ordinalA < 0 || ordinalB < 0 || ordinalA >= keys.length || ordinalB >= keys.length) return keys;
  [keys[ordinalA], keys[ordinalB]] = [keys[ordinalB], keys[ordinalA]];
  return keys;
}
export function ordinalOf(program: Program, week: number, dayIndex: number, enr?: Enrollment | null): number {
  const f = programSequence(program, enr).find((s) => s.weekIndex === week && s.dayIndex === dayIndex);
  return f ? f.ordinal : -1;
}
// Calendar date a given ordinal falls on for this enrollment.
export function dateForOrdinal(enr: Enrollment, ordinal: number): Date {
  return new Date(startOfDay(new Date(enr.startDate)).getTime() + ordinal * DAY);
}

export interface Position { ordinal: number; week: number; dayIndex: number; started: boolean; finishedPlan: boolean }

const cellKey = (week: number, day: number) => `${week}-${day}`;

export function dayStatus(enr: Enrollment, week: number, day: number): 'done' | 'skipped' | 'rest' | null {
  const c = enr.completions?.find((x) => x.weekIndex === week && x.dayIndex === day);
  return c ? c.status : null;
}

// Current day = first day in the sequence with no status yet (completion-based,
// NOT calendar). finishedPlan when every day is done/skipped/rested.
export function positionToday(enr: Enrollment, program: Program): Position {
  const seq = programSequence(program, enr);
  const idx = seq.findIndex((s) => !dayStatus(enr, s.weekIndex, s.dayIndex));
  const finishedPlan = idx === -1 && seq.length > 0;
  const ordinal = idx === -1 ? Math.max(0, seq.length - 1) : idx;
  const cell = seq[ordinal];
  return { ordinal, week: cell?.weekIndex ?? 0, dayIndex: cell?.dayIndex ?? 0, started: true, finishedPlan };
}

export interface Progress { done: number; skipped: number; rest: number; decided: number; total: number; pct: number }
export function programProgress(enr: Enrollment, program: Program): Progress {
  const total = programSequence(program).length;
  const done = enr.completions.filter((c) => c.status === 'done').length;
  const skipped = enr.completions.filter((c) => c.status === 'skipped').length;
  const rest = enr.completions.filter((c) => c.status === 'rest').length;
  const decided = done + skipped + rest;
  return { done, skipped, rest, decided, total, pct: total ? decided / total : 0 };
}

// Merge a day's template exercises with this enrollment's flagged edits:
// drop removed ids, append added (each tagged addedByUser).
export function resolveDayExercises(enr: Enrollment | null, week: number, day: number, base: any[]): any[] {
  const edit = enr?.dayEdits?.[cellKey(week, day)];
  if (!edit) return base || [];
  const removed = new Set(edit.removed || []);
  const kept = (base || []).filter((e) => !removed.has(e.exerciseId));
  const added = (edit.added || []).map((e: any) => ({ ...e, addedByUser: true }));
  return [...kept, ...added];
}

export interface ProgramStats { done: number; skipped: number; rest: number; planned: number; adherencePct: number; volumeKg: number; sessions: number; minutes: number }

// counts, adherence (done of done+skipped; rest is neutral), volume + time from linked logs.
export function programStats(enr: Enrollment, program: Program, logs: WorkoutLog[]): ProgramStats {
  let planned = 0;
  for (const d of program.days || []) {
    if (!d.restDay && ((d.exercises && d.exercises.length) || d.templateId)) planned++;
  }
  const done = enr.completions.filter((c) => c.status === 'done').length;
  const skipped = enr.completions.filter((c) => c.status === 'skipped').length;
  const rest = enr.completions.filter((c) => c.status === 'rest').length;
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
  return { done, skipped, rest, planned, adherencePct, volumeKg, sessions, minutes };
}
