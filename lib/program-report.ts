// End-of-program report engine. Pure: derives the full journey + performance
// stats from an enrollment's completions and the user's logs. Nothing here is
// stored server-side except the optional AI narrative (Enrollment.endReport).
import type { Program, Enrollment, WorkoutLog } from './app-context';
import { programSequence, dateForOrdinal } from './program-schedule';
import { daySessions } from './program-sessions';

export type SessionOutcome = 'done' | 'skipped' | 'substituted' | 'pending';
export type DayAgg = 'done' | 'skipped' | 'partial' | 'substituted' | 'rest' | 'pending';

export interface JourneySession {
  index: number;
  name: string;
  outcome: SessionOutcome;
  date: string | null;        // ISO of when it was actually done (log/completion date)
  onTime: boolean;            // completed on its scheduled calendar day
  logId: string | null;
  durationMin: number | null;
  volumeKg: number;
}
export interface JourneyDay {
  ordinal: number;            // Day N (1-based label = ordinal+1)
  week: number;
  day: number;
  scheduledDate: string;      // ISO scheduled calendar date
  restDay: boolean;
  name: string;
  sessions: JourneySession[];
  agg: DayAgg;
}
export interface WeekBucket { week: number; done: number; skipped: number; substituted: number; planned: number; rate: number }
export interface WeekdayBucket { weekday: number; done: number; planned: number }   // weekday 0=Sun..6=Sat

export interface ProgramReport {
  enrollmentId: string;
  programId: string;
  programName: string;
  status: Enrollment['status'];
  completed: boolean;                 // every day decided
  startDate: string;                  // ISO
  endDate: string;                    // ISO (finishedAt, else last activity, else now)
  durationDays: number;               // calendar span start→end (min 1)
  plannedSessions: number;
  done: number;
  skipped: number;                    // pure skips (no substitute)
  substituted: number;                // skipped-but-trained-something-else
  rest: number;                       // rest days taken
  pending: number;                    // never decided (early end)
  completionRate: number;             // (done+substituted)/planned  [0..1]
  adherenceRate: number;              // done/(done+skipped+substituted)  [0..1], rest neutral
  onTimeRate: number;                 // on-schedule / completed  [0..1]
  longestStreak: number;              // longest run of trained days (rest bridges, skip breaks)
  totalVolumeKg: number;
  totalMinutes: number;
  byWeek: WeekBucket[];
  byWeekday: WeekdayBucket[];
  activePeak: { week: number; rate: number } | null;   // strongest week
  weakSpot: { week: number; rate: number } | null;     // weakest week (some plan, low rate)
  journey: JourneyDay[];
}

const DAY = 24 * 3600 * 1000;
const iso = (d: Date) => d.toISOString();
// local-calendar day index (tz-consistent for both equality and span math).
const dayNum = (isoStr: string) => { const d = new Date(isoStr); return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY); };
const sameDay = (a: string, b: string) => dayNum(a) === dayNum(b);

function logById(logs: WorkoutLog[]): Map<string, WorkoutLog> {
  const m = new Map<string, WorkoutLog>();
  for (const l of logs) m.set(l.id, l);
  return m;
}

// Build the ordered per-day journey. Rest days become a single synthetic
// "rest" pseudo-session for uniform rendering; work days expand daySessions().
export function buildJourney(enr: Enrollment, program: Program, logs: WorkoutLog[]): JourneyDay[] {
  const seq = programSequence(program, enr);
  const byId = logById(logs);
  return seq.map((sd) => {
    const scheduled = dateForOrdinal(enr, sd.ordinal);
    const scheduledIso = iso(scheduled);
    if (sd.day.restDay) {
      const rested = enr.completions?.some((c) => c.weekIndex === sd.weekIndex && c.dayIndex === sd.dayIndex && c.status === 'rest');
      return { ordinal: sd.ordinal, week: sd.weekIndex, day: sd.dayIndex, scheduledDate: scheduledIso, restDay: true, name: '', sessions: [], agg: (rested ? 'rest' : 'pending') as DayAgg };
    }
    const sess = daySessions(sd.day);
    const sessions: JourneySession[] = sess.map((s, i) => {
      const c = enr.completions?.find((x) => x.weekIndex === sd.weekIndex && x.dayIndex === sd.dayIndex && (x.sessionIndex ?? 0) === i);
      const log = c?.logId ? byId.get(c.logId) : undefined;
      const date = c?.completedDate || log?.date || null;
      let outcome: SessionOutcome = 'pending';
      if (c?.status === 'done') outcome = 'done';
      else if (c?.status === 'skipped') outcome = c.logId ? 'substituted' : 'skipped';
      return {
        index: i,
        name: s.name || s.label || `Session ${i + 1}`,
        outcome,
        date,
        onTime: !!date && sameDay(date, scheduledIso),
        logId: c?.logId ?? null,
        durationMin: c?.durationMin ?? log?.durationMinutes ?? null,
        volumeKg: log?.totalVolumeKg ?? 0,
      };
    });
    return { ordinal: sd.ordinal, week: sd.weekIndex, day: sd.dayIndex, scheduledDate: scheduledIso, restDay: false, name: sd.day.name || sd.day.label || '', sessions, agg: aggOf(sessions) };
  });
}

