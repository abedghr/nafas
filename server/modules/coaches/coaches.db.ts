import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";

type Money = { amount: number; currency: string };

// Session/PT interest requests. No payment (P8) — a LEAD: tells the coach to call the person.
export const sessionRequests = pgTable("session_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id"),                       // which PT plan they're interested in (loose ref)
  date: varchar("date", { length: 32 }),
  note: text("note"),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | contacted | closed
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  coachIdx: index("sr_coach_idx").on(t.coachId),
  clientIdx: index("sr_client_idx").on(t.clientId),
}));

// Coach PT plans — coach-managed (mobile self-service).
export const coachPlans = pgTable("coach_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  includes: jsonb("includes").$type<string[]>().notNull().default([]),
  duration: varchar("duration", { length: 64 }),    // e.g. "8 weeks", "1 month"
  price: jsonb("price").$type<Money | null>(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ coachIdx: index("cp_coach_idx").on(t.coachId) }));

// Coach before/after transformations — coach-managed.
export const coachTransformations = pgTable("coach_transformations", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  beforeImage: text("before_image"),
  afterImage: text("after_image"),
  duration: varchar("duration", { length: 64 }),
  target: varchar("target", { length: 96 }),         // goal: weight loss, muscle gain…
  clientName: varchar("client_name", { length: 96 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ coachIdx: index("ct_coach_idx").on(t.coachId) }));
