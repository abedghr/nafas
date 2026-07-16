import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../core/db";
import { users, coachProfiles, type User } from "./identity.db";
import { ApiError } from "../../middleware/error";
import type { PaginationQuery } from "../../core/http";
import type { UpdateMe, CoachProfileInput, AdminUserUpdate } from "./identity.schema";

export function toPublic(u: User) {
  return {
    id: u.id, name: u.name, username: u.username,
    avatarUrl: u.avatarUrl, bio: u.bio, rank: u.rank, role: u.role,
  };
}

export function toMe(u: User) {
  return {
    ...toPublic(u),
    email: u.email, phone: u.phone, countryId: u.countryId,
    language: u.language, theme: u.theme,
    height: u.height, weight: u.weight, age: u.age, gender: u.gender, goal: u.goal,
    interests: u.interests ?? [],
    profileComplete: u.profileComplete, status: u.status,
  };
}

export const identityService = {
  // ── lookups (also used by auth) ───────────────────────────────
  async findByEmail(email: string) {
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return u;
  },
  async findById(id: string) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  },
  async usernameAvailable(username: string) {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.username, username.toLowerCase()));
    return !u;
  },
  // typeahead for managers adding people (name / username / email), athletes only
  async search(q: string, limit = 20) {
    const like = `%${q}%`;
    const rows = await db.select({ id: users.id, name: users.name, username: users.username, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(and(eq(users.status, "active"), or(ilike(users.name, like), ilike(users.username, like), ilike(users.email, like))))
      .limit(limit);
    return rows;
  },

  // ── self ──────────────────────────────────────────────────────
  async getMe(id: string) {
    const u = await this.findById(id);
    if (!u) throw new ApiError(404, "NOT_FOUND", "User not found");
    return toMe(u);
  },
  async updateMe(id: string, data: UpdateMe) {
    if (data.username) {
      const free = await this.usernameAvailable(data.username);
      const u = await this.findById(id);
      if (!free && u?.username !== data.username.toLowerCase()) {
        throw new ApiError(409, "CONFLICT", "Username taken");
      }
      data = { ...data, username: data.username.toLowerCase() };
    }
    if (data.email) {
      const email = data.email.toLowerCase();
      const existing = await this.findByEmail(email);
      if (existing && existing.id !== id) {
        throw new ApiError(409, "CONFLICT", "Email already in use");
      }
      // ponytail: prototype allows direct email change while authenticated; add
      // re-verification (reset emailVerifiedAt + OTP) when email delivery lands.
      data = { ...data, email };
    }
    const [u] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return toMe(u);
  },

  async deleteMe(id: string) {
    const u = await this.findById(id);
    if (!u) throw new ApiError(404, "NOT_FOUND", "User not found");
    // workout_types.userId has no ON DELETE cascade; clear owned rows first.
    // Everything else (logs, templates, nutrition, inbody, refresh tokens,
    // coach profile) cascades via FK.
    await db.execute(sql`delete from workout_types where user_id = ${id}`);
    await db.delete(users).where(eq(users.id, id));
  },

  async getPublic(idOrUsername: string) {
    const [u] = await db.select().from(users).where(
      or(eq(users.username, idOrUsername.toLowerCase()),
         sql`${users.id}::text = ${idOrUsername}`),
    );
    if (!u) throw new ApiError(404, "NOT_FOUND", "User not found");
    return toPublic(u);
  },

  // ── coach profile ───────────────────────────────────────────────
  async upsertCoachProfile(userId: string, data: CoachProfileInput) {
    const [existing] = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, userId));
    if (existing) {
      const [row] = await db.update(coachProfiles).set(data).where(eq(coachProfiles.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(coachProfiles).values({ userId, ...data }).returning();
    return row;
  },

  // ── admin ───────────────────────────────────────────────────────
  async adminList(q: PaginationQuery) {
    const where = q.search
      ? or(ilike(users.name, `%${q.search}%`), ilike(users.email, `%${q.search}%`), ilike(users.username, `%${q.search}%`))
      : undefined;
    const offset = (q.page - 1) * q.perPage;
    const rows = await db.select().from(users).where(where).limit(q.perPage).offset(offset).orderBy(users.createdAt);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(where);
    return { rows: rows.map(toMe), total: count };
  },
  async adminGet(id: string) {
    const u = await this.findById(id);
    if (!u) throw new ApiError(404, "NOT_FOUND", "User not found");
    return toMe(u);
  },
  async adminUpdate(id: string, data: AdminUserUpdate) {
    const existing = await this.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "User not found");
    const [u] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return toMe(u);
  },
};
