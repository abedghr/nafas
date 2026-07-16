import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  WORKOUT_TYPES_KEY, listWorkoutTypes, getWorkoutType, createWorkoutType, updateWorkoutType, deleteWorkoutType,
  type WorkoutTypeInput,
} from "../services/workoutTypes";

export const useWorkoutTypes = () =>
  useQuery({ queryKey: [WORKOUT_TYPES_KEY], queryFn: listWorkoutTypes });

export const useWorkoutType = (id: string | null) =>
  useQuery({ queryKey: [WORKOUT_TYPES_KEY, id], queryFn: () => getWorkoutType(id as string), enabled: !!id });

export const useWorkoutTypeMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [WORKOUT_TYPES_KEY] });
  return {
    create: useMutation({ mutationFn: (d: WorkoutTypeInput) => createWorkoutType(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<WorkoutTypeInput> }) => updateWorkoutType(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteWorkoutType(id), onSuccess: invalidate }),
  };
};
