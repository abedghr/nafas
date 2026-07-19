import { and, desc, eq, inArray, isNull, lt, or, sql, ilike } from "drizzle-orm";
import { db } from "../../core/db";
import {
  workoutTypes, exercises, exerciseWorkoutTypes, exerciseBodyTargets,
  workoutTemplates, workoutLogs, activeSessions,
  exerciseTranslations, workoutTypeTranslations,
} from "./workout.db";
import { ApiError } from "../../middleware/error";
import type { TemplateCreate, LogCreate } from "./workout.schema";

async function hydrateExercises(
  rows: { id: string; name: string; description: string; measurementType: string; isCustom: boolean }[],
  locale = "en",
) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const links = await db
    .select({ exerciseId: exerciseWorkoutTypes.exerciseId, typeName: workoutTypes.name })
    .from(exerciseWorkoutTypes)
    .innerJoin(workoutTypes, eq(workoutTypes.id, exerciseWorkoutTypes.workoutTypeId))
    .where(inArray(exerciseWorkoutTypes.exerciseId, ids));
  const targets = await db.select().from(exerciseBodyTargets).where(inArray(exerciseBodyTargets.exerciseId, ids));
  // localized name/description (base columns = English fallback)
  const trByEx = new Map<string, { name: string | null; description: string | null }>();
  if (locale !== "en") {
    const trs = await db.select().from(exerciseTranslations)
      .where(and(eq(exerciseTranslations.locale, locale), inArray(exerciseTranslations.exerciseId, ids)));
    for (const t of trs) trByEx.set(t.exerciseId, { name: t.name, description: t.description });
  }
  // group by exerciseId once (O(n)) instead of filtering per row (O(n·m))
  const typesByEx = new Map<string, string[]>();
  for (const l of links) (typesByEx.get(l.exerciseId) ?? typesByEx.set(l.exerciseId, []).get(l.exerciseId)!).push(l.typeName);
  const targetsByEx = new Map<string, { bodyTarget: string; percentage: number }[]>();
  for (const t of targets) (targetsByEx.get(t.exerciseId) ?? targetsByEx.set(t.exerciseId, []).get(t.exerciseId)!).push({ bodyTarget: t.bodyTarget, percentage: t.percentage });
  return rows.map((r) => {
    const tr = trByEx.get(r.id);
    return {
      ...r,
      name: tr?.name || r.name,
      description: tr?.description || r.description,
      workoutTypes: typesByEx.get(r.id) ?? [],
      bodyTargets: targetsByEx.get(r.id) ?? [],
    };
  });
}

