import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COACHES_KEY, listCoaches, getCoach, updateCoach, type CoachInput,
  BOOKINGS_KEY, listBookings, updateBooking,
} from "../services/coaches";

export const useCoaches = (search: string) =>
  useQuery({ queryKey: [COACHES_KEY, search], queryFn: () => listCoaches(search || undefined) });
export const useCoach = (id: string) =>
  useQuery({ queryKey: [COACHES_KEY, id], queryFn: () => getCoach(id), enabled: !!id });

export const useCoachMutations = () => {
  const qc = useQueryClient();
  return {
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: CoachInput }) => updateCoach(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [COACHES_KEY] }) }),
  };
};

export const useBookings = () => useQuery({ queryKey: [BOOKINGS_KEY], queryFn: listBookings });
export const useBookingMutations = () => {
  const qc = useQueryClient();
  return {
    setStatus: useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => updateBooking(id, status), onSuccess: () => qc.invalidateQueries({ queryKey: [BOOKINGS_KEY] }) }),
  };
};
