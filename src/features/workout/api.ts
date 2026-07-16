import { apiFetch } from "@/src/lib/api";

export interface ApiExercise {
  id: string;
  name: string;
  description: string;
  measurementType: "reps" | "time_hold" | "distance_duration";
  isCustom: boolean;
  workoutTypes: string[];
  bodyTargets: { bodyTarget: string; percentage: number }[];
}
export interface ApiWorkoutType { id: string; name: string; description: string }

export const workoutApi = {
  exercises: (search?: string) =>
    apiFetch<{ data: ApiExercise[] }>(`/exercises${search ? `?search=${encodeURIComponent(search)}` : ""}`, { auth: true }).then((r) => r.data),
  workoutTypes: () => apiFetch<{ data: ApiWorkoutType[] }>("/workout-types", { auth: true }).then((r) => r.data),

  templates: () => apiFetch<{ data: any[] }>("/workout-templates", { auth: true }).then((r) => r.data),
  createTemplate: (body: unknown) => apiFetch("/workout-templates", { method: "POST", auth: true, body }),
  deleteTemplate: (id: string) => apiFetch(`/workout-templates/${id}`, { method: "DELETE", auth: true }),

  logs: () => apiFetch<{ data: any[] }>("/workout-logs", { auth: true }).then((r) => r.data),
  createLog: (body: unknown) => apiFetch("/workout-logs", { method: "POST", auth: true, body }),
  deleteLog: (id: string) => apiFetch(`/workout-logs/${id}`, { method: "DELETE", auth: true }),

  getActiveSession: () => apiFetch<{ data: unknown }>("/active-session", { auth: true }).then((r) => r.data),
  putActiveSession: (data: unknown) => apiFetch("/active-session", { method: "PUT", auth: true, body: { data } }),
  clearActiveSession: () => apiFetch("/active-session", { method: "DELETE", auth: true }),

  insights: () => apiFetch<{ insights: string[] }>("/workout/insights", { auth: true }),
  recommendations: (goal?: string) => apiFetch<{ recommendations: string[] }>(`/workout/recommendations${goal ? `?goal=${goal}` : ""}`, { auth: true }),
  weeklyPlan: (goal?: string) => apiFetch<{ plan: { day: string; focus: string }[] }>(`/workout/weekly-plan${goal ? `?goal=${goal}` : ""}`, { auth: true }),
};

// Map the granular 26 body targets onto the app's familiar muscle groups.
const GROUP: Record<string, string> = {
  chest: "Chest",
  lats: "Back", upper_back: "Back", mid_back: "Back", lower_back: "Back", traps: "Back",
  shoulders_anterior: "Shoulders", shoulders_lateral: "Shoulders", shoulders_posterior: "Shoulders",
  biceps: "Arms", triceps: "Arms", forearms: "Arms",
  glutes: "Legs", hamstrings: "Legs", quadriceps: "Legs", adductors: "Legs", calves: "Legs", hip_flexors: "Legs",
  core_abs: "Core", core_deep: "Core", obliques: "Core", erector_spinae: "Core",
  cardiovascular: "Cardio", endurance: "Cardio", flexibility: "Core", balance: "Core",
};

// Old exerciseLibrary item shape the screens expect.
export function mapExercise(e: ApiExercise) {
  const top = [...e.bodyTargets].sort((a, b) => b.percentage - a.percentage)[0];
  return {
    id: e.id,
    name: e.name,
    category: (e.workoutTypes[0] || "").toLowerCase(),
    muscleGroup: top ? GROUP[top.bodyTarget] ?? "Full Body" : "Full Body",
    defaultSetType: e.measurementType === "time_hold" ? ("hold" as const) : ("reps" as const),
    muscles: e.bodyTargets.map((t) => t.bodyTarget),
  };
}

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Calisthenics", "Full Body"];
