import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

// Supported languages. Add a language = insert a row + provide translations.
export const languages = pgTable("languages", {
  code: varchar("code", { length: 5 }).primaryKey(), // 'en', 'ar', ...
  name: text("name").notNull(),                       // English name
  nativeName: text("native_name").notNull(),          // local name
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
});

// System label translations for fixed enum sets (measurement_type, body_target, set_type, ...).
export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  grp: varchar("grp", { length: 48 }).notNull(),   // e.g. 'measurement_type', 'body_target'
  key: varchar("key", { length: 64 }).notNull(),   // e.g. 'time_hold', 'shoulders_anterior'
  locale: varchar("locale", { length: 5 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("labels_grp_key_locale_uniq").on(t.grp, t.key, t.locale),
  grpLocaleIdx: index("labels_grp_locale_idx").on(t.grp, t.locale),
}));
