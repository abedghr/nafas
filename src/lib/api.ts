import { fetch } from "expo/fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { tokens } from "./auth-tokens";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

interface Opts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  _retry?: boolean;
}

function apiBase() {
  return getApiUrl().replace(/\/$/, "") + "/api";
}

// Session-expired hook: fired when an authed request 401s and the refresh token
// is also dead/invalid (no way to recover). The app registers a handler that
// clears local state and routes to /auth. Debounced so a burst of parallel 401s
// triggers a single logout.
let onAuthExpired: (() => void) | null = null;
let lastExpiredAt = 0;
export function setOnAuthExpired(fn: (() => void) | null): void {
  onAuthExpired = fn;
}
function fireAuthExpired(): void {
  const now = Date.now();
  if (now - lastExpiredAt < 3000) return; // collapse concurrent 401s into one logout
  lastExpiredAt = now;
  onAuthExpired?.();
}

// Single-flight refresh so concurrent 401s don't stampede.
let refreshing: Promise<string | null> | null = null;
async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const { refresh } = await tokens.get();
      if (!refresh) return null;
      try {
        const res = await fetch(`${apiBase()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        await tokens.set(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function apiFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, auth = false, _retry = false } = opts;
  const lang = (await AsyncStorage.getItem("nafas_language")) || "en";
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-lang": lang };
  if (auth) {
    const { access } = await tokens.get();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    if (!_retry) {
      const fresh = await refreshAccess();
      if (fresh) return apiFetch<T>(path, { ...opts, _retry: true });
    }
    // Either no refresh token / refresh failed, or a freshly-refreshed token was
    // still rejected → the session is truly dead. Trigger a global logout.
    fireAuthExpired();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ code: "PARSE", message: res.statusText }));
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? "ERROR", data.message ?? "Request failed");
  }
  return data as T;
}
