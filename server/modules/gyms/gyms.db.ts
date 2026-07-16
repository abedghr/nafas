import {
  pgTable, uuid, varchar, text, doublePrecision, integer, boolean, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { countries } from "../countries/countries.db";
import { users } from "../identity/identity.db";

// Money = { amount, currency } — never hardcode a currency (per-country).
type Money = { amount: number; currency: string };
type Subscription = { name: string; price: Money };
type GymClass = { name: string; time: string; duration: string; coach?: string };
type DaySchedule = { day: string; open?: string; close?: string; closed?: boolean; classes: GymClass[] };

// Directory of gyms. Relational core (queried/filtered) + jsonb for read-as-unit blocks.
export const gyms = pgTable("gyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }), // gym owner/manager
  name: text("name").notNull(),                 // English base + fallback
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  address: text("address").notNull().default(""),
  city: text("city"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  rating: doublePrecision("rating").notNull().default(0),
  reviewsCount: integer("reviews_count").notNull().default(0),
  phone: varchar("phone", { length: 32 }),
  whatsapp: varchar("whatsapp", { length: 32 }),
  headCoachId: uuid("head_coach_id"),           // loose ref to a coach user (no FK — avoid cycle)
  workingHours: varchar("working_hours", { length: 128 }),
  memberCount: integer("member_count").notNull().default(0),
  // read-as-a-unit documents
  types: jsonb("types").$type<string[]>().notNull().default([]),         // bodybuilding, crossfit, …
  facilityIds: jsonb("facilities").$type<string[]>().notNull().default([]), // DB col stays "facilities"; now holds catalog ids
  subscriptions: jsonb("subscriptions").$type<Subscription[]>().notNull().default([]),
  schedule: jsonb("schedule").$type<DaySchedule[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  countryIdx: index("gym_country_idx").on(t.countryId),
  nameIdx: index("gym_name_idx").on(t.name),
}));

export const gymTranslations = pgTable("gym_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
  description: text("description"),
}, (t) => ({ uniq: uniqueIndex("gym_tr_uniq").on(t.gymId, t.locale) }));

// Predefined facility catalog — localized title/description + icon/logo. Gyms reference these by id.
export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  icon: varchar("icon", { length: 48 }).notNull().default("checkmark-circle-outline"), // Ionicon name (fallback visual)
  logoUrl: text("logo_url"),                    // optional uploaded image, overrides icon
  title: text("title").notNull(),               // English base + fallback
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const facilityTranslations = pgTable("facility_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: text("title"),
  description: text("description"),
}, (t) => ({ uniq: uniqueIndex("facility_tr_uniq").on(t.facilityId, t.locale) }));

// Join/subscribe requests. No payment (P8) — records stay pending.
export const gymMembershipRequests = pgTable("gym_membership_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 64 }),        // chosen subscription name (optional)
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  gymIdx: index("gmr_gym_idx").on(t.gymId),
  userIdx: index("gmr_user_idx").on(t.userId),
}));

// Active memberships — created when a join request is approved. No payment (P8) → unpaid/active.
export const gymMemberships = pgTable("gym_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 64 }),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active | expired | cancelled
  startDate: timestamp("start_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  gymIdx: index("gm_gym_idx").on(t.gymId),
  userIdx: index("gm_user_idx").on(t.userId),
  uniq: uniqueIndex("gm_user_gym_uniq").on(t.userId, t.gymId),
}));

// Gym classes — scheduled sessions taught by a coach. Users join → coach approves → enrolled w/ expiry.
export const gymClasses = pgTable("gym_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }), // set if a gym class
  eventId: uuid("event_id"),                    // set if an event session (loose ref — no cycle)
  coachId: uuid("coach_id"),                    // loose ref to a coach user (no FK — avoid cycle)
  title: text("title").notNull(),               // English base + fallback
  description: text("description").notNull().default(""),
  dayOfWeek: varchar("day_of_week", { length: 12 }), // mon..sun (optional)
  startTime: varchar("start_time", { length: 8 }),   // "18:00"
  duration: varchar("duration", { length: 32 }),      // "60 min"
  capacity: integer("capacity").notNull().default(0), // 0 = unlimited
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ gymIdx: index("gc_gym_idx").on(t.gymId), eventIdx: index("gc_event_idx").on(t.eventId), coachIdx: index("gc_coach_idx").on(t.coachId) }));

export const classTranslations = pgTable("class_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => gymClasses.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: text("title"),
  description: text("description"),
}, (t) => ({ uniq: uniqueIndex("class_tr_uniq").on(t.classId, t.locale) }));

// Enrollment: guest requests to join → coach approves → enrolled with 30-day expiry.
export const classEnrollments = pgTable("class_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => gymClasses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | enrolled | rejected | expired | cancelled
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  classIdx: index("ce_class_idx").on(t.classId),
  userIdx: index("ce_user_idx").on(t.userId),
  uniq: uniqueIndex("ce_user_class_uniq").on(t.userId, t.classId),
}));

// Gym reviews — one per user per gym; gym.rating/reviewsCount recomputed on write.
export const gymReviews = pgTable("gym_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1..5
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  gymIdx: index("gr_gym_idx").on(t.gymId),
  uniq: uniqueIndex("gr_user_gym_uniq").on(t.userId, t.gymId),
}));

// Gym team — owner-added managers who can edit the gym from mobile. Owner (gyms.ownerId) is implicit.
export const gymTeam = pgTable("gym_team", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull().default("manager"), // manager (only role for now)
  addedBy: uuid("added_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  gymIdx: index("gt_gym_idx").on(t.gymId),
  uniq: uniqueIndex("gt_user_gym_uniq").on(t.userId, t.gymId),
}));

export type Gym = typeof gyms.$inferSelect;
export type { Money };
