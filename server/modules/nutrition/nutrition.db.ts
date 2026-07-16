import {
  pgTable, uuid, varchar, text, integer, doublePrecision, timestamp, jsonb, date, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";

// ── Foods (relational; system rows userId null) ─────────────────────────────
export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),                 // English base + fallback
  protein: doublePrecision("protein").notNull().default(0),
  carbs: doublePrecision("carbs").notNull().default(0),
  fat: doublePrecision("fat").notNull().default(0),
  calories: doublePrecision("calories").notNull().default(0),
  mealTypes: jsonb("meal_types").$type<string[]>().notNull().default([]), // hints: breakfast, lunch, dinner, snack, ...
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ nameIdx: index("food_name_idx").on(t.name) }));

export const foodTranslations = pgTable("food_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  foodId: uuid("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  name: text("name"),
}, (t) => ({ uniq: uniqueIndex("food_tr_uniq").on(t.foodId, t.locale) }));

// ── Per-user nutrition (day doc + aggregate columns) ────────────────────────
export const nutritionDays = pgTable("nutrition_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD in the user's country timezone
  meals: jsonb("meals").$type<unknown[]>().notNull().default([]),
  totalProtein: doublePrecision("total_protein").notNull().default(0),
  totalCarbs: doublePrecision("total_carbs").notNull().default(0),
  totalFat: doublePrecision("total_fat").notNull().default(0),
  totalCalories: doublePrecision("total_calories").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ userDateUniq: uniqueIndex("nd_user_date_uniq").on(t.userId, t.date) }));

export const nutritionTargets = pgTable("nutrition_targets", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  protein: integer("protein").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  calories: integer("calories").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inbodyTests = pgTable("inbody_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  weight: doublePrecision("weight"),
  muscleMass: doublePrecision("muscle_mass"),
  bodyFat: doublePrecision("body_fat"),
  bodyWater: doublePrecision("body_water"),
  bmi: doublePrecision("bmi"),
  bmr: doublePrecision("bmr"),
  visceralFat: doublePrecision("visceral_fat"),
  skeletalMuscle: doublePrecision("skeletal_muscle"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ userDateIdx: index("inbody_user_date_idx").on(t.userId, t.date) }));
