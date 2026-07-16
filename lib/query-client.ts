import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";

// Port the Express API listens on (server/index.ts). Used only by the dev
// fallback below — prod is driven by EXPO_PUBLIC_API_URL/DOMAIN.
const DEV_API_PORT = 5001;

// ponytail: dev fallback — a physical device can't reach "localhost" and the
// LAN IP changes per network, so instead of baking EXPO_PUBLIC_DOMAIN at build
// time, derive the API host from the Metro/dev-server host at runtime (the same
// machine serves both the bundle and the API). Set EXPO_PUBLIC_API_URL/DOMAIN to
// override for prod/staging.
function devHostFromMetro(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants.manifest2 as any)?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;
  const ip = String(hostUri).split(":")[0];
  return ip ? `${ip}:${DEV_API_PORT}` : null;
}

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5001")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Explicit full URL wins — set this for prod/staging (e.g. https://api.nafas.app).
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.endsWith("/") ? explicit : explicit + "/";

  // In dev the app bundle is served by Metro from the SAME machine that runs the
  // API, so the Metro/dev-server host is the one host guaranteed reachable from
  // whatever opened the app (device on LAN, simulator, or web). Prefer it over
  // EXPO_PUBLIC_DOMAIN — a stale/wrong hand-set IP (or "localhost" on a device)
  // otherwise makes every request hang. Falls back to the env var if Metro's
  // host is unavailable (e.g. a production/standalone build with no dev server).
  const host = devHostFromMetro() || process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) {
    throw new Error("EXPO_PUBLIC_API_URL or EXPO_PUBLIC_DOMAIN must be set");
  }

  // Local/LAN hosts use http; everything else https.
  const isLocal = /^(localhost|127\.|192\.168\.|10\.|172\.)/.test(host);
  const scheme = isLocal ? "http" : "https";
  return new URL(`${scheme}://${host}`).href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
