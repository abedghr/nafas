// Build a WorkoutLog from an ActiveSession — the same tally/mapping live-workout
// does on finish, factored out so a "review & mark done" flow (no live session)
// can produce an accurate log too.
import type { ActiveSession, LogExercise, LogSetData, SetConfig, WorkoutLog } from './app-context';

export function buildLog(
  session: Pick<ActiveSession, 'workoutName' | 'workoutType' | 'preWorkout' | 'exercises'>,
  opts: { userId: string; date: string; startTime: string; endTime: string; durationMinutes: number; aiInsight?: string },
): Omit<WorkoutLog, 'id'> {
  let totalVolumeKg = 0, totalSets = 0, completedSets = 0, skippedSets = 0, totalReps = 0;
  const tally = (status: string, type: string, reps: number, weight: number) => {
    totalSets++;
    if (status === 'done') completedSets++;
    if (status === 'skipped') skippedSets++;
    if (status === 'done' && type === 'reps') { totalVolumeKg += reps * weight; totalReps += reps; }
  };

  const logExercises: LogExercise[] = session.exercises.flatMap((ex) => {
    if (ex.combo && ex.components) {
      const comboId = ex.exerciseId;
      return ex.components.map((c, ci) => ({
        exerciseId: c.exerciseId,
        name: c.name,
        muscleGroup: c.muscleGroup,
        comboId,
        comboLabel: ex.name,
        comboUnbroken: !!ex.unbroken,
        sets: (ex.rounds || []).map((r) => {
          const raw = r.entries[ci];
          const cfg: SetConfig = raw ? { ...raw, type: raw.type || 'reps' } : { type: 'reps', reps: 0, weight: 0 };
          tally(r.status, cfg.type, cfg.reps || 0, cfg.weight || 0);
          return { type: cfg.type, planned: { ...cfg }, actual: { ...cfg }, status: r.status } as LogSetData;
        }),
      }));
    }
    return [{
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets.map((s) => {
        tally(s.status, s.actual.type, s.actual.reps || 0, s.actual.weight || 0);
        return { type: s.config.type, planned: s.config, actual: s.actual, status: s.status } as LogSetData;
      }),
    }];
  });

  return {
    userId: opts.userId,
    name: session.workoutName,
    workoutType: session.workoutType,
    date: opts.date,
    startTime: opts.startTime,
    endTime: opts.endTime,
    durationMinutes: opts.durationMinutes,
    preWorkout: session.preWorkout,
    totalVolumeKg,
    totalSets,
    completedSets,
    skippedSets,
    totalReps,
    exercises: logExercises,
    aiInsight: opts.aiInsight ?? '',
  };
}
