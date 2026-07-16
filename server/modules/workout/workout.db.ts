import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, pgEnum, jsonb, numeric, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";
import { ENUM_SYSTEM_BODY_TARGET } from "./seed-data/body-target.enum";

export const bodyTargetEnum = pgEnum(
  "body_target",
  Object.values(ENUM_SYSTEM_BODY_TARGET) as [string, ...string[]],
);
export const measurementType = pgEnum("measurement_type", ["reps", "time_hold", "distance_duration"]);

// ── Library (relational; system rows have userId null) ──────────────────────
export const workoutTypes = pgTable("workout_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 64 }).notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 96 }).notNull(),
  description: text("description").notNull().default(""),
  measurementType: measurementType("measurement_type").notNull().default("reps"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  nameIdx: index("ex_name_idx").on(t.name),
  userIdx: index("ex_user_idx").on(t.userId),
}));

// Content translations (base columns on exercises/workout_types = English default + fallback).
export const exerciseTranslations = pgTable("exercise_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
  description: text("description"),
}, (t) => ({
  uniq: uniqueIndex("ex_tr_uniq").on(t.exerciseId, t.locale),
}));

export const workoutTypeTranslations = pgTable("workout_type_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutTypeId: uuid("workout_type_id").notNull().references(() => workoutTypes.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
  description: text("description"),
}, (t) => ({
  uniq: uniqueIndex("wt_tr_uniq").on(t.workoutTypeId, t.locale),
}));

export const exerciseWorkoutTypes = pgTable(
  "exercise_workout_types",
  {
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    workoutTypeId: uuid("workout_type_id").notNull().references(() => workoutTypes.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.exerciseId, t.workoutTypeId] }),
    typeIdx: index("ewt_type_idx").on(t.workoutTypeId), // reverse lookup: exercises by type
  }),
);

export const exerciseBodyTargets = pgTable("exercise_body_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  bodyTarget: bodyTargetEnum("body_target").notNull(),
  percentage: integer("percentage").notNull(),
}, (t) => ({
  exIdx: index("ebt_ex_idx").on(t.exerciseId),
  uniq: uniqueIndex("ebt_ex_target_uniq").on(t.exerciseId, t.bodyTarget),
}));

// ── User documents (jsonb detail; columns for what we query/aggregate) ──────
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 96 }).notNull(),
  workoutTypeId: uuid("workout_type_id").references(() => workoutTypes.id),
  exercises: jsonb("exercises").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("wt_user_idx").on(t.userId),
}));

export const workoutLogs = pgTable("workout_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id"),
  name: varchar("name", { length: 96 }).notNull(),
  workoutTypeId: uuid("workout_type_id").references(() => workoutTypes.id),
  date: timestamp("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  preWorkout: boolean("pre_workout").notNull().default(false),
  totalVolumeKg: numeric("total_volume_kg").notNull().default("0"),
  totalSets: integer("total_sets").notNull().default(0),
  completedSets: integer("completed_sets").notNull().default(0),
  skippedSets: integer("skipped_sets").notNull().default(0),
  totalReps: integer("total_reps").notNull().default(0),
  aiInsight: text("ai_insight").notNull().default(""),
  exercises: jsonb("exercises").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userDateIdx: index("wl_user_date_idx").on(t.userId, t.date),   // history list (userId, date desc)
  userNameIdx: index("wl_user_name_idx").on(t.userId, t.name),   // progress-vs-previous (userId, name, date)
}));

// One resumable session per user.
export const activeSessions = pgTable("active_sessions", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