function aggOf(sessions: JourneySession[]): DayAgg {
  if (!sessions.length) return 'pending';
  let done = 0, skip = 0, sub = 0, pend = 0;
  for (const s of sessions) { if (s.outcome === 'done') done++; else if (s.outcome === 'substituted') sub++; else if (s.outcome === 'skipped') skip++; else pend++; }
  if (pend > 0 && done + skip + sub === 0) return 'pending';
  if (pend > 0) return 'partial';
  if (done > 0 && skip === 0 && sub === 0) return 'done';
  if (sub > 0 && done === 0 && skip === 0) return 'substituted';
  if (skip > 0 && done === 0 && sub === 0) return 'skipped';
  return 'partial';
}

export function buildReport(enr: Enrollment, program: Program, logs: WorkoutLog[]): ProgramReport {
  const journey = buildJourney(enr, program, logs);
  let done = 0, skipped = 0, substituted = 0, rest = 0, pending = 0, planned = 0;
  let totalVolumeKg = 0, totalMinutes = 0, onTime = 0, completedCnt = 0;
  const weekMap = new Map<number, WeekBucket>();
  const wdMap = new Map<number, WeekdayBucket>();
  let lastActivity = '';

  for (const jd of journey) {
    const wd = new Date(jd.scheduledDate).getDay();
    if (jd.restDay) { if (jd.agg === 'rest') rest++; continue; }
    const wk = weekMap.get(jd.week) || { week: jd.week, done: 0, skipped: 0, substituted: 0, planned: 0, rate: 0 };
    const wdb = wdMap.get(wd) || { weekday: wd, done: 0, planned: 0 };
    for (const s of jd.sessions) {
      planned++; wk.planned++; wdb.planned++;
      if (s.outcome === 'done') { done++; wk.done++; wdb.done++; }
      else if (s.outcome === 'substituted') { substituted++; wk.substituted++; }
      else if (s.outcome === 'skipped') { skipped++; wk.skipped++; }
      else pending++;
      if (s.outcome === 'done' || s.outcome === 'substituted') {
        completedCnt++;
        if (s.onTime) onTime++;
        totalVolumeKg += s.volumeKg;
        totalMinutes += s.durationMin || 0;
        if (s.date && (!lastActivity || dayNum(s.date) > dayNum(lastActivity))) lastActivity = s.date;
      }
    }
    weekMap.set(jd.week, wk);
    wdMap.set(wd, wdb);
  }

  const byWeek = [...weekMap.values()].sort((a, b) => a.week - b.week);
  for (const w of byWeek) w.rate = w.planned ? (w.done + w.substituted) / w.planned : 0;
  const byWeekday = [...wdMap.values()].sort((a, b) => a.weekday - b.weekday);

  const decidedWeeks = byWeek.filter((w) => w.planned > 0);
  const activePeak = decidedWeeks.length ? decidedWeeks.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const weakSpot = decidedWeeks.length ? decidedWeeks.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;

  const startDate = enr.startDate;
  const endDate = enr.finishedAt || lastActivity || iso(new Date());
  const durationDays = Math.max(1, Math.round((dayNum(endDate) - dayNum(startDate)) + 1));
  const completed = journey.every((jd) => jd.agg !== 'pending' && jd.agg !== 'partial');

  return {
    enrollmentId: enr.id,
    programId: program.id,
    programName: program.name,
    status: enr.status,
    completed,
    startDate,
    endDate,
    durationDays,
    plannedSessions: planned,
    done, skipped, substituted, rest, pending,
    completionRate: planned ? (done + substituted) / planned : 0,
    adherenceRate: (done + skipped + substituted) ? done / (done + skipped + substituted) : 0,
    onTimeRate: completedCnt ? onTime / completedCnt : 0,
    longestStreak: longestStreak(journey),
    totalVolumeKg: Math.round(totalVolumeKg),
    totalMinutes,
    byWeek, byWeekday,
    activePeak: activePeak ? { week: activePeak.week, rate: activePeak.rate } : null,
    weakSpot: weakSpot ? { week: weakSpot.week, rate: weakSpot.rate } : null,
    journey,
  };
}

