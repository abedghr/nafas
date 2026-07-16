import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const countries = pgTable("countries", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 2 }).notNull().unique(), // ISO 3166-1 alpha-2
  name: text("name").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(), // ISO 4217 (JOD, SAR)
  phoneCode: varchar("phone_code", { length: 8 }).notNull(),
  language: varchar("language", { length: 5 }).notNull().default("en"),
  locale: varchar("locale", { length: 10 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Country = typeof countries.$inferSelect;
