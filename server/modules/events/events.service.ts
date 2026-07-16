import { and, eq, ilike, or, inArray, sql, desc, asc, gte } from "drizzle-orm";
import { db } from "../../core/db";
import { events, eventTranslations, eventRegistrations } from "./events.db";
import { users } from "../identity/identity.db";
import { gyms } from "../gyms/gyms.db";
import { gymsService } from "../gyms/gyms.service";
import { ApiError } from "../../middleware/error";
import type { PageMeta } from "../../core/http";
import type { AdminEventInput } from "./events.schema";

// attach gymName for events that have a gymId
async function withGymNames<T extends { gymId: string | null }>(rows: T[]): Promise<(T & { gymName: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.gymId).filter(Boolean) as string[])];
  const gs = ids.length ? await db.select({ id: gyms.id, name: gyms.name }).from(gyms).where(inArray(gyms.id, ids)) : [];
  const byId = new Map(gs.map((g) => [g.id, g.name]));
  return rows.map((r) => ({ ...r, gymName: r.gymId ? byId.get(r.gymId) ?? null : null }));
}

// apply a locale's translation (name/description/venue) over the English base rows
async function localize<T extends { id: string; name: string; description: string; venue: string }>(rows: T[], locale?: string): Promise<T[]> {
  if (!locale || locale === "en" || !rows.length) return rows;
  const trs = await db.select().from(eventTranslations).where(eq(eventTranslations.locale, locale));
  const byId = new Map(trs.map((t) => [t.eventId, t]));
  return rows.map((r) => {
    const tr = byId.get(r.id);
    return tr ? { ...r, name: tr.name || r.name, description: tr.description || r.description, venue: tr.venue || r.venue } : r;
  });
}

// coerce datetime strings → Date for timestamp columns
function coerceDates<T extends Record<string, any>>(cols: T): T {
  const out: any = { ...cols };
  if ("startsAt" in out) out.startsAt = out.startsAt ? new Date(out.startsAt) : null;
  if ("endsAt" in out) out.endsAt = out.endsAt ? new Date(out.endsAt) : null;
  return out;
}

