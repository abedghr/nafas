import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GYMS_KEY, listGyms, getGym, createGym, updateGym, deleteGym, type GymInput,
  GYM_REQUESTS_KEY, listGymRequests, updateGymRequest,
  CLASSES_KEY, listClasses, createClass, updateClass, deleteClass, type ClassInput,
  REVIEWS_KEY, listGymReviews, deleteGymReview,
  TEAM_KEY, getGymTeam, addGymTeam, removeGymTeam,
} from "../services/gyms";

export const useGym = (id: string) =>
  useQuery({ queryKey: [GYMS_KEY, id], queryFn: () => getGym(id), enabled: !!id });

export const useGymRequests = () =>
  useQuery({ queryKey: [GYM_REQUESTS_KEY], queryFn: listGymRequests });

export const useGymRequestMutations = () => {
  const qc = useQueryClient();
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) => updateGymRequest(id, status),
      onSuccess: () => qc.invalidateQueries({ queryKey: [GYM_REQUESTS_KEY] }),
    }),
  };
};

export const useGyms = (search: string) =>
  useQuery({ queryKey: [GYMS_KEY, search], queryFn: () => listGyms(search || undefined) });

export const useGymMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [GYMS_KEY] });
  return {
    create: useMutation({ mutationFn: (d: Partial<GymInput>) => createGym(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<GymInput> }) => updateGym(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteGym(id), onSuccess: invalidate }),
  };
};

export const useClasses = (scope: { gymId?: string; eventId?: string }) => {
  const key = scope.eventId ?? scope.gymId ?? "";
  return useQuery({ queryKey: [CLASSES_KEY, key], queryFn: () => listClasses(scope), enabled: !!key });
};

export const useClassMutations = (scopeKey: string) => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [CLASSES_KEY, scopeKey] });
  return {
    create: useMutation({ mutationFn: (d: Partial<ClassInput>) => createClass(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<ClassInput> }) => updateClass(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteClass(id), onSuccess: invalidate }),
  };
};

export const useGymReviews = (gymId: string) =>
  useQuery({ queryKey: [REVIEWS_KEY, gymId], queryFn: () => listGymReviews(gymId), enabled: !!gymId });

export const useGymTeam = (gymId: string) =>
  useQuery({ queryKey: [TEAM_KEY, gymId], queryFn: () => getGymTeam(gymId), enabled: !!gymId });

export const useTeamMutations = (gymId: string) => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [TEAM_KEY, gymId] });
  return {
    add: useMutation({ mutationFn: (userId: string) => addGymTeam(gymId, userId), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => removeGymTeam(id), onSuccess: invalidate }),
  };
};

export const useReviewMutations = (gymId: string) => {
  const qc = useQueryClient();
  return {
    remove: useMutation({
      mutationFn: (id: string) => deleteGymReview(id),
      onSuccess: () => { qc.invalidateQueries({ queryKey: [REVIEWS_KEY, gymId] }); qc.invalidateQueries({ queryKey: [GYMS_KEY, gymId] }); },
    }),
  };
};