// longest run of trained days; a rest day bridges (neither breaks nor extends),
// a skip or pending day breaks the streak.
function longestStreak(journey: JourneyDay[]): number {
  let cur = 0, max = 0;
  for (const jd of journey) {
    if (jd.restDay) { if (jd.agg === 'rest') continue; cur = 0; continue; }
    if (jd.agg === 'done' || jd.agg === 'substituted') { cur++; if (cur > max) max = cur; }
    else cur = 0;
  }
  return max;
}

export interface RunComparison {
  current: ProgramReport;
  previous: ProgramReport | null;     // most recent earlier run of the same program
  totalRuns: number;
  rankByCompletion: number;           // 1 = best among all runs
  deltaCompletion: number | null;     // current − previous
  deltaAdherence: number | null;
  deltaVolume: number | null;
}

// Compare one run against the user's other finished runs of the same program.
// `others` should be reports for the SAME programId (current excluded or not — filtered by id).
export function compareRuns(current: ProgramReport, others: ProgramReport[]): RunComparison {
  const runs = others.filter((r) => r.programId === current.programId && r.enrollmentId !== current.enrollmentId);
  const earlier = runs
    .filter((r) => dayNum(r.startDate) < dayNum(current.startDate))
    .sort((a, b) => dayNum(b.startDate) - dayNum(a.startDate));
  const previous = earlier[0] || null;
  const all = [current, ...runs].sort((a, b) => b.completionRate - a.completionRate);
  const rankByCompletion = all.findIndex((r) => r.enrollmentId === current.enrollmentId) + 1;
  return {
    current,
    previous,
    totalRuns: runs.length + 1,
    rankByCompletion,
    deltaCompletion: previous ? current.completionRate - previous.completionRate : null,
    deltaAdherence: previous ? current.adherenceRate - previous.adherenceRate : null,
    deltaVolume: previous ? current.totalVolumeKg - previous.totalVolumeKg : null,
  };
}

// Compact, numbers-only context sent to the server AI. Weekdays are named and
// weeks/ordinals are 1-based for the model's benefit.
const WD_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const r2 = (x: number) => Math.round(x * 100) / 100;
export function reportContext(r: ProgramReport, cmp: RunComparison | null, language: string): Record<string, unknown> {
  const notable = (pred: (j: JourneyDay) => boolean) =>
    r.journey.filter(pred).slice(0, 8).map((j) => ({ day: j.ordinal + 1, name: j.name || '', date: j.scheduledDate.slice(0, 10) }));
  return {
    language,
    programName: r.programName,
    status: r.status,
    completed: r.completed,
    durationDays: r.durationDays,
    plannedSessions: r.plannedSessions,
    done: r.done, skipped: r.skipped, substituted: r.substituted, rest: r.rest, pending: r.pending,
    completionRate: r2(r.completionRate),
    adherenceRate: r2(r.adherenceRate),
    onTimeRate: r2(r.onTimeRate),
    longestStreak: r.longestStreak,
    totalVolumeKg: r.totalVolumeKg,
    totalMinutes: r.totalMinutes,
    byWeek: r.byWeek.map((w) => ({ week: w.week + 1, rate: r2(w.rate) })),
    byWeekday: r.byWeekday.filter((d) => d.planned > 0).map((d) => ({ weekday: WD_NAMES[d.weekday], done: d.done, planned: d.planned })),
    activePeak: r.activePeak ? { week: r.activePeak.week + 1, rate: r2(r.activePeak.rate) } : null,
    weakSpot: r.weakSpot ? { week: r.weakSpot.week + 1, rate: r2(r.weakSpot.rate) } : null,
    skippedDays: notable((j) => j.agg === 'skipped'),
    swappedDays: notable((j) => j.agg === 'substituted'),
    vsPrevious: cmp?.previous
      ? { deltaCompletion: cmp.deltaCompletion != null ? r2(cmp.deltaCompletion) : null, deltaAdherence: cmp.deltaAdherence != null ? r2(cmp.deltaAdherence) : null, deltaVolume: cmp.deltaVolume, rank: cmp.rankByCompletion, totalRuns: cmp.totalRuns }
      : null,
  };
}

