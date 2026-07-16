import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EXERCISES_KEY, listExercises, getExerciseMeta, createExercise, updateExercise, deleteExercise,
  type ExerciseInput,
} from "../services/exercises";

export const useExercises = (search: string) =>
  useQuery({ queryKey: [EXERCISES_KEY, search], queryFn: () => listExercises(search || undefined) });

export const useExerciseMeta = () =>
  useQuery({ queryKey: [EXERCISES_KEY, "meta"], queryFn: getExerciseMeta, staleTime: 5 * 60_000 });

export const useExerciseMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [EXERCISES_KEY] });
  return {
    create: useMutation({ mutationFn: (d: ExerciseInput) => createExercise(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<ExerciseInput> }) => updateExercise(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteExercise(id), onSuccess: invalidate }),
  };
};
