import axios from "../lib/axios";

export interface BodyTarget { bodyTarget: string; percentage: number }
export type Translations = Record<string, { name?: string; description?: string }>;
export interface Exercise {
  id: string;
  name: string;
  description: string;
  measurementType: "reps" | "time_hold" | "distance_duration";
  isCustom: boolean;
  workoutTypes: string[];
  bodyTargets: BodyTarget[];
  translations?: Translations;
}
export interface ExerciseInput {
  name: string;
  description: string;
  measurementType: Exercise["measurementType"];
  bodyTargets: BodyTarget[];
  workoutTypeIds: string[];
  translations?: Translations;
}
export interface ExerciseMeta {
  workoutTypes: { id: string; name: string }[];
  bodyTargets: string[];
}

export const EXERCISES_KEY = "exercises";

export const listExercises = (search?: string) =>
  axios.get<{ data: Exercise[] }>("/exercises", { params: { search } }).then((r) => r.data.data);
export const getExerciseMeta = () =>
  axios.get<ExerciseMeta>("/exercises/meta").then((r) => r.data);
export const getExercise = (id: string) =>
  axios.get<Exercise>(`/exercises/${id}`).then((r) => r.data);
export const createExercise = (data: ExerciseInput) =>
  axios.post<Exercise>("/exercises", data).then((r) => r.data);
export const updateExercise = (id: string, data: Partial<ExerciseInput>) =>
  axios.patch<Exercise>(`/exercises/${id}`, data).then((r) => r.data);
export const deleteExercise = (id: string) => axios.delete(`/exercises/${id}`);
