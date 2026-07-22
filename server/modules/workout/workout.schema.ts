import { z } from "zod";

export const SetConfigSchema = z
  .object({
    type: z.enum(["reps", "hold", "emom"]),
    reps: z.number().optional(),
    weight: z.number().optional(), // also used for weighted EMOM
    durationSeconds: z.number().optional(),
    repsPerInterval: z.number().optional(),
    intervalSeconds: z.number().optional(),
    totalIntervals: z.number().optional(),
    note: z.string().optional(), // optional per-set note
  })
  .openapi("SetConfig");

export const BodyTargetInputSchema = z.object({
  bodyTarget: z.string(),
  percentage: z.number().int().min(0).max(100),
});

export const AdminExerciseInputSchema = z
  .object({
    name: z.string().min(1), // English (base/default)
    description: z.string().default(""),
    measurementType: z.enum(["reps", "time_hold", "distance_duration"]).default("reps"),
    bodyTargets: z.array(BodyTargetInputSchema).optional(),
    workoutTypeIds: z.array(z.string().uuid()).optional(),
    // other-locale overrides, e.g. { ar: { name, description } }
    translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
  })
  .openapi("AdminExerciseInput");

export type AdminExerciseInput = z.infer<typeof AdminExerciseInputSchema>;

export const AdminWorkoutTypeInputSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
  })
  .openapi("AdminWorkoutTypeInput");
export type AdminWorkoutTypeInput = z.infer<typeof AdminWorkoutTypeInputSchema>;

export const TemplateExerciseSchema = z
  .object({
    exerciseId: z.string(),
    name: z.string(),
    muscleGroup: z.string().optional(),
    restSeconds: z.number().default(90),
    sets: z.array(SetConfigSchema),
    // combo plan (optional)
    combo: z.boolean().optional(),
    unbroken: z.boolean().optional(),
    components: z.array(z.object({ exerciseId: z.string(), name: z.string(), muscleGroup: z.string() })).optional(),
    comboRounds: z.number().optional(),
    comboReps: z.number().optional(),
  })
  .openapi("TemplateExercise");

export const TemplateCreateSchema = z
  .object({
    name: z.string().min(1),
    workoutTypeId: z.string().uuid().optional(),
    exercises: z.array(TemplateExerciseSchema),
  })
  .openapi("WorkoutTemplateCreate");

const LogSetSchema = z.object({
  type: z.enum(["reps", "hold", "emom"]),
  planned: SetConfigSchema,
  actual: SetConfigSchema,
  status: z.enum(["pending", "done", "skipped", "in_progress"]),
});
const LogExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  name: z.string(),
  muscleGroup: z.string().default(""),
  sets: z.array(LogSetSchema),
  // combo grouping (movements sharing comboId were one back-to-back combo set)
  comboId: z.string().optional(),
  comboLabel: z.string().optional(),
  comboUnbroken: z.boolean().optional(),
});

export const LogCreateSchema = z
  .object({
    templateId: z.string().uuid().optional(),
    name: z.string().min(1),
    workoutTypeId: z.string().uuid().optional(),
    date: z.string(), // ISO
    durationMinutes: z.number().default(0),
    preWorkout: z.boolean().default(false),
    totalVolumeKg: z.number().default(0),
    totalSets: z.number().default(0),
    completedSets: z.number().default(0),
    skippedSets: z.number().default(0),
    totalReps: z.number().default(0),
    aiInsight: z.string().default(""),
    exercises: z.array(LogExerciseSchema),
  })
  .openapi("WorkoutLogCreate");

export const ActiveSessionSchema = z.object({ data: z.any() }).openapi("ActiveSession");

export const ExerciseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    measurementType: z.enum(["reps", "time_hold", "distance_duration"]),
    isCustom: z.boolean(),
    workoutTypes: z.array(z.string()),
    bodyTargets: z.array(z.object({ bodyTarget: z.string(), percentage: z.number() })),
  })
  .openapi("Exercise");

export const WorkoutTypeSchema = z
  .object({ id: z.string(), name: z.string(), description: z.string() })
  .openapi("WorkoutType");

export type TemplateCreate = z.infer<typeof TemplateCreateSchema>;
export type LogCreate = z.infer<typeof LogCreateSchema>;
