import { and, eq, asc, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../../core/db";
import { programs, programDays, programShares } from "./programs.db";
import { users } from "../identity/identity.db";
import type { ProgramCreate } from "./programs.schema";

async function daysFor(programId: string) {
  return db.select().from(programDays).where(eq(programDays.programId, programId))
    .orderBy(asc(programDays.weekIndex), asc(programDays.dayIndex));
}

async function replaceDays(programId: string, days: ProgramCreate["days"]) {
  await db.delete(programDays).where(eq(programDays.programId, programId));
  if (days.length) {
    await db.insert(programDays).values(days.map((d) => ({
      programId, weekIndex: d.weekIndex, dayIndex: d.dayIndex,
      restDay: !!d.restDay, templateId: d.templateId ?? null,
      name: d.name ?? "", exercises: d.exercises ?? [],
      label: d.label ?? "", notes: d.notes ?? "",
    })));
  }
}

// original = user-authored (can be shared); snapshot = received copy (cannot re-share)
const isExpired = (p: { sourceOwnerId: string | null; accessExpiresAt: Date | null }) =>
  !!p.sourceOwnerId && !!p.accessExpiresAt && p.accessExpiresAt.getTime() < Date.now();

const decorate = (p: any) => ({ ...p, canShare: !p.sourceOwnerId, expired: isExpired(p) });

const genCode = () => randomBytes(5).toString("hex").slice(0, 8).toUpperCase();

export const programsService = {
  async list(userId: string) {
    const rows = await db.select().from(programs).where(eq(programs.userId, userId)).orderBy(asc(programs.createdAt));
    const out = [];
    for (const p of rows) out.push({ ...decorate(p), days: await daysFor(p.id) });
    return out;
  },

  async get(userId: string, id: string) {
    const [p] = await db.select().from(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
    if (!p) return null;
    return { ...decorate(p), days: await daysFor(p.id) };
  },

  async create(userId: string, data: ProgramCreate) {
    const [row] = await db.insert(programs).values({
      ...(data.id ? { id: data.id } : {}),
      userId, name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      weeks: data.weeks, notes: data.notes, weekMeta: data.weekMeta ?? [],
    }).returning();
    await replaceDays(row.id, data.days);
    return this.get(userId, row.id);
  },

  async update(userId: string, id: string, data: ProgramCreate) {
    // snapshots are editable by their owner, but weeks/days edits stay local (no re-share)
    const [p] = await db.select().from(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
    if (!p) return null;
    await db.update(programs).set({
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      weeks: data.weeks, notes: data.notes, weekMeta: data.weekMeta ?? [],
    }).where(eq(programs.id, id));
    await replaceDays(id, data.days);
    return this.get(userId, id);
  },

  async remove(userId: string, id: string) {
    await db.delete(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
  },

  // ── sharing ────────────────────────────────────────────────────────────────
  // Share an ORIGINAL program (snapshots cannot be re-shared). Returns the share (+code).
  async share(userId: string, programId: string, input: {
    toUserId?: string | null; generateCode?: boolean;
    claimExpiresAt?: string | null; accessExpiresAt?: string | null;
  }) {
    const [p] = await db.select().from(programs).where(and(eq(programs.id, programId), eq(programs.userId, userId)));
    if (!p) return { error: "not_found" as const };
    if (p.sourceOwnerId) return { error: "cannot_reshare" as const };
    const code = input.generateCode ? genCode() : null;
    const [share] = await db.insert(programShares).values({
      programId, fromUserId: userId,
      toUserId: input.toUserId ?? null,
      code,
      claimExpiresAt: input.claimExpiresAt ? new Date(input.claimExpiresAt) : null,
      accessExpiresAt: input.accessExpiresAt ? new Date(input.accessExpiresAt) : null,
      status: "pending",
    }).returning();
    return { share };
  },

  // Incoming pending invites for me (direct shares), joined with program + owner names.
  async invites(userId: string) {
    const rows = await db.select({
      id: programShares.id, programId: programShares.programId,
      claimExpiresAt: programShares.claimExpiresAt, accessExpiresAt: programShares.accessExpiresAt,
      createdAt: programShares.createdAt,
      programName: programs.name, weeks: programs.weeks,
      ownerName: users.name, ownerUsername: users.username,
    })
      .from(programShares)
      .innerJoin(programs, eq(programs.id, programShares.programId))
      .innerJoin(users, eq(users.id, programShares.fromUserId))
      .where(and(eq(programShares.toUserId, userId), eq(programShares.status, "pending")))
      .orderBy(desc(programShares.createdAt));
    const now = Date.now();
    return rows.filter((r) => !r.claimExpiresAt || r.claimExpiresAt.getTime() >= now);
  },

  async accept(userId: string, shareId: string) {
    const [s] = await db.select().from(programShares)
      .where(and(eq(programShares.id, shareId), eq(programShares.toUserId, userId), eq(programShares.status, "pending")));
    if (!s) return { error: "not_found" as const };
    return this._claimShare(userId, s);
  },

  async decline(userId: string, shareId: string) {
    await db.update(programShares).set({ status: "declined" })
      .where(and(eq(programShares.id, shareId), eq(programShares.toUserId, userId), eq(programShares.status, "pending")));
    return { ok: true };
  },

  async claimByCode(userId: string, code: string) {
    const [s] = await db.select().from(programShares)
      .where(and(eq(programShares.code, code.toUpperCase()), eq(programShares.status, "pending")));
    if (!s) return { error: "not_found" as const };
    if (s.toUserId && s.toUserId !== userId) return { error: "not_found" as const };
    return this._claimShare(userId, s);
  },

  // shared internal: validate claim window, snapshot-copy, mark accepted
  async _claimShare(userId: string, s: typeof programShares.$inferSelect) {
    if (s.claimExpiresAt && s.claimExpiresAt.getTime() < Date.now()) {
      await db.update(programShares).set({ status: "expired" }).where(eq(programShares.id, s.id));
      return { error: "expired" as const };
    }
    if (s.fromUserId === userId) return { error: "own_program" as const };
    const newId = await this._snapshot(s.programId, userId, s.fromUserId, s.accessExpiresAt);
    if (!newId) return { error: "not_found" as const };
    await db.update(programShares).set({ status: "accepted", acceptedAt: new Date(), toUserId: userId })
      .where(eq(programShares.id, s.id));
    return { program: await this.get(userId, newId) };
  },

  // deep-copy a program + its days into a new row owned by the recipient
  async _snapshot(programId: string, recipientId: string, sourceOwnerId: string, accessExpiresAt: Date | null) {
    const [orig] = await db.select().from(programs).where(eq(programs.id, programId));
    if (!orig) return null;
    const [row] = await db.insert(programs).values({
      userId: recipientId, name: orig.name, startDate: null,
      weeks: orig.weeks, notes: orig.notes, weekMeta: orig.weekMeta,
      sourceOwnerId, accessExpiresAt,
    }).returning();
    const days = await daysFor(programId);
    if (days.length) {
      await db.insert(programDays).values(days.map((d) => ({
        programId: row.id, weekIndex: d.weekIndex, dayIndex: d.dayIndex,
        restDay: d.restDay, templateId: d.templateId,
        name: d.name, exercises: d.exercises, label: d.label, notes: d.notes,
      })));
    }
    return row.id;
  },
};
