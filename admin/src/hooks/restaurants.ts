import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RESTAURANTS_KEY, listRestaurants, getRestaurant, createRestaurant, updateRestaurant, deleteRestaurant, type RestaurantInput,
  RESERVATIONS_KEY, listReservations, updateReservation,
} from "../services/restaurants";

export const useRestaurants = (search: string) =>
  useQuery({ queryKey: [RESTAURANTS_KEY, search], queryFn: () => listRestaurants(search || undefined) });

export const useRestaurant = (id: string) =>
  useQuery({ queryKey: [RESTAURANTS_KEY, id], queryFn: () => getRestaurant(id), enabled: !!id });

export const useRestaurantMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [RESTAURANTS_KEY] });
  return {
    create: useMutation({ mutationFn: (d: Partial<RestaurantInput>) => createRestaurant(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<RestaurantInput> }) => updateRestaurant(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteRestaurant(id), onSuccess: invalidate }),
  };
};

export const useReservations = () => useQuery({ queryKey: [RESERVATIONS_KEY], queryFn: listReservations });
export const useReservationMutations = () => {
  const qc = useQueryClient();
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) => updateReservation(id, status),
      onSuccess: () => qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] }),
    }),
  };
};
