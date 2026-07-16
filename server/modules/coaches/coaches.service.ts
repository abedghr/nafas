import { and, eq, ilike, desc, sql } from "drizzle-orm";
import { db } from "../../core/db";
import { users, coachProfiles } from "../identity/identity.db";
import { gyms } from "../gyms/gyms.db";
import { sessionRequests, coachPlans, coachTransformations } from "./coaches.db";
import { inArray } from "drizzle-orm";
import { ApiError } from "../../middleware/error";
import type { PageMeta } from "../../core/http";
import type { AdminCoachInput } from "./coaches.schema";

// shape a joined (user + coach_profile) row into the public Coach object
const shape = (u: any, p: any) => ({
  id: u.id,
  name: u.name,
  avatarUrl: u.avatarUrl ?? null,
  coverUrl: p?.coverUrl ?? null,
  countryId: u.countryId ?? null,
  phone: u.phone ?? null,
  whatsapp: p?.whatsapp ?? null,
  bio: u.bio ?? "",
  headline: p?.headline ?? "",
  specialty: p?.specialty ?? [],
  certifications: p?.certifications ?? [],
  yearsExperience: p?.yearsExperience ?? 0,
  rating: p?.rating ?? 0,
  reviewsCount: p?.reviewsCount ?? 0,
  clientsCount: p?.clientsCount ?? 0,
  pricePerSession: p?.pricePerSession ?? null,
  gymId: p?.gymId ?? null,
  gymName: null as string | null,
  verificationStatus: p?.verificationStatus ?? "pending",
  isFeatured: p?.isFeatured ?? false,
  socialLinks: p?.socialLinks ?? {},
});