// ── history insights: aggregate stats over a set of finished runs ───────────
export interface HistoryInsights {
  runs: number;
  completedRuns: number;
  endedEarly: number;
  avgCompletion: number;      // mean completionRate [0..1]
  totalDone: number;          // done + substituted sessions
  totalVolumeKg: number;
  totalMinutes: number;
  bestProgram: { name: string; avgCompletion: number; runs: number } | null;
  strongest: { label: string; key: string; avgCompletion: number } | null;  // best month
  weakest: { label: string; key: string; avgCompletion: number } | null;     // worst month
  byMonth: { key: string; label: string; avgCompletion: number; runs: number }[]; // chronological
  trend: { date: string; completion: number; completed: boolean; name: string }[]; // per run, chronological
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthKey = (isoStr: string) => { const d = new Date(isoStr); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (isoStr: string) => { const d = new Date(isoStr); return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function aggregateReports(reports: ProgramReport[]): HistoryInsights {
  const runs = reports.length;
  const completedRuns = reports.filter((r) => r.status === 'finished').length;
  const avgCompletion = mean(reports.map((r) => r.completionRate));

  // best program = highest average completion across its runs (tie → more runs)
  const byName = new Map<string, number[]>();
  for (const r of reports) { const a = byName.get(r.programName) || []; a.push(r.completionRate); byName.set(r.programName, a); }
  let bestProgram: HistoryInsights['bestProgram'] = null;
  for (const [name, rates] of byName) {
    const avg = mean(rates);
    if (!bestProgram || avg > bestProgram.avgCompletion || (avg === bestProgram.avgCompletion && rates.length > bestProgram.runs)) {
      bestProgram = { name, avgCompletion: avg, runs: rates.length };
    }
  }

  // per-calendar-month averages (keyed on each run's end date)
  const monthMap = new Map<string, { label: string; rates: number[] }>();
  for (const r of reports) { const k = monthKey(r.endDate); const m = monthMap.get(k) || { label: monthLabel(r.endDate), rates: [] }; m.rates.push(r.completionRate); monthMap.set(k, m); }
  const byMonth = [...monthMap.entries()].map(([key, m]) => ({ key, label: m.label, avgCompletion: mean(m.rates), runs: m.rates.length })).sort((a, b) => a.key.localeCompare(b.key));
  const strongest = byMonth.length ? byMonth.reduce((a, b) => (b.avgCompletion > a.avgCompletion ? b : a)) : null;
  const weakest = byMonth.length ? byMonth.reduce((a, b) => (b.avgCompletion < a.avgCompletion ? b : a)) : null;

  const trend = [...reports]
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .map((r) => ({ date: r.endDate, completion: r.completionRate, completed: r.status === 'finished', name: r.programName }));

  return {
    runs,
    completedRuns,
    endedEarly: runs - completedRuns,
    avgCompletion,
    totalDone: reports.reduce((s, r) => s + r.done + r.substituted, 0),
    totalVolumeKg: reports.reduce((s, r) => s + r.totalVolumeKg, 0),
    totalMinutes: reports.reduce((s, r) => s + r.totalMinutes, 0),
    bestProgram,
    strongest: strongest ? { label: strongest.label, key: strongest.key, avgCompletion: strongest.avgCompletion } : null,
    weakest: weakest ? { label: weakest.label, key: weakest.key, avgCompletion: weakest.avgCompletion } : null,
    byMonth,
    trend,
  };
}

// A letter grade from the completion rate — used by the report hero.
export function gradeOf(rate: number): string {
  if (rate >= 0.95) return 'A+';
  if (rate >= 0.85) return 'A';
  if (rate >= 0.75) return 'B';
  if (rate >= 0.6) return 'C';
  if (rate >= 0.4) return 'D';
  return 'E';
}
