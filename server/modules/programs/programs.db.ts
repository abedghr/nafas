import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";

// A multi-week training program (e.g. an 8-week plan). Days live in program_days.
export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 96 }).notNull(),
  startDate: timestamp("start_date"),
  weeks: integer("weeks").notNull().default(4),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("prog_user_idx").on(t.userId) }));

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
  label: varchar("label", { length: 96 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
}, (t) => ({
  progIdx: index("pday_prog_idx").on(t.programId),
  cellUniq: uniqueIndex("pday_cell_uniq").on(t.programId, t.weekIndex, t.dayIndex),
}));