export const coachesService = {
  async list(opts: { search?: string; countryId?: string; page: number; perPage: number; adminAll?: boolean }) {
    const conds: any[] = [eq(users.role, "coach")];
    if (!opts.adminAll) conds.push(eq(users.status, "active"));
    if (opts.countryId) conds.push(eq(users.countryId, opts.countryId));
    if (opts.search) conds.push(ilike(users.name, `%${opts.search}%`));
    const where = and(...conds);
    const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(users).leftJoin(coachProfiles, eq(coachProfiles.userId, users.id)).where(where);
    const rows = await db.select({ u: users, p: coachProfiles })
      .from(users).leftJoin(coachProfiles, eq(coachProfiles.userId, users.id))
      .where(where)
      .orderBy(desc(coachProfiles.isFeatured), desc(coachProfiles.rating), users.name)
      .limit(opts.perPage).offset((opts.page - 1) * opts.perPage);
    const data = rows.map((r) => shape(r.u, r.p));
    const meta: PageMeta = { page: opts.page, perPage: opts.perPage, total: count };
    return { data, meta };
  },

  async get(coachUserId: string) {
    const [row] = await db.select({ u: users, p: coachProfiles })
      .from(users).leftJoin(coachProfiles, eq(coachProfiles.userId, users.id))
      .where(and(eq(users.id, coachUserId), eq(users.role, "coach")));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Coach not found");
    const c = shape(row.u, row.p) as any;
    if (c.gymId) { const [g] = await db.select({ name: gyms.name }).from(gyms).where(eq(gyms.id, c.gymId)); c.gymName = g?.name ?? null; }
    c.plans = await this.listPlans(coachUserId);
    c.transformations = await this.listTransformations(coachUserId);
    return c;
  },

  // ── coach before/after transformations (coach-managed) ──────────────────────
  async listTransformations(coachId: string) {
    return db.select().from(coachTransformations).where(eq(coachTransformations.coachId, coachId)).orderBy(desc(coachTransformations.createdAt));
  },
  async createTransformation(coachId: string, data: any) {
    const [row] = await db.insert(coachTransformations).values({ coachId, beforeImage: data.beforeImage ?? null, afterImage: data.afterImage ?? null, duration: data.duration ?? null, target: data.target ?? null, clientName: data.clientName ?? null }).returning();
    return row;
  },
  async updateTransformation(coachId: string, id: string, data: any) {
    const [row] = await db.update(coachTransformations).set(data).where(and(eq(coachTransformations.id, id), eq(coachTransformations.coachId, coachId))).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Not found");
    return row;
  },
  async deleteTransformation(coachId: string, id: string) {
    await db.delete(coachTransformations).where(and(eq(coachTransformations.id, id), eq(coachTransformations.coachId, coachId)));
  },

  // ── coach PT plans (coach-managed) ──────────────────────────────────────────
  async listPlans(coachId: string) {
    return db.select().from(coachPlans).where(eq(coachPlans.coachId, coachId)).orderBy(coachPlans.sortOrder, coachPlans.createdAt);
  },
  async createPlan(coachId: string, data: { name: string; includes?: string[]; duration?: string; price?: any; sortOrder?: number }) {
    const [row] = await db.insert(coachPlans).values({ coachId, name: data.name, includes: data.includes ?? [], duration: data.duration ?? null, price: data.price ?? null, sortOrder: data.sortOrder ?? 0 }).returning();
    return row;
  },
  async updatePlan(coachId: string, planId: string, data: Partial<{ name: string; includes: string[]; duration: string; price: any; sortOrder: number }>) {
    const [row] = await db.update(coachPlans).set(data as any).where(and(eq(coachPlans.id, planId), eq(coachPlans.coachId, coachId))).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Plan not found");
    return row;
  },
  async deletePlan(coachId: string, planId: string) {
    await db.delete(coachPlans).where(and(eq(coachPlans.id, planId), eq(coachPlans.coachId, coachId)));
  },

  // ── admin ──────────────────────────────────────────────────────────────────
  async adminList(search?: string) {
    return (await this.list({ search, page: 1, perPage: 200, adminAll: true })).data;
  },
  async adminUpdate(coachUserId: string, data: AdminCoachInput) {
    const [u] = await db.select().from(users).where(and(eq(users.id, coachUserId), eq(users.role, "coach")));
    if (!u) throw new ApiError(404, "NOT_FOUND", "Coach not found");
    if (data.bio !== undefined) await db.update(users).set({ bio: data.bio, updatedAt: new Date() }).where(eq(users.id, coachUserId));
    const { bio, ...profileCols } = data;
    if (Object.keys(profileCols).length) {
      // upsert coach_profile (a coach may not have a profile row yet)
      const [exists] = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, coachUserId));
      if (exists) await db.update(coachProfiles).set(profileCols as any).where(eq(coachProfiles.userId, coachUserId));
      else await db.insert(coachProfiles).values({ userId: coachUserId, ...(profileCols as any) });
    }
    return this.get(coachUserId);
  },

  // ── bookings (no payment — pending) ─────────────────────────────────────────
  async bookSession(clientId: string, coachId: string, body: { date?: string; note?: string; planId?: string }) {
    const [c] = await db.select().from(users).where(and(eq(users.id, coachId), eq(users.role, "coach")));
    if (!c) throw new ApiError(404, "NOT_FOUND", "Coach not found");
    const [row] = await db.insert(sessionRequests).values({ coachId, clientId, planId: body.planId ?? null, date: body.date ?? null, note: body.note ?? null }).returning();
    return row;
  },
  async myBookings(clientId: string) {
    return db.select().from(sessionRequests).where(eq(sessionRequests.clientId, clientId)).orderBy(desc(sessionRequests.createdAt));
  },
  // coach's INCOMING leads (people interested in this coach) — coach sees + acts
  async myLeads(coachId: string) {
    const rows = await db.select().from(sessionRequests).where(eq(sessionRequests.coachId, coachId)).orderBy(desc(sessionRequests.createdAt));
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const planIds = [...new Set(rows.map((r) => r.planId).filter(Boolean) as string[])];
    const people = clientIds.length ? await db.select({ id: users.id, name: users.name, phone: users.phone, email: users.email }).from(users).where(inArray(users.id, clientIds)) : [];
    const plans = planIds.length ? await db.select({ id: coachPlans.id, name: coachPlans.name }).from(coachPlans).where(inArray(coachPlans.id, planIds)) : [];
    const pById = new Map(people.map((p) => [p.id, p]));
    const planById = new Map(plans.map((p) => [p.id, p.name]));
    return rows.map((r) => ({
      id: r.id, status: r.status, note: r.note, createdAt: r.createdAt,
      planName: r.planId ? planById.get(r.planId) ?? null : null,
      clientName: pById.get(r.clientId)?.name ?? null, clientPhone: pById.get(r.clientId)?.phone ?? null, clientEmail: pById.get(r.clientId)?.email ?? null,
    }));
  },
  async updateLeadStatus(coachId: string, id: string, status: string) {
    const [row] = await db.update(sessionRequests).set({ status }).where(and(eq(sessionRequests.id, id), eq(sessionRequests.coachId, coachId))).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Lead not found");
    return row;
  },
  async adminListBookings() {
    const rows = await db.select({
      id: sessionRequests.id, status: sessionRequests.status, date: sessionRequests.date, note: sessionRequests.note, createdAt: sessionRequests.createdAt,
      coachId: sessionRequests.coachId, clientId: sessionRequests.clientId,
    }).from(sessionRequests).orderBy(desc(sessionRequests.createdAt));
    // resolve names in one pass
    const ids = [...new Set(rows.flatMap((r) => [r.coachId, r.clientId]))];
    const people = ids.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users) : [];
    const byId = new Map(people.map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      coachName: byId.get(r.coachId)?.name ?? null,
      clientName: byId.get(r.clientId)?.name ?? null,
      clientEmail: byId.get(r.clientId)?.email ?? null,
    }));
  },
  async adminUpdateBookingStatus(id: string, status: string) {
    const [row] = await db.update(sessionRequests).set({ status }).where(eq(sessionRequests.id, id)).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Booking not found");
    return row;
  },
};
