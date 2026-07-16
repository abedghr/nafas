import { and, eq, ilike, or, inArray, sql, desc } from "drizzle-orm";
import { db } from "../../core/db";
import { gyms, gymTranslations, gymMembershipRequests, gymMemberships, facilities, facilityTranslations, gymClasses, classTranslations, classEnrollments, gymReviews, gymTeam } from "./gyms.db";
import { events } from "../events/events.db";
import { users, coachProfiles } from "../identity/identity.db";
import { ApiError } from "../../middleware/error";
import type { PageMeta } from "../../core/http";
import type { AdminGymInput, AdminFacilityInput, AdminClassInput } from "./gyms.schema";

const CLASS_ENROLL_DAYS = 30; // ponytail: fixed enrollment window; per-class duration if needed later

// localize class rows (title/description) over English base
async function localizeClasses<T extends { id: string; title: string; description: string }>(rows: T[], locale?: string): Promise<T[]> {
  if (!locale || locale === "en" || !rows.length) return rows;
  const trs = await db.select().from(classTranslations).where(eq(classTranslations.locale, locale));
  const byId = new Map(trs.map((t) => [t.classId, t]));
  return rows.map((r) => {
    const tr = byId.get(r.id);
    return tr ? { ...r, title: tr.title || r.title, description: tr.description || r.description } : r;
  });
}

// resolve a locale's facility catalog (title/description), keyed by id
async function facilityMap(locale?: string) {
  const rows = await db.select().from(facilities);
  let trById = new Map<string, { title: string | null; description: string | null }>();
  if (locale && locale !== "en") {
    const trs = await db.select().from(facilityTranslations).where(eq(facilityTranslations.locale, locale));
    trById = new Map(trs.map((t) => [t.facilityId, { title: t.title, description: t.description }]));
  }
  return new Map(rows.map((r) => {
    const tr = trById.get(r.id);
    return [r.id, { id: r.id, icon: r.icon, logoUrl: r.logoUrl, title: tr?.title || r.title, description: tr?.description || r.description }];
  }));
}

// apply a locale's translation (name/description) over the English base rows
async function localize<T extends { id: string; name: string; description: string }>(rows: T[], locale?: string): Promise<T[]> {
  if (!locale || locale === "en" || !rows.length) return rows;
  const trs = await db.select().from(gymTranslations).where(eq(gymTranslations.locale, locale));
  const byId = new Map(trs.map((t) => [t.gymId, t]));
  return rows.map((r) => {
    const tr = byId.get(r.id);
    return tr ? { ...r, name: tr.name || r.name, description: tr.description || r.description } : r;
  });
}

