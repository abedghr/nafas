import { and, eq, ilike, isNull, or, desc, sql, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../core/db";
import { foods, foodTranslations, nutritionDays, nutritionTargets, inbodyTests } from "./nutrition.db";
import { users } from "../identity/identity.db";
import { ApiError } from "../../middleware/error";
import type { AddItem, Targets, InBodyInput, AdminFoodInput } from "./nutrition.schema";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;
const emptyMeals = () => MEAL_TYPES.map((type) => ({ type, items: [] as any[] }));

// targets from profile (ported from the app's getDefaultTargets)
function defaultTargets(weight: number, goal: string) {
  const w = weight || 75;
  const proteinPerKg = goal === "build_muscle" ? 2.2 : goal === "lose_weight" ? 2 : 1.8;
  const protein = Math.round(w * proteinPerKg);
  const fatCals = goal === "lose_weight" ? 0.2 : 0.25;
  const calories = Math.round(goal === "build_muscle" ? w * 33 : goal === "lose_weight" ? w * 24 : w * 28);
  const fat = Math.round((calories * fatCals) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { protein, carbs, fat, calories };
}

function totalsOf(meals: any[]) {
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
  for (const m of meals) for (const it of m.items) {
    const q = it.quantity || 1;
    totalProtein += (it.protein || 0) * q; totalCarbs += (it.carbs || 0) * q;
    totalFat += (it.fat || 0) * q; totalCalories += (it.calories || 0) * q;
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  return { totalProtein: r(totalProtein), totalCarbs: r(totalCarbs), totalFat: r(totalFat), totalCalories: r(totalCalories) };
}

export const nutritionService = {
  // ── foods ────────────────────────────────────────────────────────────────
  async listFoods(opts: { search?: string; userId?: string; locale?: string; mealType?: string }) {
    const scope = opts.userId ? or(isNull(foods.userId), eq(foods.userId, opts.userId)) : isNull(foods.userId);
    const conds: any[] = [scope];
    if (opts.search) {
      const like = `%${opts.search}%`;
      // match the English base name OR ANY translation (so an Arabic query finds
      // Arabic-named foods even when the UI/x-lang is English, and vice versa)
      const tr = await db.select({ id: foodTranslations.foodId }).from(foodTranslations)
        .where(ilike(foodTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      conds.push(ids.length ? or(ilike(foods.name, like), inArray(foods.id, ids)) : ilike(foods.name, like));
    }
    // mealType is a real filter: only foods tagged with that type (jsonb array contains)
    if (opts.mealType) conds.push(sql`${foods.mealTypes} @> ${JSON.stringify([opts.mealType])}::jsonb`);
    let rows = await db.select().from(foods).where(and(...conds)).orderBy(foods.name).limit(500);
    if (opts.locale && opts.locale !== "en" && rows.length) {
      const trs = await db.select().from(foodTranslations).where(eq(foodTranslations.locale, opts.locale));
      const byId = new Map(trs.map((t) => [t.foodId, t.name]));
      rows = rows.map((f) => ({ ...f, name: byId.get(f.id) || f.name }));
    }
    return rows;
  },

  // ── day ──────────────────────────────────────────────────────────────────
  async getDay(userId: string, date: string) {
    const [row] = await db.select().from(nutritionDays).where(and(eq(nutritionDays.userId, userId), eq(nutritionDays.date, date)));
    const targets = await this.getTargets(userId);
    if (!row) return { date, meals: emptyMeals(), totalProtein: 0, totalCarbs: 0, totalFat: 0, totalCalories: 0, targets };
    return { ...row, targets };
  },
  async _saveDay(userId: string, date: string, meals: any[]) {
    const totals = totalsOf(meals);
    await db.insert(nutritionDays).values({ userId, date, meals, ...totals, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [nutritionDays.userId, nutritionDays.date], set: { meals, ...totals, updatedAt: new Date() } });
    return this.getDay(userId, date);
  },
  async addItem(userId: string, date: string, body: AddItem) {
    const day = await this.getDay(userId, date);
    const meals = (day.meals as any[]).map((m) =>
      m.type === body.mealType
        ? { ...m, items: [...m.items, { id: crypto.randomUUID(), ...body.item }] }
        : m,
    );
    return this._saveDay(userId, date, meals);
  },
  async removeItem(userId: string, date: string, mealType: string, itemId: string) {
    const day = await this.getDay(userId, date);
    const meals = (day.meals as any[]).map((m) =>
      m.type === mealType ? { ...m, items: m.items.filter((it: any) => it.id !== itemId) } : m,
    );
    return this._saveDay(userId, date, meals);
  },

  // ── targets ────────────────────────────────────────────────────────────────
  async getTargets(userId: string) {
    const [row] = await db.select().from(nutritionTargets).where(eq(nutritionTargets.userId, userId));
    if (row) return { protein: row.protein, carbs: row.carbs, fat: row.fat, calories: row.calories };
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    return defaultTargets(u?.weight ?? 75, u?.goal ?? "improve_fitness");
  },
  async setTargets(userId: string, t: Targets) {
    await db.insert(nutritionTargets).values({ userId, ...t, updatedAt: new Date() })
      .onConflictDoUpdate({ target: nutritionTargets.userId, set: { ...t, updatedAt: new Date() } });
    return t;
  },
  // recommend macro targets for a goal (cut/maintain/bulk). Uses the user's weight
  // unless an override is passed (lets the UI preview before the profile is set).
  async recommendTargets(userId: string, goal: string, weight?: number) {
    let w = weight;
    if (w == null) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      w = u?.weight ?? 75;
    }
    const goalMap: Record<string, string> = { cut: "lose_weight", maintain: "improve_fitness", bulk: "build_muscle" };
    return defaultTargets(w, goalMap[goal] ?? "improve_fitness");
  },

  // ── inbody ──────────────────────────────────────────────────────────────────
  async listInBody(userId: string) {
    return db.select().from(inbodyTests).where(eq(inbodyTests.userId, userId)).orderBy(desc(inbodyTests.date));
  },
  async addInBody(userId: string, body: InBodyInput) {
    const [row] = await db.insert(inbodyTests).values({ userId, ...body }).returning();
    return row;
  },
  async deleteInBody(userId: string, id: string) {
    await db.delete(inbodyTests).where(and(eq(inbodyTests.id, id), eq(inbodyTests.userId, userId)));
  },

  // ── admin foods ──────────────────────────────────────────────────────────────
  async adminListFoods(search?: string) {
    let where: any = undefined;
    if (search) {
      const like = `%${search}%`;
      // match English base name OR any-locale translation (so Arabic search works in EN UI)
      const tr = await db.select({ id: foodTranslations.foodId }).from(foodTranslations).where(ilike(foodTranslations.name, like));
      const ids = [...new Set(tr.map((t) => t.id))];
      where = ids.length ? or(ilike(foods.name, like), inArray(foods.id, ids)) : ilike(foods.name, like);
    }
    const rows = await db.select().from(foods).where(where).orderBy(foods.name);
    const trs = await db.select().from(foodTranslations);
    return rows.map((f) => ({
      ...f,
      translations: Object.fromEntries(trs.filter((t) => t.foodId === f.id).map((t) => [t.locale, { name: t.name ?? undefined }])),
    }));
  },
  async _setFoodTranslations(foodId: string, translations?: Record<string, { name?: string }>) {
    if (!translations) return;
    for (const [locale, v] of Object.entries(translations)) {
      if (locale === "en") continue;
      await db.insert(foodTranslations).values({ foodId, locale, name: v.name ?? null })
        .onConflictDoUpdate({ target: [foodTranslations.foodId, foodTranslations.locale], set: { name: v.name ?? null } });
    }
  },
  async adminCreateFood(data: AdminFoodInput) {
    const [row] = await db.insert(foods).values({ name: data.name, protein: data.protein, carbs: data.carbs, fat: data.fat, calories: data.calories, mealTypes: data.mealTypes ?? [] }).returning();
    await this._setFoodTranslations(row.id, data.translations);
    return row;
  },
  async adminUpdateFood(id: string, data: Partial<AdminFoodInput>) {
    const set: Record<string, unknown> = {};
    for (const k of ["name", "protein", "carbs", "fat", "calories", "mealTypes"] as const) if (data[k] !== undefined) set[k] = data[k];
    if (Object.keys(set).length) {
      const [row] = await db.update(foods).set(set).where(eq(foods.id, id)).returning();
      if (!row) throw new ApiError(404, "NOT_FOUND", "Food not found");
    }
    await this._setFoodTranslations(id, data.translations);
    const [row] = await db.select().from(foods).where(eq(foods.id, id));
    return row;
  },
  async adminDeleteFood(id: string) {
    await db.delete(foods).where(eq(foods.id, id));
  },
};
