import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USERS_KEY, listUsers, updateUser, type AdminUser } from "../services/users";
import type { PaginationRequest } from "../types/api";

export const useUsers = (params: PaginationRequest) =>
  useQuery({ queryKey: [USERS_KEY, params], queryFn: () => listUsers(params) });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<AdminUser, "status" | "role">> }) =>
      updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
};
