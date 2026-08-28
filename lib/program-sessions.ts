import type { ProgramDay, TemplateExercise } from '@/lib/app-context';

// One session within a program day (e.g. morning run, evening calisthenics).
// A day holds an ordered list of these. Legacy days (single workout) have none;
// daySessions() synthesizes one from the day's legacy fields so old data reads clean.
export interface Session {
  id: string;
  label?: string;                 // "Morning" / "Evening" / free
  name?: string;                  // workout name (training type)
  templateId?: string | null;
  exercises?: TemplateExercise[];
}

// canonical read: the sessions of a day, back-compat with pre-sessions data.
export function daySessions(day: ProgramDay | any): Session[] {
  if (!day) return [];
  const list = (day.sessions as Session[] | undefined);
  if (list && list.length) return list;
  if (day.restDay) return [];
  // legacy single-workout day → exactly one session
  const hasWork = (day.exercises?.length ?? 0) > 0 || !!day.templateId;
  if (!hasWork) return [];
  return [{
    id: day.id ? `${day.id}-s0` : 's0',
    label: day.label || '',
    name: day.name || day.label || '',
    templateId: day.templateId ?? null,
    exercises: day.exercises ?? [],
  }];
}

// does a day have any real (non-rest, non-empty) session?
export function dayHasWork(day: ProgramDay | any): boolean {
  return !day?.restDay && daySessions(day).length > 0;
}

// number of sessions a day contributes to the plan total (rest = 0, else >=1)
export function sessionCount(day: ProgramDay | any): number {
  return day?.restDay ? 0 : daySessions(day).length;
}