export const gymsService = {
  async list(opts: { search?: string; countryId?: string; locale?: string; page: number; perPage: number }) {
    const conds: any[] = [eq(gyms.isActive, true)];
    if (opts.countryId) conds.push(eq(gyms.countryId, opts.countryId));
    if (opts.search) {
      const like = `%${opts.search}%`;
      // match English base name OR any-locale translation name (cross-language search)
      const tr = await db.select({ id: gymTranslations.gymId }).from(gymTranslations).where(ilike(gymTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      conds.push(ids.length ? or(ilike(gyms.name, like), inArray(gyms.id, ids)) : ilike(gyms.name, like));
    }
    const where = and(...conds);
    const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(gyms).where(where);
    const rows = await db.select().from(gyms).where(where)
      .orderBy(desc(gyms.rating), gyms.name)
      .limit(opts.perPage).offset((opts.page - 1) * opts.perPage);
    const localized = await localize(rows, opts.locale);
    const fmap = await facilityMap(opts.locale);
    const data = localized.map((g: any) => ({ ...g, facilities: (g.facilityIds || []).map((id: string) => fmap.get(id)).filter(Boolean) }));
    const meta: PageMeta = { page: opts.page, perPage: opts.perPage, total: count };
    return { data, meta };
  },

  async get(id: string, locale?: string, userId?: string) {
    const [row] = await db.select().from(gyms).where(eq(gyms.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    const [out] = await localize([row], locale);
    const fmap = await facilityMap(locale);
    return {
      ...out,
      facilities: ((out as any).facilityIds || []).map((id: string) => fmap.get(id)).filter(Boolean),
      coaches: await this.gymCoaches(id),
      canManage: userId ? await this.canManageGym(userId, id) : false,
    };
  },

  // coaches affiliated with this gym (coach_profile.gymId)
  async gymCoaches(gymId: string) {
    const rows = await db.select({ u: users, p: coachProfiles })
      .from(users).innerJoin(coachProfiles, eq(coachProfiles.userId, users.id))
      .where(and(eq(users.role, "coach"), eq(coachProfiles.gymId, gymId)));
    return rows.map(({ u, p }) => ({
      id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null, headline: p.headline ?? "",
      specialty: p.specialty ?? [], rating: p.rating ?? 0, pricePerSession: p.pricePerSession ?? null,
    }));
  },

  // ── admin ──────────────────────────────────────────────────────────────────
  async adminList(search?: string) {
    let where: any = undefined;
    if (search) {
      const like = `%${search}%`;
      const tr = await db.select({ id: gymTranslations.gymId }).from(gymTranslations).where(ilike(gymTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      where = ids.length ? or(ilike(gyms.name, like), inArray(gyms.id, ids)) : ilike(gyms.name, like);
    }
    const rows = await db.select().from(gyms).where(where).orderBy(gyms.name);
    const trs = await db.select().from(gymTranslations);
    return rows.map((g) => ({
      ...g,
      translations: Object.fromEntries(
        trs.filter((t) => t.gymId === g.id).map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined }]),
      ),
    }));
  },

  async adminGet(id: string) {
    const [row] = await db.select().from(gyms).where(eq(gyms.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    const trs = await db.select().from(gymTranslations).where(eq(gymTranslations.gymId, id));
    const fmap = await facilityMap(); // English catalog for the admin view
    return {
      ...row,
      facilities: (row.facilityIds || []).map((fid) => fmap.get(fid)).filter(Boolean),
      translations: Object.fromEntries(trs.map((t) => [t.locale, { name: t.name ?? undefined, description: t.description ?? undefined }])),
    };
  },

  async _setTranslations(gymId: string, translations?: Record<string, { name?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(gymTranslations).values({ gymId, locale, name: v.name ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [gymTranslations.gymId, gymTranslations.locale], set: { name: v.name ?? null, description: v.description ?? null } });
    }
  },

  async adminCreate(data: AdminGymInput) {
    const { translations, ...cols } = data;
    const [row] = await db.insert(gyms).values(cols as any).returning();
    await this._setTranslations(row.id, translations);
    return row;
  },

  async adminUpdate(id: string, data: Partial<AdminGymInput>) {
    const { translations, ...cols } = data;
    if (Object.keys(cols).length) {
      const [row] = await db.update(gyms).set({ ...cols, updatedAt: new Date() } as any).where(eq(gyms.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    }
    await this._setTranslations(id, translations);
    const [row] = await db.select().from(gyms).where(eq(gyms.id, id));
    return row;
  },

  async adminDelete(id: string) {
    await db.delete(gyms).where(eq(gyms.id, id));
  },

  // ── membership requests (no payment — stays pending) ────────────────────────
  async requestMembership(userId: string, gymId: string, plan?: string) {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId));
    if (!gym) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    if (await this.canManageGym(userId, gymId)) {
      throw new ApiError(403, "FORBIDDEN", "You manage this gym — you can't request to join it");
    }
    const [row] = await db.insert(gymMembershipRequests).values({ gymId, userId, plan: plan ?? null }).returning();
    return row;
  },
  // athlete rolls back a pending join request
  async cancelMembershipRequest(userId: string, gymId: string) {
    await db.delete(gymMembershipRequests)
      .where(and(eq(gymMembershipRequests.userId, userId), eq(gymMembershipRequests.gymId, gymId), eq(gymMembershipRequests.status, "pending")));
    return { ok: true };
  },
  async myRequests(userId: string) {
    return db.select().from(gymMembershipRequests).where(eq(gymMembershipRequests.userId, userId)).orderBy(desc(gymMembershipRequests.createdAt));
  },
  // member's gyms: active memberships + still-pending requests, each with gym info + status
  async myGyms(userId: string, locale?: string) {
    const mems = await db.select().from(gymMemberships).where(eq(gymMemberships.userId, userId));
    const reqs = await db.select().from(gymMembershipRequests)
      .where(and(eq(gymMembershipRequests.userId, userId), eq(gymMembershipRequests.status, "pending")));
    const ids = [...new Set([...mems.map((m) => m.gymId), ...reqs.map((r) => r.gymId)])];
    if (!ids.length) return [];
    let gymRows = await db.select().from(gyms).where(inArray(gyms.id, ids));
    gymRows = await localize(gymRows, locale);
    const byId = new Map(gymRows.map((g) => [g.id, g]));
    const out = mems.map((m) => ({ kind: "membership" as const, status: m.status, plan: m.plan, gymId: m.gymId, gym: byId.get(m.gymId) }));
    const memGymIds = new Set(mems.map((m) => m.gymId));
    for (const r of reqs) if (!memGymIds.has(r.gymId)) out.push({ kind: "request" as const, status: "pending", plan: r.plan, gymId: r.gymId, gym: byId.get(r.gymId) } as any);
    return out.filter((x) => x.gym);
  },
  async adminListRequests() {
    return db.select({
      id: gymMembershipRequests.id, status: gymMembershipRequests.status, plan: gymMembershipRequests.plan,
      createdAt: gymMembershipRequests.createdAt,
      gymId: gymMembershipRequests.gymId, gymName: gyms.name,
      userId: gymMembershipRequests.userId, userName: users.name, userEmail: users.email, userPhone: users.phone,
    }).from(gymMembershipRequests)
      .leftJoin(gyms, eq(gymMembershipRequests.gymId, gyms.id))
      .leftJoin(users, eq(gymMembershipRequests.userId, users.id))
      .orderBy(desc(gymMembershipRequests.createdAt));
  },
  // gym OWNER (mobile self-service): gyms I own + their incoming leads
  async ownedGyms(ownerId: string, locale?: string) {
    const rows = await db.select().from(gyms).where(eq(gyms.ownerId, ownerId)).orderBy(gyms.name);
    return localize(rows, locale);
  },
  async ownerLeads(ownerId: string) {
    const owned = await db.select({ id: gyms.id, name: gyms.name }).from(gyms).where(eq(gyms.ownerId, ownerId));
    if (!owned.length) return [];
    const gymIds = owned.map((g) => g.id);
    const nameById = new Map(owned.map((g) => [g.id, g.name]));
    const rows = await db.select({
      id: gymMembershipRequests.id, status: gymMembershipRequests.status, plan: gymMembershipRequests.plan, createdAt: gymMembershipRequests.createdAt,
      gymId: gymMembershipRequests.gymId, userId: gymMembershipRequests.userId, userName: users.name, userPhone: users.phone, userEmail: users.email,
    }).from(gymMembershipRequests)
      .leftJoin(users, eq(gymMembershipRequests.userId, users.id))
      .where(inArray(gymMembershipRequests.gymId, gymIds))
      .orderBy(desc(gymMembershipRequests.createdAt));
    return rows.map((r) => ({ ...r, gymName: nameById.get(r.gymId) ?? null }));
  },
  async ownerUpdateLeadStatus(ownerId: string, id: string, status: string) {
    const [req] = await db.select().from(gymMembershipRequests).where(eq(gymMembershipRequests.id, id));
    if (!req) throw new ApiError(404, "NOT_FOUND", "Lead not found");
    const [g] = await db.select().from(gyms).where(and(eq(gyms.id, req.gymId), eq(gyms.ownerId, ownerId)));
    if (!g) throw new ApiError(403, "FORBIDDEN", "Not your gym");
    return this.adminUpdateRequestStatus(id, status); // reuse: approve→membership
  },

  async adminUpdateRequestStatus(id: string, status: string) {
    const [row] = await db.update(gymMembershipRequests).set({ status }).where(eq(gymMembershipRequests.id, id)).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Request not found");
    // approving a request activates a membership (idempotent via unique userId+gymId)
    if (status === "approved") {
      await db.insert(gymMemberships).values({ gymId: row.gymId, userId: row.userId, plan: row.plan, status: "active" })
        .onConflictDoUpdate({ target: [gymMemberships.userId, gymMemberships.gymId], set: { status: "active", plan: row.plan } });
    }
    return row;
  },

  // ── classes ──────────────────────────────────────────────────────────────────
  // classes for a gym, hydrated with coach name + enrolled count + this user's status
  // hydrate class rows with coachName + enrolledCount + this user's status
  async _hydrateClasses(rows: any[], userId?: string, locale?: string) {
    rows = await localizeClasses(rows, locale);
    if (!rows.length) return [];
    const classIds = rows.map((r) => r.id);
    const coachIds = [...new Set(rows.map((r) => r.coachId).filter(Boolean) as string[])];
    const coaches = coachIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, coachIds)) : [];
    const coachName = new Map(coaches.map((c) => [c.id, c.name]));
    const enrolls = await db.select().from(classEnrollments).where(inArray(classEnrollments.classId, classIds));
    const counts = new Map<string, number>();
    const mine = new Map<string, string>();
    for (const e of enrolls) {
      if (e.status === "enrolled") counts.set(e.classId, (counts.get(e.classId) ?? 0) + 1);
      if (userId && e.userId === userId) mine.set(e.classId, e.status);
    }
    return rows.map((c) => ({
      ...c,
      coachName: c.coachId ? coachName.get(c.coachId) ?? null : null,
      enrolledCount: counts.get(c.id) ?? 0,
      myStatus: mine.get(c.id) ?? null,
    }));
  },
  async listClasses(gymId: string, userId?: string, locale?: string) {
    const rows = await db.select().from(gymClasses).where(and(eq(gymClasses.gymId, gymId), eq(gymClasses.isActive, true))).orderBy(gymClasses.startTime);
    return this._hydrateClasses(rows, userId, locale);
  },
  // sessions of an event (same join flow as gym classes)
  async listEventClasses(eventId: string, userId?: string, locale?: string) {
    const rows = await db.select().from(gymClasses).where(and(eq(gymClasses.eventId, eventId), eq(gymClasses.isActive, true))).orderBy(gymClasses.startTime);
    return this._hydrateClasses(rows, userId, locale);
  },

  async requestJoinClass(userId: string, classId: string) {
    const [cls] = await db.select().from(gymClasses).where(eq(gymClasses.id, classId));
    if (!cls) throw new ApiError(404, "NOT_FOUND", "Class not found");
    // The gym owner/manager (or the host-event's owner) can't enroll in their own
    // class. A class belongs to a gym directly, or to an event (gymId null) —
    // resolve the owning gym/owner either way.
    let gymId = cls.gymId as string | null;
    let eventOwnerId: string | null = null;
    if (!gymId && cls.eventId) {
      const [ev] = await db.select({ gymId: events.gymId, ownerId: events.ownerId }).from(events).where(eq(events.id, cls.eventId));
      gymId = ev?.gymId ?? null;
      eventOwnerId = ev?.ownerId ?? null;
    }
    if ((gymId && (await this.canManageGym(userId, gymId))) || (eventOwnerId && eventOwnerId === userId)) {
      throw new ApiError(403, "FORBIDDEN", "You manage this — you can't enroll in it");
    }
    // re-request after rejection/expiry resets to pending; unique userId+classId keeps one row
    const [row] = await db.insert(classEnrollments).values({ classId, userId, status: "pending" })
      .onConflictDoUpdate({ target: [classEnrollments.userId, classEnrollments.classId], set: { status: "pending", expiresAt: null } })
      .returning();
    return row;
  },
  // athlete rolls back their class enrollment/request
  async cancelClassEnrollment(userId: string, classId: string) {
    await db.delete(classEnrollments)
      .where(and(eq(classEnrollments.userId, userId), eq(classEnrollments.classId, classId)));
    return { ok: true };
  },

  // user's class enrollments (any status) with class + gym context
  async myClasses(userId: string, locale?: string) {
    const enrolls = await db.select().from(classEnrollments).where(eq(classEnrollments.userId, userId)).orderBy(desc(classEnrollments.createdAt));
    if (!enrolls.length) return [];
    let clsRows = await db.select().from(gymClasses).where(inArray(gymClasses.id, enrolls.map((e) => e.classId)));
    clsRows = await localizeClasses(clsRows, locale);
    const clsById = new Map(clsRows.map((c) => [c.id, c]));
    const gymIds = [...new Set(clsRows.map((c) => c.gymId).filter(Boolean) as string[])];
    const gymRows = gymIds.length ? await db.select({ id: gyms.id, name: gyms.name }).from(gyms).where(inArray(gyms.id, gymIds)) : [];
    const gymName = new Map(gymRows.map((g) => [g.id, g.name]));
    return enrolls.map((e) => {
      const c = clsById.get(e.classId);
      return { id: e.id, status: e.status, expiresAt: e.expiresAt, classId: e.classId,
        title: c?.title ?? "", startTime: c?.startTime ?? null, dayOfWeek: c?.dayOfWeek ?? null,
        gymId: c?.gymId ?? null, gymName: c?.gymId ? gymName.get(c.gymId) ?? null : null };
    }).filter((x) => x.title);
  },

  // coach inbox: pending/enrolled requests for classes this coach teaches, with requester contact
  async coachClassRequests(coachId: string) {
    const cls = await db.select({ id: gymClasses.id, title: gymClasses.title }).from(gymClasses).where(eq(gymClasses.coachId, coachId));
    if (!cls.length) return [];
    const titleById = new Map(cls.map((c) => [c.id, c.title]));
    const rows = await db.select({
      id: classEnrollments.id, status: classEnrollments.status, expiresAt: classEnrollments.expiresAt, createdAt: classEnrollments.createdAt,
      classId: classEnrollments.classId, userId: classEnrollments.userId,
      userName: users.name, userPhone: users.phone, userEmail: users.email,
    }).from(classEnrollments)
      .leftJoin(users, eq(classEnrollments.userId, users.id))
      .where(inArray(classEnrollments.classId, cls.map((c) => c.id)))
      .orderBy(desc(classEnrollments.createdAt));
    return rows.map((r) => ({ ...r, className: titleById.get(r.classId) ?? null }));
  },

  async coachUpdateEnrollment(coachId: string, enrollmentId: string, status: string) {
    const [en] = await db.select().from(classEnrollments).where(eq(classEnrollments.id, enrollmentId));
    if (!en) throw new ApiError(404, "NOT_FOUND", "Enrollment not found");
    const [cls] = await db.select().from(gymClasses).where(and(eq(gymClasses.id, en.classId), eq(gymClasses.coachId, coachId)));
    if (!cls) throw new ApiError(403, "FORBIDDEN", "Not your class");
    const expiresAt = status === "enrolled" ? new Date(Date.now() + CLASS_ENROLL_DAYS * 86400000) : null;
    const [row] = await db.update(classEnrollments).set({ status, expiresAt }).where(eq(classEnrollments.id, enrollmentId)).returning();
    return row;
  },

  // ── admin class CRUD ─────────────────────────────────────────────────────────
  // list classes by gym OR event (pass whichever)
  async adminListClasses(opts: { gymId?: string; eventId?: string }) {
    const cond = opts.eventId ? eq(gymClasses.eventId, opts.eventId) : eq(gymClasses.gymId, String(opts.gymId));
    const rows = await db.select().from(gymClasses).where(cond).orderBy(gymClasses.startTime);
    const trs = await db.select().from(classTranslations);
    return rows.map((c) => ({
      ...c,
      translations: Object.fromEntries(trs.filter((t) => t.classId === c.id).map((t) => [t.locale, { title: t.title ?? undefined, description: t.description ?? undefined }])),
    }));
  },
  async _setClassTranslations(classId: string, translations?: Record<string, { title?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(classTranslations).values({ classId, locale, title: v.title ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [classTranslations.classId, classTranslations.locale], set: { title: v.title ?? null, description: v.description ?? null } });
    }
  },
  async adminCreateClass(data: AdminClassInput) {
    const { translations, ...cols } = data;
    const [row] = await db.insert(gymClasses).values(cols as any).returning();
    await this._setClassTranslations(row.id, translations);
    return row;
  },
  async adminUpdateClass(id: string, data: Partial<AdminClassInput>) {
    const { translations, ...cols } = data;
    if (Object.keys(cols).length) {
      const [row] = await db.update(gymClasses).set(cols as any).where(eq(gymClasses.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Class not found");
    }
    await this._setClassTranslations(id, translations);
    const [row] = await db.select().from(gymClasses).where(eq(gymClasses.id, id));
    return row;
  },
  async adminDeleteClass(id: string) {
    await db.delete(gymClasses).where(eq(gymClasses.id, id));
  },

  // ── team & manager self-service ──────────────────────────────────────────────
  // owner (gyms.ownerId) or a gym_team member may manage the gym
  async canManageGym(userId: string, gymId: string) {
    const [g] = await db.select({ ownerId: gyms.ownerId }).from(gyms).where(eq(gyms.id, gymId));
    if (!g) return false;
    if (g.ownerId === userId) return true;
    const [m] = await db.select().from(gymTeam).where(and(eq(gymTeam.gymId, gymId), eq(gymTeam.userId, userId)));
    return !!m;
  },

  // gyms this user can manage (owned + team member), with isOwner flag
  async managedGyms(userId: string, locale?: string) {
    const owned = await db.select().from(gyms).where(eq(gyms.ownerId, userId));
    const team = await db.select({ gymId: gymTeam.gymId }).from(gymTeam).where(eq(gymTeam.userId, userId));
    const teamIds = team.map((t) => t.gymId).filter((gid) => !owned.some((g) => g.id === gid));
    let teamGyms = teamIds.length ? await db.select().from(gyms).where(inArray(gyms.id, teamIds)) : [];
    const all = await localize([...owned, ...teamGyms], locale);
    const ownedSet = new Set(owned.map((g) => g.id));
    return all.map((g) => ({ ...g, isOwner: ownedSet.has(g.id) }));
  },

  // manager/owner edit — whitelist of self-service editable fields (+ AR name/description)
  async updateManagedGym(userId: string, gymId: string, patch: Record<string, any>, translations?: Record<string, { name?: string; description?: string }>) {
    if (!(await this.canManageGym(userId, gymId))) throw new ApiError(403, "FORBIDDEN", "Not your gym");
    const ALLOWED = ["name", "description", "phone", "whatsapp", "workingHours", "address", "city", "lat", "lng", "logoUrl", "coverUrl", "types", "facilityIds", "subscriptions", "schedule"];
    const cols: Record<string, any> = {};
    for (const k of ALLOWED) if (k in patch) cols[k] = patch[k];
    if (Object.keys(cols).length) await db.update(gyms).set({ ...cols, updatedAt: new Date() }).where(eq(gyms.id, gymId));
    await this._setTranslations(gymId, translations);
    const [row] = await db.select().from(gyms).where(eq(gyms.id, gymId));
    return row;
  },

  async gymTeamMembers(gymId: string) {
    const [g] = await db.select({ ownerId: gyms.ownerId }).from(gyms).where(eq(gyms.id, gymId));
    const team = await db.select({
      id: gymTeam.id, userId: gymTeam.userId, role: gymTeam.role,
      name: users.name, email: users.email, avatarUrl: users.avatarUrl,
    }).from(gymTeam).leftJoin(users, eq(gymTeam.userId, users.id)).where(eq(gymTeam.gymId, gymId));
    let owner: any = null;
    if (g?.ownerId) {
      const [o] = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, g.ownerId));
      if (o) owner = { ...o, role: "owner" };
    }
    return { owner, members: team };
  },

  // owner-only: add a manager by email
  async addTeamMember(ownerId: string, gymId: string, email: string) {
    const [g] = await db.select().from(gyms).where(eq(gyms.id, gymId));
    if (!g) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    if (g.ownerId !== ownerId) throw new ApiError(403, "FORBIDDEN", "Only the owner can add managers");
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (!u) throw new ApiError(404, "USER_NOT_FOUND", "No user with that email");
    if (u.id === ownerId) throw new ApiError(400, "ALREADY_OWNER", "You already own this gym");
    const [row] = await db.insert(gymTeam).values({ gymId, userId: u.id, addedBy: ownerId })
      .onConflictDoNothing({ target: [gymTeam.userId, gymTeam.gymId] }).returning();
    return row ?? { alreadyMember: true };
  },

  async removeTeamMember(ownerId: string, gymId: string, memberId: string) {
    const [g] = await db.select().from(gyms).where(eq(gyms.id, gymId));
    if (!g) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    if (g.ownerId !== ownerId) throw new ApiError(403, "FORBIDDEN", "Only the owner can remove managers");
    await db.delete(gymTeam).where(and(eq(gymTeam.id, memberId), eq(gymTeam.gymId, gymId)));
  },

  // admin: add by userId / remove (no owner check)
  async adminAddTeamMember(gymId: string, userId: string) {
    const [row] = await db.insert(gymTeam).values({ gymId, userId })
      .onConflictDoNothing({ target: [gymTeam.userId, gymTeam.gymId] }).returning();
    return row ?? { alreadyMember: true };
  },
  async adminRemoveTeamMember(id: string) {
    await db.delete(gymTeam).where(eq(gymTeam.id, id));
  },

  // ── reviews & ratings ────────────────────────────────────────────────────────
  async listReviews(gymId: string, userId?: string) {
    const rows = await db.select({
      id: gymReviews.id, rating: gymReviews.rating, comment: gymReviews.comment, createdAt: gymReviews.createdAt,
      userId: gymReviews.userId, userName: users.name, userAvatar: users.avatarUrl,
    }).from(gymReviews)
      .leftJoin(users, eq(gymReviews.userId, users.id))
      .where(eq(gymReviews.gymId, gymId))
      .orderBy(desc(gymReviews.createdAt));
    // surface the caller's own review first (so mobile can prefill the editor)
    return rows.map((r) => ({ ...r, mine: userId ? r.userId === userId : false }));
  },

  async _recomputeRating(gymId: string) {
    const [agg] = await db.select({ avg: sql<number>`coalesce(avg(rating),0)::float`, count: sql<number>`count(*)::int` })
      .from(gymReviews).where(eq(gymReviews.gymId, gymId));
    await db.update(gyms).set({ rating: Math.round((agg?.avg ?? 0) * 10) / 10, reviewsCount: agg?.count ?? 0, updatedAt: new Date() }).where(eq(gyms.id, gymId));
  },

  async upsertReview(userId: string, gymId: string, rating: number, comment?: string) {
    const [gym] = await db.select({ id: gyms.id }).from(gyms).where(eq(gyms.id, gymId));
    if (!gym) throw new ApiError(404, "NOT_FOUND", "Gym not found");
    const [row] = await db.insert(gymReviews).values({ gymId, userId, rating, comment: comment ?? "" })
      .onConflictDoUpdate({ target: [gymReviews.userId, gymReviews.gymId], set: { rating, comment: comment ?? "", createdAt: new Date() } })
      .returning();
    await this._recomputeRating(gymId);
    return row;
  },

  async deleteReview(userId: string, id: string, isAdmin = false) {
    const [rev] = await db.select().from(gymReviews).where(eq(gymReviews.id, id));
    if (!rev) throw new ApiError(404, "NOT_FOUND", "Review not found");
    if (!isAdmin && rev.userId !== userId) throw new ApiError(403, "FORBIDDEN", "Not your review");
    await db.delete(gymReviews).where(eq(gymReviews.id, id));
    await this._recomputeRating(rev.gymId);
  },

  // ── facility catalog ────────────────────────────────────────────────────────
  async listFacilities(locale?: string) {
    const fmap = await facilityMap(locale);
    return [...fmap.values()].sort((a, b) => a.title.localeCompare(b.title));
  },
  async adminListFacilities() {
    const rows = await db.select().from(facilities).orderBy(facilities.title);
    const trs = await db.select().from(facilityTranslations);
    return rows.map((fac) => ({
      ...fac,
      translations: Object.fromEntries(trs.filter((t) => t.facilityId === fac.id).map((t) => [t.locale, { title: t.title ?? undefined, description: t.description ?? undefined }])),
    }));
  },
  async _setFacilityTranslations(facilityId: string, translations?: Record<string, { title?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(facilityTranslations).values({ facilityId, locale, title: v.title ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [facilityTranslations.facilityId, facilityTranslations.locale], set: { title: v.title ?? null, description: v.description ?? null } });
    }
  },
  async adminCreateFacility(data: AdminFacilityInput) {
    const { translations, ...cols } = data;
    const [row] = await db.insert(facilities).values(cols as any).returning();
    await this._setFacilityTranslations(row.id, translations);
    return row;
  },
  async adminUpdateFacility(id: string, data: Partial<AdminFacilityInput>) {
    const { translations, ...cols } = data;
    if (Object.keys(cols).length) {
      const [row] = await db.update(facilities).set(cols as any).where(eq(facilities.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Facility not found");
    }
    await this._setFacilityTranslations(id, translations);
    const [row] = await db.select().from(facilities).where(eq(facilities.id, id));
    return row;
  },
  async adminDeleteFacility(id: string) {
    await db.delete(facilities).where(eq(facilities.id, id));
  },
};
