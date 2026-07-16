import { apiFetch } from "@/src/lib/api";

export interface ApiFood { id: string; name: string; protein: number; carbs: number; fat: number; calories: number; mealTypes: string[] }
export interface MealItemInput { foodId?: string; name: string; protein: number; carbs: number; fat: number; calories: number; quantity?: number }
export interface Targets { protein: number; carbs: number; fat: number; calories: number }

// today's date in the device's local timezone (YYYY-MM-DD)
export const todayLocal = () => new Date().toLocaleDateString("en-CA");

export const nutritionApi = {
  // mealType is a hint: matching foods surface first, the rest still returned
  foods: (search?: string, mealType?: string) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (mealType) q.set("mealType", mealType);
    const qs = q.toString();
    return apiFetch<{ data: ApiFood[] }>(`/foods${qs ? `?${qs}` : ""}`, { auth: true }).then((r) => r.data);
  },

  getDay: (date: string) => apiFetch<any>(`/nutrition/days/${date}`, { auth: true }),
  addItem: (date: string, mealType: string, item: MealItemInput) =>
    apiFetch<any>(`/nutrition/days/${date}/items`, { method: "POST", auth: true, body: { mealType, item } }),
  removeItem: (date: string, mealType: string, itemId: string) =>
    apiFetch<any>(`/nutrition/days/${date}/items?mealType=${mealType}&itemId=${itemId}`, { method: "DELETE", auth: true }),

  targets: () => apiFetch<Targets>("/nutrition/targets", { auth: true }),
  setTargets: (t: Targets) => apiFetch<Targets>("/nutrition/targets", { method: "POST", auth: true, body: t }),
  recommendTargets: (goal: string, weight?: number) => {
    const q = new URLSearchParams({ goal });
    if (weight) q.set("weight", String(weight));
    return apiFetch<Targets>(`/nutrition/targets/recommend?${q.toString()}`, { auth: true });
  },

  inbody: () => apiFetch<{ data: any[] }>("/inbody", { auth: true }).then((r) => r.data),
  addInbody: (body: Record<string, unknown>) => apiFetch<any>("/inbody", { method: "POST", auth: true, body }),
  deleteInbody: (id: string) => apiFetch<void>(`/inbody/${id}`, { method: "DELETE", auth: true }),
};
