import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FOODS_KEY, listFoods, createFood, updateFood, deleteFood, type FoodInput } from "../services/foods";

export const useFoods = (search: string) =>
  useQuery({ queryKey: [FOODS_KEY, search], queryFn: () => listFoods(search || undefined) });

export const useFoodMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [FOODS_KEY] });
  return {
    create: useMutation({ mutationFn: (d: FoodInput) => createFood(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<FoodInput> }) => updateFood(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteFood(id), onSuccess: invalidate }),
  };
};
