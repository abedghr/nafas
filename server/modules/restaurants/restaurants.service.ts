import { and, eq, ilike, or, inArray, sql, desc } from "drizzle-orm";
import { db } from "../../core/db";
import { restaurants, restaurantTranslations, reservationRequests } from "./restaurants.db";
import { users } from "../identity/identity.db";
import { ApiError } from "../../middleware/error";
import type { PageMeta } from "../../core/http";
import type { AdminRestaurantInput } from "./restaurants.schema";

async function localize<T extends { id: string; name: string; description: string }>(rows: T[], locale?: string): Promise<T[]> {
  if (!locale || locale === "en" || !rows.length) return rows;
  const trs = await db.select().from(restaurantTranslations).where(eq(restaurantTranslations.locale, locale));
  const byId = new Map(trs.map((t) => [t.restaurantId, t]));
  return rows.map((r) => {
    const tr = byId.get(r.id);
    return tr ? { ...r, name: tr.name || r.name, description: tr.description || r.description } : r;
  });
}

export const restaurantsService = {
  async list(opts: { search?: string; countryId?: string; locale?: string; page: number; perPage: number }) {
    const conds: any[] = [eq(restaurants.isActive, true)];
    if (opts.countryId) conds.push(eq(restaurants.countryId, opts.countryId));
    if (opts.search) {
      const like = `%${opts.search}%`;
      const tr = await db.select({ id: restaurantTranslations.restaurantId }).from(restaurantTranslations).where(ilike(restaurantTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      conds.push(ids.length ? or(ilike(restaurants.name, like), inArray(restaurants.id, ids)) : ilike(restaurants.name, like));
    }
    const where = and(...conds);
    const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(restaurants).where(where);
    const rows = await db.select().from(restaurants).where(where)
      .orderBy(desc(restaurants.rating), restaurants.name)
      .limit(opts.perPage).offset((opts.page - 1) * opts.perPage);
    const data = await localize(rows, opts.locale);
    const meta: PageMeta = { page: opts.page, perPage: opts.perPage, total: count };
    return { data, meta };
  },

  async get(id: string, locale?: string) {
    const [row] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Restaurant not found");
    const [out] = await localize([row], locale);
    return out;
  },

  // ── admin ──────────────────────────────────────────────────────────────────
  async adminList(search?: string) {
    let where: any = undefined;
    if (search) {
      const like = `%${search}%`;
      const tr = await db.select({ id: restaurantTranslations.restaurantId }).from(restaurantTranslations).where(ilike(restaurantTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      where = ids.length ? or(ilike(restaurants.name, like), inArray(restaurants.id, ids)) : ilike(restaurants.name, like);
    }
    const rows = await db.select().from(restaurants).where(where).orderBy(restaurants.name);
    const trs = await db.select().from(restaurantTranslations);
    return rows.map((r) => ({
      ...r,
      translations: Object.fromEntries(trs.filter((t) => t.restaurantId === r.id).map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined }])),
    }));
  },
  async adminGet(id: string) {
    const [row] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Restaurant not found");
    const trs = await db.select().from(restaurantTranslations).where(eq(restaurantTranslations.restaurantId, id));
    return { ...row, translations: Object.fromEntries(trs.map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined }])) };
  },
  async _setTranslations(restaurantId: string, translations?: Record<string, { name?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(restaurantTranslations).values({ restaurantId, locale, name: v.name ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [restaurantTranslations.restaurantId, restaurantTranslations.locale], set: { name: v.name ?? null, description: v.description ?? null } });
    }
  },
  async adminCreate(data: AdminRestaurantInput) {
    const { translations, ...cols } = data;
    const [row] = await db.insert(restaurants).values(cols as any).returning();
    await this._setTranslations(row.id, translations);
    return row;
  },
  async adminUpdate(id: string, data: Partial<AdminRestaurantInput>) {
    const { translations, ...cols } = data;
    if (Object.keys(cols).length) {
      const [row] = await db.update(restaurants).set({ ...cols, updatedAt: new Date() } as any).where(eq(restaurants.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Restaurant not found");
    }
    await this._setTranslations(id, translations);
    const [row] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return row;
  },
  async adminDelete(id: string) {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  },

  // ── reservations (no payment — stays pending) ───────────────────────────────
  async requestReservation(userId: string, restaurantId: string, body: { date?: string; partySize?: number; note?: string }) {
    const [r] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    if (!r) throw new ApiError(404, "NOT_FOUND", "Restaurant not found");
    const [row] = await db.insert(reservationRequests).values({ restaurantId, userId, date: body.date ?? null, partySize: body.partySize ?? 1, note: body.note ?? null }).returning();
    return row;
  },
  async myReservations(userId: string) {
    return db.select().from(reservationRequests).where(eq(reservationRequests.userId, userId)).orderBy(desc(reservationRequests.createdAt));
  },
  async adminListReservations() {
    return db.select({
      id: reservationRequests.id, status: reservationRequests.status, date: reservationRequests.date,
      partySize: reservationRequests.partySize, note: reservationRequests.note, createdAt: reservationRequests.createdAt,
      restaurantId: reservationRequests.restaurantId, restaurantName: restaurants.name,
      userId: reservationRequests.userId, userName: users.name, userEmail: users.email,
    }).from(reservationRequests)
      .leftJoin(restaurants, eq(reservationRequests.restaurantId, restaurants.id))
      .leftJoin(users, eq(reservationRequests.userId, users.id))
      .orderBy(desc(reservationRequests.createdAt));
  },
  async adminUpdateReservationStatus(id: string, status: string) {
    const [row] = await db.update(reservationRequests).set({ status }).where(eq(reservationRequests.id, id)).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Reservation not found");
    return row;
  },
};