export const eventsService = {
  async list(opts: { search?: string; countryId?: string; type?: string; upcoming?: boolean; locale?: string; page: number; perPage: number }) {
    const conds: any[] = [eq(events.isActive, true)];
    if (opts.countryId) conds.push(eq(events.countryId, opts.countryId));
    if (opts.type) conds.push(eq(events.type, opts.type));
    if (opts.upcoming) conds.push(or(sql`${events.startsAt} is null`, gte(events.startsAt, new Date())));
    if (opts.search) {
      const like = `%${opts.search}%`;
      const tr = await db.select({ id: eventTranslations.eventId }).from(eventTranslations).where(ilike(eventTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      conds.push(ids.length ? or(ilike(events.name, like), inArray(events.id, ids)) : ilike(events.name, like));
    }
    const where = and(...conds);
    const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(events).where(where);
    const rows = await db.select().from(events).where(where)
      .orderBy(asc(events.startsAt), events.name)
      .limit(opts.perPage).offset((opts.page - 1) * opts.perPage);
    const data = await withGymNames(await localize(rows, opts.locale));
    const meta: PageMeta = { page: opts.page, perPage: opts.perPage, total: count };
    return { data, meta };
  },

  // events hosted by a gym (public, on the gym profile)
  async eventsByGym(gymId: string, locale?: string) {
    const rows = await db.select().from(events).where(and(eq(events.gymId, gymId), eq(events.isActive, true))).orderBy(asc(events.startsAt), events.name);
    return withGymNames(await localize(rows, locale));
  },

  async get(id: string, userId?: string, locale?: string) {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Event not found");
    const [out] = await withGymNames(await localize([row], locale));
    let myStatus: string | null = null;
    let my: { status: string; paid: boolean; amountPaid: number | null; tierLabel: string | null } | null = null;
    let canManage = false;
    if (userId) {
      const [r] = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, userId)));
      myStatus = r?.status ?? null;
      my = r ? { status: r.status, paid: r.paid, amountPaid: r.amountPaid ?? null, tierLabel: r.tierLabel ?? null } : null;
      canManage = await this.canManageEvent(userId, row);
    }
    return { ...out, myStatus, my, canManage };
  },

  // ── manager self-service (owner OR a manager of the host gym) ──
  async canManageEvent(userId: string, ev: { ownerId: string | null; gymId: string | null }) {
    if (ev.ownerId === userId) return true;
    if (ev.gymId) return gymsService.canManageGym(userId, ev.gymId);
    return false;
  },
  async managedEvents(userId: string, locale?: string) {
    const managedGyms = await gymsService.managedGyms(userId);
    const gymIds = managedGyms.map((g: any) => g.id);
    const conds = [eq(events.ownerId, userId)];
    if (gymIds.length) conds.push(inArray(events.gymId, gymIds));
    const rows = await db.select().from(events).where(or(...conds)).orderBy(asc(events.startsAt), events.name);
    return withGymNames(await localize(rows, locale));
  },
  async createManagedEvent(userId: string, data: AdminEventInput) {
    // if attaching to a gym, must manage that gym
    if (data.gymId && !(await gymsService.canManageGym(userId, data.gymId))) throw new ApiError(403, "FORBIDDEN", "Not your gym");
    return this.adminCreate({ ...data, ownerId: data.ownerId ?? userId });
  },
  async updateManagedEvent(userId: string, id: string, data: Partial<AdminEventInput>) {
    const [ev] = await db.select().from(events).where(eq(events.id, id));
    if (!ev) throw new ApiError(404, "NOT_FOUND", "Event not found");
    if (!(await this.canManageEvent(userId, ev))) throw new ApiError(403, "FORBIDDEN", "Not your event");
    if (data.gymId && !(await gymsService.canManageGym(userId, data.gymId))) throw new ApiError(403, "FORBIDDEN", "Not your gym");
    return this.adminUpdate(id, data);
  },
  async deleteManagedEvent(userId: string, id: string) {
    const [ev] = await db.select().from(events).where(eq(events.id, id));
    if (!ev) throw new ApiError(404, "NOT_FOUND", "Event not found");
    if (!(await this.canManageEvent(userId, ev))) throw new ApiError(403, "FORBIDDEN", "Not your event");
    await db.delete(events).where(eq(events.id, id));
  },

  // ── registrations ──
  async register(userId: string, eventId: string, note?: string) {
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (!ev) throw new ApiError(404, "NOT_FOUND", "Event not found");
    // The organizer (owner or host-gym manager) can't register for their own event.
    if (await this.canManageEvent(userId, ev)) {
      throw new ApiError(403, "FORBIDDEN", "You manage this event — you can't register for it");
    }
    const [row] = await db.insert(eventRegistrations).values({ eventId, userId, note: note ?? null, status: "pending" })
      .onConflictDoUpdate({ target: [eventRegistrations.userId, eventRegistrations.eventId], set: { status: "pending", note: note ?? null } })
      .returning();
    return row;
  },

  // Athlete rolls back their own request/registration → remove it so they can
  // register again later. Recompute the confirmed count in case it was confirmed.
  async cancelRegistration(userId: string, eventId: string) {
    await db.delete(eventRegistrations)
      .where(and(eq(eventRegistrations.userId, userId), eq(eventRegistrations.eventId, eventId)));
    await this._recomputeCount(eventId);
    return { ok: true };
  },

  async myEvents(userId: string, locale?: string) {
    const regs = await db.select().from(eventRegistrations).where(eq(eventRegistrations.userId, userId)).orderBy(desc(eventRegistrations.createdAt));
    if (!regs.length) return [];
    let evRows = await db.select().from(events).where(inArray(events.id, regs.map((r) => r.eventId)));
    evRows = await localize(evRows, locale);
    const byId = new Map(evRows.map((e) => [e.id, e]));
    return regs.map((r) => {
      const e = byId.get(r.eventId);
      return { id: r.id, status: r.status, eventId: r.eventId, name: e?.name ?? "", startsAt: e?.startsAt ?? null, venue: e?.venue ?? null, type: e?.type ?? null };
    }).filter((x) => x.name);
  },

  async _recomputeCount(eventId: string) {
    const [agg] = await db.select({ count: sql<number>`count(*)::int` }).from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "confirmed")));
    await db.update(events).set({ registeredCount: agg?.count ?? 0, updatedAt: new Date() }).where(eq(events.id, eventId));
  },

  // organizer inbox: registrations for events I can manage (owned OR host-gym managed)
  async ownerRegistrations(userId: string) {
    const managed = await this.managedEvents(userId);
    if (!managed.length) return [];
    const nameById = new Map(managed.map((e) => [e.id, e.name]));
    const rows = await db.select({
      id: eventRegistrations.id, status: eventRegistrations.status, note: eventRegistrations.note, createdAt: eventRegistrations.createdAt,
      eventId: eventRegistrations.eventId, userId: eventRegistrations.userId, addedBy: eventRegistrations.addedBy,
      paid: eventRegistrations.paid, amountPaid: eventRegistrations.amountPaid, tierLabel: eventRegistrations.tierLabel,
      paidAt: eventRegistrations.paidAt, paymentHistory: eventRegistrations.paymentHistory,
      userName: users.name, userPhone: users.phone, userEmail: users.email,
    }).from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(inArray(eventRegistrations.eventId, managed.map((e) => e.id)))
      .orderBy(desc(eventRegistrations.createdAt));
    return rows.map((r) => ({ ...r, eventName: nameById.get(r.eventId) ?? null }));
  },

  // organizer: change approval status and/or record payment. Payment edits are
  // appended to paymentHistory (audit trail). `by`/`byName` = the acting manager.
  async ownerUpdateRegistration(
    userId: string,
    id: string,
    patch: { status?: string; paid?: boolean; amountPaid?: number | null; tierLabel?: string | null },
  ) {
    const [reg] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, id));
    if (!reg) throw new ApiError(404, "NOT_FOUND", "Registration not found");
    const [ev] = await db.select().from(events).where(eq(events.id, reg.eventId));
    if (!ev || !(await this.canManageEvent(userId, ev))) throw new ApiError(403, "FORBIDDEN", "Not your event");

    const set: Record<string, any> = {};
    if (patch.status !== undefined) set.status = patch.status;

    const touchesPayment = patch.paid !== undefined || patch.amountPaid !== undefined || patch.tierLabel !== undefined;
    if (touchesPayment) {
      const paid = patch.paid ?? reg.paid;
      const amount = patch.amountPaid !== undefined ? patch.amountPaid : reg.amountPaid;
      const tier = patch.tierLabel !== undefined ? patch.tierLabel : reg.tierLabel;
      set.paid = paid;
      set.amountPaid = amount ?? null;
      set.tierLabel = tier ?? null;
      set.paidAt = paid ? new Date() : null;
      set.paidBy = paid ? userId : null;
      const [mgr] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
      const entry = {
        at: new Date().toISOString(), by: userId, byName: mgr?.name ?? undefined,
        amount: amount ?? null, tierLabel: tier ?? null,
        action: paid ? (reg.paid ? "edit" : "paid") : "unpaid",
      };
      set.paymentHistory = [...(reg.paymentHistory ?? []), entry];
    }

    const [row] = await db.update(eventRegistrations).set(set).where(eq(eventRegistrations.id, id)).returning();
    await this._recomputeCount(reg.eventId);
    return row;
  },

  // manager walk-in: register an existing user at the door (goes straight to
  // confirmed — they still need to pay before access). `tierLabel` optional pre-pick.
  async addRegistrant(userId: string, eventId: string, targetUserId: string, note?: string, tierLabel?: string) {
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (!ev) throw new ApiError(404, "NOT_FOUND", "Event not found");
    if (!(await this.canManageEvent(userId, ev))) throw new ApiError(403, "FORBIDDEN", "Not your event");
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId));
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");
    const [row] = await db.insert(eventRegistrations)
      .values({ eventId, userId: targetUserId, status: "confirmed", addedBy: userId, tierLabel: tierLabel ?? null, note: note ?? null })
      .onConflictDoUpdate({ target: [eventRegistrations.userId, eventRegistrations.eventId], set: { status: "confirmed", addedBy: userId } })
      .returning();
    await this._recomputeCount(eventId);
    return row;
  },
  async ownedEvents(userId: string, locale?: string) {
    // owned OR host-gym managed (drives the organizer entry + manage list)
    return this.managedEvents(userId, locale);
  },

  // ── admin ──
  async adminList(search?: string) {
    let where: any = undefined;
    if (search) where = ilike(events.name, `%${search}%`);
    const rows = await db.select().from(events).where(where).orderBy(desc(events.startsAt));
    const trs = await db.select().from(eventTranslations);
    return rows.map((e) => ({
      ...e,
      translations: Object.fromEntries(trs.filter((t) => t.eventId === e.id).map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined, venue: t.venue ?? undefined }])),
    }));
  },
  async adminGet(id: string) {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Event not found");
    const trs = await db.select().from(eventTranslations).where(eq(eventTranslations.eventId, id));
    return { ...row, translations: Object.fromEntries(trs.map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined, venue: t.venue ?? undefined }])) };
  },
  async _setTranslations(eventId: string, translations?: Record<string, { name?: string; description?: string; venue?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(eventTranslations).values({ eventId, locale, name: v.name ?? null, description: v.description ?? null, venue: v.venue ?? null })
        .onConflictDoUpdate({ target: [eventTranslations.eventId, eventTranslations.locale], set: { name: v.name ?? null, description: v.description ?? null, venue: v.venue ?? null } });
    }
  },
  async adminCreate(data: AdminEventInput) {
    const { translations, ...cols } = data;
    const [row] = await db.insert(events).values(coerceDates(cols) as any).returning();
    await this._setTranslations(row.id, translations);
    return row;
  },
  async adminUpdate(id: string, data: Partial<AdminEventInput>) {
    const { translations, ...cols } = data;
    if (Object.keys(cols).length) {
      const [row] = await db.update(events).set({ ...coerceDates(cols), updatedAt: new Date() } as any).where(eq(events.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Event not found");
    }
    await this._setTranslations(id, translations);
    const [row] = await db.select().from(events).where(eq(events.id, id));
    return row;
  },
  async adminDelete(id: string) {
    await db.delete(events).where(eq(events.id, id));
  },
  async adminListRegistrations() {
    return db.select({
      id: eventRegistrations.id, status: eventRegistrations.status, note: eventRegistrations.note, createdAt: eventRegistrations.createdAt,
      eventId: eventRegistrations.eventId, eventName: events.name,
      userId: eventRegistrations.userId, userName: users.name, userEmail: users.email, userPhone: users.phone,
    }).from(eventRegistrations)
      .leftJoin(events, eq(eventRegistrations.eventId, events.id))
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .orderBy(desc(eventRegistrations.createdAt));
  },
  async adminUpdateRegistration(id: string, status: string) {
    const [row] = await db.update(eventRegistrations).set({ status }).where(eq(eventRegistrations.id, id)).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Registration not found");
    await this._recomputeCount(row.eventId);
    return row;
  },
};
