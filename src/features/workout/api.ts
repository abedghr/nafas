import { apiFetch } from "@/src/lib/api";

export interface ApiExercise {
  id: string;
  name: string;
  nameEn?: string;
  nameAr?: string | null;
  description: string;
  measurementType: "reps" | "time_hold" | "distance_duration";
  equipment?: string;
  imageUrl?: string;
  gifUrl?: string;
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
  updateTemplate: (id: string, body: unknown) => apiFetch(`/workout-templates/${id}`, { method: "PATCH", auth: true, body }),
  deleteTemplate: (id: string) => apiFetch(`/workout-templates/${id}`, { method: "DELETE", auth: true }),

  // programs (multi-week schedules)
  programs: () => apiFetch<{ data: any[] }>("/programs", { auth: true }).then((r) => r.data),
  createProgram: (body: unknown) => apiFetch("/programs", { method: "POST", auth: true, body }),
  updateProgram: (id: string, body: unknown) => apiFetch(`/programs/${id}`, { method: "PATCH", auth: true, body }),
  deleteProgram: (id: string) => apiFetch(`/programs/${id}`, { method: "DELETE", auth: true }),

  // program sharing
  shareProgram: (id: string, body: { toUserId?: string | null; generateCode?: boolean; claimExpiresAt?: string | null; accessExpiresAt?: string | null }) =>
    apiFetch<{ id: string; code: string | null }>(`/programs/${id}/share`, { method: "POST", auth: true, body }),
  programInvites: () => apiFetch<{ data: any[] }>("/program-invites", { auth: true }).then((r) => r.data),
  acceptInvite: (id: string) => apiFetch(`/program-invites/${id}/accept`, { method: "POST", auth: true }),
  declineInvite: (id: string) => apiFetch(`/program-invites/${id}/decline`, { method: "POST", auth: true }),
  claimProgram: (code: string) => apiFetch("/program-shares/claim", { method: "POST", auth: true, body: { code } }),
  programShares: (id: string) => apiFetch<{ shares: any[]; activeUsers: number; total: number }>(`/programs/${id}/shares`, { auth: true }),
  revokeShare: (shareId: string) => apiFetch(`/program-shares/${shareId}/revoke`, { method: "POST", auth: true }),
  searchUsers: (q: string) => apiFetch<{ data: any[] }>(`/users/search?q=${encodeURIComponent(q)}`, { auth: true }).then((r) => r.data),

  // program enrollment / scheduling
  enrollments: () => apiFetch<{ data: any[] }>("/enrollments", { auth: true }).then((r) => r.data),
  enroll: (programId: string, startDate: string) => apiFetch("/enrollments", { method: "POST", auth: true, body: { programId, startDate } }),
  updateEnrollment: (id: string, body: { startDate?: string; status?: string; dayEdits?: Record<string, { added?: unknown[]; removed?: string[] }>; dayOrder?: string[] }) =>
    apiFetch(`/enrollments/${id}`, { method: "PATCH", auth: true, body }),
  deleteEnrollment: (id: string) => apiFetch(`/enrollments/${id}`, { method: "DELETE", auth: true }),
  setEnrollmentDay: (id: string, body: { weekIndex: number; dayIndex: number; status: "done" | "skipped" | "rest"; completedDate?: string | null; durationMin?: number | null; logId?: string | null }) =>
    apiFetch(`/enrollments/${id}/days`, { method: "POST", auth: true, body }),
  clearEnrollmentDay: (id: string, week: number, day: number) => apiFetch(`/enrollments/${id}/days/${week}/${day}`, { method: "DELETE", auth: true }),

  logs: () => apiFetch<{ data: any[] }>("/workout-logs", { auth: true }).then((r) => r.data),
  prs: (limit = 5) => apiFetch<{ data: { name: string; weight: number; reps: number; date: string }[] }>(`/workout/prs?limit=${limit}`, { auth: true }).then((r) => r.data),
  lastPerformance: (names: string[]) =>
    apiFetch<{ data: Record<string, { date: string; weight: number; reps: number }> }>(`/workout/last?names=${encodeURIComponent(names.join(","))}`, { auth: true }).then((r) => r.data),
  progression: (name: string) =>
    apiFetch<{ data: { date: string; weight: number; reps: number; volume: number; holdSec?: number; distanceM?: number }[] }>(`/workout/progression?name=${encodeURIComponent(name)}`, { auth: true }).then((r) => r.data),
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

// Finer, Hevy-style primary-muscle label from the top body target (row subtitle + muscle filter).
const PRIMARY_MUSCLE: Record<string, string> = {
  chest: "Chest",
  lats: "Lats", upper_back: "Upper Back", mid_back: "Upper Back", lower_back: "Lower Back", erector_spinae: "Lower Back", traps: "Traps",
  shoulders_anterior: "Shoulders", shoulders_lateral: "Shoulders", shoulders_posterior: "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  glutes: "Glutes", hamstrings: "Hamstrings", quadriceps: "Quadriceps", adductors: "Adductors", hip_flexors: "Quadriceps", calves: "Calves",
  core_abs: "Abdominals", core_deep: "Abdominals", obliques: "Abdominals",
  cardiovascular: "Cardio", endurance: "Cardio", flexibility: "Full Body", balance: "Full Body",
};
export function primaryMuscle(bodyTargets: { bodyTarget: string; percentage: number }[]): string {
  const top = [...(bodyTargets || [])].sort((a, b) => b.percentage - a.percentage)[0];
  return top ? PRIMARY_MUSCLE[top.bodyTarget] ?? "Full Body" : "Full Body";
}

// Filter option lists (Hevy parity).
export const EQUIPMENT_OPTIONS = ["None", "Barbell", "Dumbbell", "Kettlebell", "Machine", "Plate", "Resistance Band", "Suspension Band", "Other"];
// Muscle groups grouped like Hevy's picker (Upper Body / Lower Body / Other).
export const MUSCLE_CATEGORIES: { key: string; muscles: string[] }[] = [
  { key: "upperBody", muscles: ["Abdominals", "Biceps", "Chest", "Forearms", "Lats", "Lower Back", "Shoulders", "Traps", "Triceps", "Upper Back"] },
  { key: "lowerBody", muscles: ["Adductors", "Calves", "Glutes", "Hamstrings", "Quadriceps"] },
  { key: "other", muscles: ["Cardio", "Full Body"] },
];
export const PRIMARY_MUSCLES = MUSCLE_CATEGORIES.flatMap((c) => c.muscles);

// Old exerciseLibrary item shape the screens expect.
export function mapExercise(e: ApiExercise) {
  const top = [...e.bodyTargets].sort((a, b) => b.percentage - a.percentage)[0];
  return {
    id: e.id,
    name: e.name,
    description: e.description || "",
    category: (e.workoutTypes[0] || "").toLowerCase(),
    muscleGroup: top ? GROUP[top.bodyTarget] ?? "Full Body" : "Full Body",
    primaryMuscle: primaryMuscle(e.bodyTargets),
    equipment: e.equipment || "",
    imageUrl: e.imageUrl || "",
    gifUrl: e.gifUrl || "",
    defaultSetType: e.measurementType === "time_hold" ? ("hold" as const) : ("reps" as const),
    muscles: [...e.bodyTargets].sort((a, b) => b.percentage - a.percentage).map((t) => t.bodyTarget), // strongest first
    bodyTargets: [...e.bodyTargets].sort((a, b) => b.percentage - a.percentage), // strongest first, with %
  };
}

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Calisthenics", "Full Body"];