export const workoutService = {
  // ── library ──────────────────────────────────────────────────────────────
  async listWorkoutTypes(locale = "en") {
    const rows = await db
      .select({
        id: workoutTypes.id, name: workoutTypes.name, description: workoutTypes.description,
        trName: workoutTypeTranslations.name, trDesc: workoutTypeTranslations.description,
      })
      .from(workoutTypes)
      .leftJoin(workoutTypeTranslations, and(
        eq(workoutTypeTranslations.workoutTypeId, workoutTypes.id),
        eq(workoutTypeTranslations.locale, locale),
      ))
      .where(isNull(workoutTypes.userId)).orderBy(workoutTypes.name);
    return rows.map((r) => ({ id: r.id, name: r.trName || r.name, description: r.trDesc || r.description }));
  },

  async listExercises(opts: { search?: string; typeId?: string; userId?: string; locale?: string }) {
    // system rows (userId null) + this user's custom rows
    const userScope = opts.userId
      ? or(isNull(exercises.userId), eq(exercises.userId, opts.userId))
      : isNull(exercises.userId);
    const conds: any[] = [userScope];
    if (opts.search) {
      const like = `%${opts.search}%`;
      // match English base name OR any-locale translation (cross-language search)
      const tr = await db.select({ id: exerciseTranslations.exerciseId }).from(exerciseTranslations).where(ilike(exerciseTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      conds.push(ids.length ? or(ilike(exercises.name, like), inArray(exercises.id, ids)) : ilike(exercises.name, like));
    }
    // type filter pushed to SQL (uses ewt_type_idx), not filtered in JS
    if (opts.typeId) {
      conds.push(inArray(
        exercises.id,
        db.select({ id: exerciseWorkoutTypes.exerciseId }).from(exerciseWorkoutTypes)
          .where(eq(exerciseWorkoutTypes.workoutTypeId, opts.typeId)),
      ));
    }
    const rows = await db.select().from(exercises).where(and(...conds))
      .orderBy(exercises.name).limit(500); // library is bounded (~100s); hard cap as a guard
    return hydrateExercises(rows, opts.locale ?? "en");
  },

  // ── templates ────────────────────────────────────────────────────────────
  async listTemplates(userId: string) {
    return db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).orderBy(desc(workoutTemplates.createdAt));
  },
  async createTemplate(userId: string, data: TemplateCreate) {
    // dedup: same user + same name + identical exercises → return the existing one, don't duplicate.
    // canonical serialize (sorted keys) because pg jsonb doesn't preserve key order.
    const canon = (v: any): string => {
      if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
      if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${k}:${canon(v[k])}`).join(",")}}`;
      return JSON.stringify(v);
    };
    const sig = canon(data.exercises ?? []);
    const mine = await db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId));
    // identical content under the same name → return it, never duplicate
    const dup = mine.find((r) => r.name === data.name && canon(r.exercises ?? []) === sig);
    if (dup) return dup;
    // different content but colliding name → auto-suffix ("Pull Day" → "Pull Day 2", "Pull Day 3", …)
    const taken = new Set(mine.map((r) => r.name));
    let name = data.name;
    for (let n = 2; taken.has(name); n++) name = `${data.name} ${n}`;
    const [row] = await db.insert(workoutTemplates).values({
      userId, name, workoutTypeId: data.workoutTypeId, exercises: data.exercises,
    }).returning();
    return row;
  },
  async updateTemplate(userId: string, id: string, data: TemplateCreate) {
    const [row] = await db.update(workoutTemplates)
      .set({ name: data.name, workoutTypeId: data.workoutTypeId, exercises: data.exercises })
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId))).returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Template not found");
    return row;
  },
  async deleteTemplate(userId: string, id: string) {
    await db.delete(workoutTemplates).where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
  },

  // ── logs ─────────────────────────────────────────────────────────────────
  async listLogs(userId: string, page = 1, perPage = 30) {
    const offset = (page - 1) * perPage;
    const rows = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.date)).limit(perPage).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(workoutLogs).where(eq(workoutLogs.userId, userId));
    return { rows, total: count };
  },
  async getLog(userId: string, id: string) {
    const [row] = await db.select().from(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Log not found");
    return row;
  },
  async createLog(userId: string, data: LogCreate) {
    const [row] = await db.insert(workoutLogs).values({
      userId, templateId: data.templateId, name: data.name, workoutTypeId: data.workoutTypeId,
      date: new Date(data.date), durationMinutes: data.durationMinutes, preWorkout: data.preWorkout,
      totalVolumeKg: String(data.totalVolumeKg), totalSets: data.totalSets, completedSets: data.completedSets,
      skippedSets: data.skippedSets, totalReps: data.totalReps, aiInsight: data.aiInsight, exercises: data.exercises,
    }).returning();
    return row;
  },
  async deleteLog(userId: string, id: string) {
    await db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  },
  // progress vs previous log of the same name
  async progress(userId: string, id: string) {
    const cur = await this.getLog(userId, id);
    const [prev] = await db.select().from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.name, cur.name), lt(workoutLogs.date, cur.date)))
      .orderBy(desc(workoutLogs.date)).limit(1);
    if (!prev) return { current: cur, previous: null, deltas: null };
    const n = (x: string | number) => Number(x);
    return {
      current: cur, previous: prev,
      deltas: {
        volumeKg: n(cur.totalVolumeKg) - n(prev.totalVolumeKg),
        durationMinutes: cur.durationMinutes - prev.durationMinutes,
        totalSets: cur.totalSets - prev.totalSets,
        totalReps: cur.totalReps - prev.totalReps,
      },
    };
  },

  // ── PRs & last performance (derived from logs on read) ────────────────────
  // ponytail: full scan of the user's own logs per request — a personal history is
  // tens–hundreds of rows, so this is milliseconds. Materialize a PR table if it
  // ever grows past that.
  async prs(userId: string, limit = 5) {
    const rows = await db.select({ date: workoutLogs.date, exercises: workoutLogs.exercises })
      .from(workoutLogs).where(eq(workoutLogs.userId, userId));
    const best = new Map<string, { name: string; weight: number; reps: number; date: Date }>();
    for (const row of rows) {
      for (const ex of (row.exercises as any[]) ?? []) {
        for (const s of ex?.sets ?? []) {
          const a = s?.actual;
          if (s?.status !== "done" || a?.type !== "reps") continue;
          const weight = Number(a.weight) || 0;
          if (weight <= 0) continue; // weighted PRs only — bodyweight sets don't rank
          const reps = Number(a.reps) || 0;
          const cur = best.get(ex.name);
          if (!cur || weight > cur.weight || (weight === cur.weight && row.date > cur.date)) {
            best.set(ex.name, { name: ex.name, weight, reps, date: row.date });
          }
        }
      }
    }
    return [...best.values()].sort((a, b) => b.weight - a.weight).slice(0, limit);
  },
  // most recent day each named exercise was performed → best done set that day
  async lastPerformance(userId: string, names: string[]) {
    if (!names.length) return {};
    const want = new Set(names);
    const rows = await db.select({ date: workoutLogs.date, exercises: workoutLogs.exercises })
      .from(workoutLogs).where(eq(workoutLogs.userId, userId)).orderBy(desc(workoutLogs.date));
    const out: Record<string, { date: Date; weight: number; reps: number }> = {};
    for (const row of rows) {
      if (Object.keys(out).length === want.size) break; // found them all
      for (const ex of (row.exercises as any[]) ?? []) {
        if (!want.has(ex?.name) || out[ex.name]) continue;
        let bestSet: { weight: number; reps: number } | null = null;
        for (const s of ex.sets ?? []) {
          const a = s?.actual;
          if (s?.status !== "done" || a?.type !== "reps") continue;
          const weight = Number(a.weight) || 0;
          const reps = Number(a.reps) || 0;
          if (!bestSet || weight > bestSet.weight) bestSet = { weight, reps };
        }
        if (bestSet) out[ex.name] = { date: row.date, ...bestSet };
      }
    }
    return out;
  },

  // ── active session (one per user) ─────────────────────────────────────────
  async getActiveSession(userId: string) {
    const [row] = await db.select().from(activeSessions).where(eq(activeSessions.userId, userId));
    return row?.data ?? null;
  },
  async putActiveSession(userId: string, data: unknown) {
    await db.insert(activeSessions).values({ userId, data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: activeSessions.userId, set: { data, updatedAt: new Date() } });
    return { ok: true };
  },
  async clearActiveSession(userId: string) {
    await db.delete(activeSessions).where(eq(activeSessions.userId, userId));
  },

  // ── AI (server-side heuristic; LLM later, same endpoints) ──────────────────
  async stats(userId: string) {
    const logs = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId));
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const weekly = logs.filter((l) => l.date >= weekAgo).length;
    const totalVolume = logs.reduce((s, l) => s + Number(l.totalVolumeKg), 0);
    return { totalWorkouts: logs.length, weekly, totalVolume };
  },
  async insights(userId: string) {
    const { totalWorkouts, weekly, totalVolume } = await this.stats(userId);
    const out: string[] = [];
    if (totalWorkouts === 0) out.push("Log your first workout to unlock personalized insights.");
    else {
      out.push(`You've logged ${totalWorkouts} workouts (${Math.round(totalVolume)} kg total volume).`);
      out.push(weekly >= 3 ? `Strong week — ${weekly} sessions. Keep the momentum.` : `${weekly} session(s) this week. Aim for 3+.`);
    }
    return { insights: out };
  },
  async recommendations(userId: string, goal?: string) {
    const base: Record<string, string[]> = {
      build_muscle: ["Progressive overload: add reps or load each week.", "Hit each muscle 2x/week.", "Protein ~2g/kg bodyweight."],
      lose_weight: ["Add 2 conditioning/HIIT sessions weekly.", "Keep lifting to preserve muscle.", "Maintain a modest calorie deficit."],
      improve_fitness: ["Mix strength + cardio across the week.", "Prioritize compound lifts.", "Track resting heart rate trend."],
    };
    return { recommendations: base[goal ?? "improve_fitness"] ?? base.improve_fitness };
  },
  async weeklyPlan(_userId: string, goal?: string) {
    const plans: Record<string, string[]> = {
      build_muscle: ["Push Day", "Pull Day", "Leg Day", "Rest", "Upper Body", "Lower Body", "Rest"],
      lose_weight: ["Full Body", "HIIT", "Cardio", "Full Body", "HIIT", "Rest", "Cardio"],
      improve_fitness: ["Full Body", "Cardio", "Calisthenics", "Rest", "Functional", "Mobility", "Rest"],
    };
    const week = plans[goal ?? "improve_fitness"] ?? plans.improve_fitness;
    return { plan: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => ({ day, focus: week[i] })) };
  },

  // ── admin ──────────────────────────────────────────────────────────────────
  async adminListExercises(search?: string) {
    let where: any = undefined;
    if (search) {
      const like = `%${search}%`;
      const tr = await db.select({ id: exerciseTranslations.exerciseId }).from(exerciseTranslations).where(ilike(exerciseTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      where = ids.length ? or(ilike(exercises.name, like), inArray(exercises.id, ids)) : ilike(exercises.name, like);
    }
    const rows = await db.select().from(exercises).where(where).orderBy(exercises.name);
    return hydrateExercises(rows);
  },
  async adminListWorkoutTypes() {
    return db.select({ id: workoutTypes.id, name: workoutTypes.name }).from(workoutTypes).orderBy(workoutTypes.name);
  },
  async adminGetExercise(id: string) {
    const [row] = await db.select().from(exercises).where(eq(exercises.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Exercise not found");
    const base = (await hydrateExercises([row]))[0];
    // include all non-default translations for admin editing
    const trs = await db.select().from(exerciseTranslations).where(eq(exerciseTranslations.exerciseId, id));
    const translations: Record<string, { name?: string; description?: string }> = {};
    for (const t of trs) translations[t.locale] = { name: t.name ?? undefined, description: t.description ?? undefined };
    return { ...base, translations };
  },
  async _setTranslations(exerciseId: string, translations?: Record<string, { name?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue; // English lives in the base columns
      await db.insert(exerciseTranslations).values({ exerciseId, locale, name: v.name ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [exerciseTranslations.exerciseId, exerciseTranslations.locale], set: { name: v.name ?? null, description: v.description ?? null } });
    }
  },
  _assertTargetsSum(bodyTargets?: { bodyTarget: string; percentage: number }[]) {
    if (bodyTargets && bodyTargets.length) {
      const sum = bodyTargets.reduce((s, t) => s + (t.percentage || 0), 0);
      if (sum !== 100) throw new ApiError(422, "INVALID_TARGETS", `Body-target percentages must sum to 100% (got ${sum}%)`);
    }
  },
  async _setTargetsAndLinks(exerciseId: string, bodyTargets?: { bodyTarget: string; percentage: number }[], workoutTypeIds?: string[]) {
    if (bodyTargets) {
      await db.delete(exerciseBodyTargets).where(eq(exerciseBodyTargets.exerciseId, exerciseId));
      if (bodyTargets.length) await db.insert(exerciseBodyTargets).values(bodyTargets.map((t) => ({ exerciseId, bodyTarget: t.bodyTarget, percentage: t.percentage })));
    }
    if (workoutTypeIds) {
      await db.delete(exerciseWorkoutTypes).where(eq(exerciseWorkoutTypes.exerciseId, exerciseId));
      if (workoutTypeIds.length) await db.insert(exerciseWorkoutTypes).values(workoutTypeIds.map((workoutTypeId) => ({ exerciseId, workoutTypeId })));
    }
  },
  async adminCreateExercise(data: { name: string; description?: string; measurementType?: "reps" | "time_hold" | "distance_duration"; bodyTargets?: { bodyTarget: string; percentage: number }[]; workoutTypeIds?: string[] }) {
    this._assertTargetsSum(data.bodyTargets);
    const [row] = await db.insert(exercises).values({
      name: data.name, description: data.description ?? "", measurementType: data.measurementType ?? "reps",
    }).returning();
    await this._setTargetsAndLinks(row.id, data.bodyTargets, data.workoutTypeIds);
    await this._setTranslations(row.id, (data as any).translations);
    return this.adminGetExercise(row.id);
  },
  async adminDeleteExercise(id: string) {
    await db.delete(exercises).where(eq(exercises.id, id));
  },
  async adminUpdateExercise(id: string, data: { name?: string; description?: string; measurementType?: "reps" | "time_hold" | "distance_duration"; bodyTargets?: { bodyTarget: string; percentage: number }[]; workoutTypeIds?: string[] }) {
    this._assertTargetsSum(data.bodyTargets);
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.measurementType !== undefined) set.measurementType = data.measurementType;
    if (Object.keys(set).length) {
      const [row] = await db.update(exercises).set(set).where(eq(exercises.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Exercise not found");
    } else {
      await this.adminGetExercise(id); // 404s if missing
    }
    await this._setTargetsAndLinks(id, data.bodyTargets, data.workoutTypeIds);
    await this._setTranslations(id, (data as any).translations);
    return this.adminGetExercise(id);
  },

  // ── workout types (training types) admin CRUD ────────────────────────────
  async adminListWorkoutTypesFull() {
    const rows = await db.select({ id: workoutTypes.id, name: workoutTypes.name, description: workoutTypes.description })
      .from(workoutTypes).where(isNull(workoutTypes.userId)).orderBy(workoutTypes.name);
    const links = await db.select({ workoutTypeId: exerciseWorkoutTypes.workoutTypeId }).from(exerciseWorkoutTypes);
    const count = new Map<string, number>();
    for (const l of links) count.set(l.workoutTypeId, (count.get(l.workoutTypeId) || 0) + 1);
    return rows.map((r) => ({ ...r, exerciseCount: count.get(r.id) || 0 }));
  },
  async adminGetWorkoutType(id: string) {
    const [row] = await db.select().from(workoutTypes).where(eq(workoutTypes.id, id));
    if (!row) throw new ApiError(404, "NOT_FOUND", "Workout type not found");
    const trs = await db.select().from(workoutTypeTranslations).where(eq(workoutTypeTranslations.workoutTypeId, id));
    const translations: Record<string, { name?: string; description?: string }> = {};
    for (const t of trs) translations[t.locale] = { name: t.name ?? undefined, description: t.description ?? undefined };
    return { id: row.id, name: row.name, description: row.description, translations };
  },
  async _setWorkoutTypeTranslations(workoutTypeId: string, translations?: Record<string, { name?: string; description?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(workoutTypeTranslations).values({ workoutTypeId, locale, name: v.name ?? null, description: v.description ?? null })
        .onConflictDoUpdate({ target: [workoutTypeTranslations.workoutTypeId, workoutTypeTranslations.locale], set: { name: v.name ?? null, description: v.description ?? null } });
    }
  },
  async adminCreateWorkoutType(data: { name: string; description?: string; translations?: Record<string, { name?: string; description?: string }> }) {
    const [row] = await db.insert(workoutTypes).values({ name: data.name, description: data.description ?? "", userId: null }).returning();
    await this._setWorkoutTypeTranslations(row.id, data.translations);
    return this.adminGetWorkoutType(row.id);
  },
  async adminUpdateWorkoutType(id: string, data: { name?: string; description?: string; translations?: Record<string, { name?: string; description?: string }> }) {
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (Object.keys(set).length) {
      const [row] = await db.update(workoutTypes).set(set).where(eq(workoutTypes.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Workout type not found");
    } else {
      await this.adminGetWorkoutType(id);
    }
    await this._setWorkoutTypeTranslations(id, data.translations);
    return this.adminGetWorkoutType(id);
  },
  async adminDeleteWorkoutType(id: string) {
    // exercise↔type links cascade via FK; exercises themselves stay
    await db.delete(workoutTypes).where(eq(workoutTypes.id, id));
  },
};
