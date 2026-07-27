import { and, eq, asc } from "drizzle-orm";
import { db } from "../../core/db";
import { programs, programDays } from "./programs.db";
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
      label: d.label ?? "", notes: d.notes ?? "",
    })));
  }
}

export const programsService = {
  async list(userId: string) {
    const rows = await db.select().from(programs).where(eq(programs.userId, userId)).orderBy(asc(programs.createdAt));
    const out = [];
    for (const p of rows) out.push({ ...p, days: await daysFor(p.id) });
    return out;
  },

  async get(userId: string, id: string) {
    const [p] = await db.select().from(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
    if (!p) return null;
    return { ...p, days: await daysFor(p.id) };
  },

  async create(userId: string, data: ProgramCreate) {
    const [row] = await db.insert(programs).values({
      ...(data.id ? { id: data.id } : {}),
      userId, name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      weeks: data.weeks, notes: data.notes,
    }).returning();
    await replaceDays(row.id, data.days);
    return this.get(userId, row.id);
  },

  async update(userId: string, id: string, data: ProgramCreate) {
    const [p] = await db.select().from(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
    if (!p) return null;
    await db.update(programs).set({
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate) : null,
      weeks: data.weeks, notes: data.notes,
    }).where(eq(programs.id, id));
    await replaceDays(id, data.days);
    return this.get(userId, id);
  },

  async remove(userId: string, id: string) {
    await db.delete(programs).where(and(eq(programs.id, id), eq(programs.userId, userId)));
  },
};
