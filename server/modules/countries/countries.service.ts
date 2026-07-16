import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../core/db";
import { countries } from "./countries.db";
import { ApiError } from "../../middleware/error";
import type { PaginationQuery } from "../../core/http";
import type { CountryCreate, CountryUpdate } from "./countries.schema";

export const countriesService = {
  // Public: active countries only (drives the register country picker).
  async listActive() {
    return db.select().from(countries).where(eq(countries.isActive, true)).orderBy(countries.name);
  },

  // Admin: paginated, all countries.
  async adminList(q: PaginationQuery) {
    const where = q.search ? ilike(countries.name, `%${q.search}%`) : undefined;
    const offset = (q.page - 1) * q.perPage;
    const rows = await db.select().from(countries).where(where).limit(q.perPage).offset(offset).orderBy(countries.name);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(countries).where(where);
    return { rows, total: count };
  },

  async getById(id: string) {
    const [row] = await db.select().from(countries).where(eq(countries.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Country not found");
    return row;
  },

  async create(data: CountryCreate) {
    const [existing] = await db.select().from(countries).where(eq(countries.code, data.code.toUpperCase()));
    if (existing) throw new ApiError(409, "CONFLICT", "Country code already exists");
    const [row] = await db.insert(countries).values({ ...data, code: data.code.toUpperCase() }).returning();
    return row;
  },

  async update(id: string, data: CountryUpdate) {
    await this.getById(id);
    const [row] = await db
      .update(countries)
      .set({ ...data, ...(data.code ? { code: data.code.toUpperCase() } : {}), updatedAt: new Date() })
      .where(eq(countries.id, id))
      .returning();
    return row;
  },

  async remove(id: string) {
    await this.getById(id);
    await db.delete(countries).where(eq(countries.id, id));
  },

  // Idempotent seed: Jordan (primary) + KSA.
  async seed() {
    const seedRows: CountryCreate[] = [
      { code: "JO", name: "Jordan", currency: "JOD", phoneCode: "+962", language: "ar", locale: "ar-JO", timezone: "Asia/Amman", isActive: true },
      { code: "SA", name: "Saudi Arabia", currency: "SAR", phoneCode: "+966", language: "ar", locale: "ar-SA", timezone: "Asia/Riyadh", isActive: true },
    ];
    for (const c of seedRows) {
      const [exists] = await db.select().from(countries).where(eq(countries.code, c.code));
      if (!exists) await db.insert(countries).values(c);
    }
  },
};
