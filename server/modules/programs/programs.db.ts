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
  weekIndex: integer("week_index").notNull(),   // 0-based
  dayIndex: integer("day_index").notNull(),      // 0=Mon .. 6=Sun
  restDay: boolean("rest_day").notNull().default(false),
  templateId: uuid("template_id"),
  // inline workout for this day (when not using a saved template): name + exercises
  // (same shape as a template's exercises). Either templateId OR exercises may be set.
  name: varchar("name", { length: 96 }).notNull().default(""),
  exercises: jsonb("exercises").$type<unknown[]>().notNull().default([]),
  label: varchar("label", { length: 96 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
}, (t) => ({
  progIdx: index("pday_prog_idx").on(t.programId),
  cellUniq: uniqueIndex("pday_cell_uniq").on(t.programId, t.weekIndex, t.dayIndex),
}));
