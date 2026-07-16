import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../core/db";
import { languages, labels } from "./i18n.db";
import { DEFAULT_LOCALE } from "../../middleware/locale";

export const i18nService = {
  async activeLanguages() {
    return db.select().from(languages).where(eq(languages.isActive, true));
  },

  // Bundle of labels for a locale, with default-locale fallback per key.
  // → { grp: { key: value } }
  async bundle(locale: string) {
    const wanted = locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
    const rows = await db.select().from(labels).where(inArray(labels.locale, wanted));
    const out: Record<string, Record<string, string>> = {};
    // default locale first, then override with requested locale
    for (const loc of [DEFAULT_LOCALE, locale]) {
      for (const r of rows.filter((x) => x.locale === loc)) {
        (out[r.grp] ??= {})[r.key] = r.value;
      }
    }
    return out;
  },

  // resolve one label (used server-side when embedding labels in responses)
  async resolveMap(grp: string, locale: string) {
    const b = await this.bundle(locale);
    return b[grp] ?? {};
  },

  // ── admin ──
  async listLabels(grp?: string) {
    const rows = grp ? await db.select().from(labels).where(eq(labels.grp, grp)) : await db.select().from(labels);
    // shape: { grp: { key: { locale: value } } }
    const out: Record<string, Record<string, Record<string, string>>> = {};
    for (const r of rows) (((out[r.grp] ??= {})[r.key] ??= {}))[r.locale] = r.value;
    return out;
  },
  async upsertLabel(grp: string, key: string, locale: string, value: string) {
    await db.insert(labels).values({ grp, key, locale, value })
      .onConflictDoUpdate({ target: [labels.grp, labels.key, labels.locale], set: { value, updatedAt: new Date() } });
  },
};
