import axios from "../lib/axios";

export type Translations = Record<string, { name?: string; description?: string }>;
export interface WorkoutType {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
  translations?: Translations;
}
export interface WorkoutTypeInput {
  name: string;
  description?: string;
  translations?: Translations;
}

export const WORKOUT_TYPES_KEY = "workout-types";

export const listWorkoutTypes = () =>
  axios.get<{ data: WorkoutType[] }>("/workout-types").then((r) => r.data.data);
export const getWorkoutType = (id: string) =>
  axios.get<WorkoutType>(`/workout-types/${id}`).then((r) => r.data);
export const createWorkoutType = (data: WorkoutTypeInput) =>
  axios.post<WorkoutType>("/workout-types", data).then((r) => r.data);
export const updateWorkoutType = (id: string, data: Partial<WorkoutTypeInput>) =>
  axios.patch<WorkoutType>(`/workout-types/${id}`, data).then((r) => r.data);
export const deleteWorkoutType = (id: string) => axios.delete(`/workout-types/${id}`);
