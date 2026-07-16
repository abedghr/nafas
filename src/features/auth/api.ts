import { apiFetch } from "@/src/lib/api";

export interface Me {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "athlete" | "coach" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  rank: string;
  countryId: string | null;
  language: string;
  theme: string;
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
  goal: string | null;
  interests: string[];
  profileComplete: boolean;
  status: "active" | "suspended";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: Me;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  currency: string;
  phoneCode: string;
  language: string;
  locale: string;
  timezone: string;
}

export const authApi = {
  register: (body: {
    name: string; username: string; email: string; password: string;
    role?: "athlete" | "coach"; countryId?: string;
  }) => apiFetch<{ email: string; message: string }>("/auth/register", { method: "POST", body }),

  verifyOtp: (body: { email: string; code: string; purpose?: "verify" | "reset" }) =>
    apiFetch<TokenPair>("/auth/otp/verify", { method: "POST", body }),

  requestOtp: (body: { email: string; purpose?: "verify" | "reset" }) =>
    apiFetch<{ message: string }>("/auth/otp/request", { method: "POST", body }),

  login: (body: { email: string; password: string }) =>
    apiFetch<TokenPair>("/auth/login", { method: "POST", body }),

  logout: (refreshToken: string) =>
    apiFetch<void>("/auth/logout", { method: "POST", body: { refreshToken } }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/auth/password/forgot", { method: "POST", body: { email } }),

  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    apiFetch<{ message: string }>("/auth/password/reset", { method: "POST", body }),

  me: () => apiFetch<Me>("/me", { auth: true }),
  updateMe: (body: Record<string, unknown>) => apiFetch<Me>("/me", { method: "PATCH", auth: true, body }),
  usernameAvailable: (username: string) =>
    apiFetch<{ available: boolean }>(`/users/username-available?username=${encodeURIComponent(username)}`),
  searchUsers: (q: string) =>
    apiFetch<{ data: { id: string; name: string; username: string; email: string; avatarUrl: string | null }[] }>(`/users/search?q=${encodeURIComponent(q)}`, { auth: true }).then((r) => r.data),
  deleteAccount: () => apiFetch<void>("/me", { method: "DELETE", auth: true }),
  countries: () => apiFetch<{ data: Country[] }>("/countries"),
};
