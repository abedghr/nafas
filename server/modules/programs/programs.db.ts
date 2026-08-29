import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";

// A multi-week training program (e.g. an 8-week plan). Days live in program_days.
export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 96 }).notNull(),
  startDate: timestamp("start_date"),
  weeks: integer("weeks").notNull().default(4),
  notes: text("notes").notNull().default(""),
  // per-week name/info: [{ index, name, notes }]
  weekMeta: jsonb("week_meta").$type<{ index: number; name: string; notes: string }[]>().notNull().default([]),
  // set on snapshot copies received via a share; null = an original the user authored.
  // Only originals (null) can be shared; snapshots cannot re-share.
  sourceOwnerId: uuid("source_owner_id"),
  // snapshot access window; null = unlimited. Past this, the copy is treated as expired.
  accessExpiresAt: timestamp("access_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("prog_user_idx").on(t.userId) }));

// A share offer: owner sends an original program to a specific user (toUserId) and/or
// via a redeemable code. On accept it is snapshot-copied into the recipient's programs.
export const programShares = pgTable("program_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").references(() => users.id, { onDelete: "cascade" }), // null = code-only share
  code: varchar("code", { length: 12 }), // null for a direct user share
  claimExpiresAt: timestamp("claim_expires_at"),   // null = unlimited
  accessExpiresAt: timestamp("access_expires_at"), // stamped onto the recipient's copy; null = unlimited
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending|accepted|declined|revoked|expired
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  acceptedProgramId: uuid("accepted_program_id"), // the recipient's snapshot copy (for revoke → expire it)
}, (t) => ({
  toIdx: index("pshare_to_idx").on(t.toUserId, t.status),
  fromIdx: index("pshare_from_idx").on(t.fromUserId),
  codeUniq: uniqueIndex("pshare_code_uniq").on(t.code),
}));

// One cell of the program grid: (week, weekday). Either a rest day, or points at a
// saved workout template. templateId is a soft ref (no FK) so deleting a template
// doesn't cascade-wipe program days — the day just shows "template removed".
export const programDays = pgTable("program_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  // Day 1..N position = weekIndex*7 + dayIndex (the sequence sorts by this).
  // Kept as two columns for back-compat with existing data.
  weekIndex: integer("week_index").notNull(),
  dayIndex: integer("day_index").notNull(),
  restDay: boolean("rest_day").notNull().default(false),
  templateId: uuid("template_id"),
  // LEGACY single-workout fields (kept for back-compat; new data lives in `sessions`).
  // Read via daySessions(): sessions[] if present, else a single session synthesized here.
  name: varchar("name", { length: 96 }).notNull().default(""),
  exercises: jsonb("exercises").$type<unknown[]>().notNull().default([]),
  // A day can hold 1+ sessions (e.g. morning run + evening calisthenics). Each session:
  // { id, label?, name, templateId?|exercises[] }. Empty = fall back to the legacy fields.
  sessions: jsonb("sessions").$type<unknown[]>().notNull().default([]),
  label: varchar("label", { length: 96 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
}, (t) => ({
  progIdx: index("pday_prog_idx").on(t.programId),
  cellUniq: uniqueIndex("pday_cell_uniq").on(t.programId, t.weekIndex, t.dayIndex),
}));

// A user "starting" a program for a period. Weeks/days map onto the calendar
// from startDate. One active enrollment per user at a time (service enforces).
export const programEnrollments = pgTable("program_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // nullable + SET NULL: deleting a program must NOT wipe finished runs from history.
  // The report then reads programSnapshot instead of the (gone) live program.
  programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
  startDate: timestamp("start_date").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | finished | abandoned
  // legacy weekday-swap map (unused since sequential/completion model)
  overrides: jsonb("overrides").$type<Record<string, Record<string, number>>>().notNull().default({}),
  // per-day deviations for THIS enrollment, keyed by program-day id:
  // { "<dayId>": { added: TemplateExercise[], removed: string[] } } — flagged edits.
  dayEdits: jsonb("day_edits").$type<Record<string, { added?: unknown[]; removed?: string[] }>>().notNull().default({}),
  // per-enrollment day order (from swaps): array of "<week>-<day>" keys
  dayOrder: jsonb("day_order").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  // cached AI narrative for the end-of-program report (generated on demand).
  // Stats/journey are derived client-side from completions; only this is stored.
  endReport: jsonb("end_report").$type<{ generatedAt: string; summary: string; highlights: string[]; suggestions: string[] } | null>(),
  // frozen copy of the program (name + days) taken when the run ends, so the
  // report/history survive the source program being edited or deleted.
  programSnapshot: jsonb("program_snapshot").$type<{ id?: string; name: string; weeks?: number; days: unknown[] } | null>(),
}, (t) => ({ userIdx: index("enroll_user_idx").on(t.userId, t.status) }));

// One (week, day) cell marked done or skipped within an enrollment. logId is a
// soft ref to the workout_log produced when the day was run.
export const programDayCompletions = pgTable("program_day_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id").notNull().references(() => programEnrollments.id, { onDelete: "cascade" }),
  weekIndex: integer("week_index").notNull(),
  dayIndex: integer("day_index").notNull(),
  sessionIndex: integer("session_index").notNull().default(0), // which session in the day (0 = the/only one)
  status: varchar("status", { length: 16 }).notNull(), // done | skipped
  completedDate: timestamp("completed_date"),
  durationMin: integer("duration_min"), // workout length in minutes (manual entry or from the log)
  logId: uuid("log_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  enrollIdx: index("pdc_enroll_idx").on(t.enrollmentId),
  cellUniq: uniqueIndex("pdc_cell_uniq").on(t.enrollmentId, t.weekIndex, t.dayIndex, t.sessionIndex),
}));
