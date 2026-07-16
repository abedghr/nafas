import axios from "../lib/axios";
import type { ListResponse, PaginationRequest } from "../types/api";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "athlete" | "coach" | "admin";
  status: "active" | "suspended";
  countryId: string | null;
}

export const USERS_KEY = "users";

export const listUsers = (params: PaginationRequest) =>
  axios.get<ListResponse<AdminUser>>("/users", { params }).then((r) => r.data);

export const updateUser = (
  id: string,
  data: { status?: AdminUser["status"]; role?: AdminUser["role"] },
) => axios.patch<AdminUser>(`/users/${id}`, data).then((r) => r.data);
