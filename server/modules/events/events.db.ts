import {
  pgTable, uuid, varchar, text, doublePrecision, integer, boolean, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { countries } from "../countries/countries.db";
import { users } from "../identity/identity.db";

// Tournaments / events / challenges. Register = interest (no payment) → organizer confirms.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }), // organizer
  gymId: uuid("gym_id"),                                                          // host gym (loose ref — no cycle)
  type: varchar("type", { length: 16 }).notNull().default("tournament"), // tournament | event | challenge
  category: varchar("category", { length: 48 }),                          // e.g. crossfit, running, bodybuilding
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  venue: text("venue").notNull().default(""),
  city: text("city"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  capacity: integer("capacity").notNull().default(0), // 0 = unlimited
  registeredCount: integer("registered_count").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("upcoming"), // upcoming | ongoing | completed | cancelled
  isActive: boolean("is_active").notNull().default(true),
  // ── entry pricing (cash-at-door, no in-app payment until P8) ──────────────
  isFree: boolean("is_free").notNull().default(true),
  currency: varchar("currency", { length: 3 }),                                    // e.g. JOD (falls back to country currency)
  priceTiers: jsonb("price_tiers").$type<{ label: string; amount: number }[]>().notNull().default([]), // e.g. [{label:"Standard",amount:10},{label:"Member",amount:5}]
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  countryIdx: index("event_country_idx").on(t.countryId),
  startsIdx: index("event_starts_idx").on(t.startsAt),
}));

export const eventTranslations = pgTable("event_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
  description: text("description"),
  venue: text("venue"),
}, (t) => ({ uniq: uniqueIndex("event_tr_uniq").on(t.eventId, t.locale) }));

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | confirmed | rejected | cancelled (approval — fills capacity, ≠ access)
  note: text("note"),
  addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }), // set when a manager walk-in-registers someone at the door
  // ── payment (manual cash-at-door tracking; access gated by `paid` for paid events) ──
  paid: boolean("paid").notNull().default(false),
  tierLabel: varchar("tier_label", { length: 48 }),                                    // which price tier was applied
  amountPaid: doublePrecision("amount_paid"),                                          // actual cash collected
  paidAt: timestamp("paid_at"),
  paidBy: uuid("paid_by").references(() => users.id, { onDelete: "set null" }),         // manager who recorded payment
  paymentHistory: jsonb("payment_history").$type<{ at: string; by: string | null; byName?: string; amount: number | null; tierLabel: string | null; action: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  eventIdx: index("ereg_event_idx").on(t.eventId),
  userIdx: index("ereg_user_idx").on(t.userId),
  uniq: uniqueIndex("ereg_user_event_uniq").on(t.userId, t.eventId),
}));

export type Event = typeof events.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
