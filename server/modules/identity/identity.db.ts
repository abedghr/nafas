import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, pgEnum, jsonb, doublePrecision,
} from "drizzle-orm/pg-core";
import { countries } from "../countries/countries.db";

type Money = { amount: number; currency: string };

export const userRole = pgEnum("user_role", ["athlete", "coach", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "suspended"]);
export const coachVerification = pgEnum("coach_verification", [
  "pending", "verified", "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("athlete"),
  status: userStatus("status").notNull().default("active"),
  countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
  language: varchar("language", { length: 5 }).notNull().default("en"),
  theme: varchar("theme", { length: 8 }).notNull().default("dark"),
  avatarUrl: text("avatar_url"),
  height: integer("height"),
  weight: integer("weight"),
  age: integer("age"),
  gender: varchar("gender", { length: 16 }),
  goal: varchar("goal", { length: 32 }),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  bio: text("bio").default(""),
  rank: varchar("rank", { length: 32 }).notNull().default("beginner_athlete"),
  profileComplete: boolean("profile_complete").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coachProfiles = pgTable("coach_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  specialty: jsonb("specialty").$type<string[]>().notNull().default([]),
  yearsExperience: integer("years_experience").notNull().default(0),
  certifications: jsonb("certifications").$type<string[]>().notNull().default([]),
  verificationStatus: coachVerification("verification_status").notNull().default("pending"),
  // marketplace fields (F7)
  headline: text("headline").notNull().default(""),       // short tagline
  pricePerSession: jsonb("price_per_session").$type<Money | null>(),
  rating: doublePrecision("rating").notNull().default(0),
  reviewsCount: integer("reviews_count").notNull().default(0),
  clientsCount: integer("clients_count").notNull().default(0),
  gymId: uuid("gym_id"),                                   // loose ref to gyms (no FK — avoid circular import)
  whatsapp: varchar("whatsapp", { length: 32 }),
  coverUrl: text("cover_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type CoachProfile = typeof coachProfiles.$inferSelect;
