import {
  pgTable, uuid, varchar, text, doublePrecision, integer, boolean, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { countries } from "../countries/countries.db";
import { users } from "../identity/identity.db";

type Money = { amount: number; currency: string };
// menu item — per-restaurant (name/description admin free-text; price localized via currency)
type MenuItem = { name: string; description?: string; price: Money; calories?: number };

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),                 // English base + fallback
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  address: text("address").notNull().default(""),
  city: text("city"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  rating: doublePrecision("rating").notNull().default(0),
  phone: varchar("phone", { length: 32 }),
  workingHours: varchar("working_hours", { length: 128 }),
  priceRange: varchar("price_range", { length: 8 }),     // $, $$, $$$
  cuisines: jsonb("cuisines").$type<string[]>().notNull().default([]),    // healthy, salads, grill, vegan…
  menu: jsonb("menu").$type<MenuItem[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  countryIdx: index("rest_country_idx").on(t.countryId),
  nameIdx: index("rest_name_idx").on(t.name),
}));

export const restaurantTranslations = pgTable("restaurant_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
  description: text("description"),
}, (t) => ({ uniq: uniqueIndex("rest_tr_uniq").on(t.restaurantId, t.locale) }));

// reservation requests — no payment (P8); records stay pending
export const reservationRequests = pgTable("reservation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 32 }),        // requested date/time (free text for now)
  partySize: integer("party_size").notNull().default(1),
  note: text("note"),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  restIdx: index("rr_rest_idx").on(t.restaurantId),
  userIdx: index("rr_user_idx").on(t.userId),
}));

export type Restaurant = typeof restaurants.$inferSelect;
