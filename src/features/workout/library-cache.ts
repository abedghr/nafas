// Live-binding cache for workout reference data. app-context fills it from the
// API after login; screens import these names (same shape as the old mock) so
// the swap is a one-line import-path change. MUSCLE_GROUPS is static.
import { MUSCLE_GROUPS as GROUPS } from "./api";

export let exerciseLibrary: any[] = [];
export let workoutTypes: any[] = [];
export const MUSCLE_GROUPS = GROUPS;

export function setWorkoutLibrary(exercises: any[], types: any[]) {
  exerciseLibrary = exercises;
  workoutTypes = types;
}
