import { apiFetch } from "@/src/lib/api";

export interface Money { amount: number; currency: string }
export interface MenuItem { name: string; description?: string; price: Money; calories?: number }
export interface ApiRestaurant {
  id: string;
  countryId: string | null;
  ownerId: string | null;
  name: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  rating: number;
  phone: string | null;
  workingHours: string | null;
  priceRange: string | null;
  cuisines: string[];
  menu: MenuItem[];
  isActive: boolean;
}
export interface PageMeta { page: number; perPage: number; total: number }

export const restaurantsApi = {
  list: (opts?: { search?: string; countryId?: string; page?: number; perPage?: number }) => {
    const q = new URLSearchParams();
    if (opts?.search) q.set("search", opts.search);
    if (opts?.countryId) q.set("countryId", opts.countryId);
    if (opts?.page) q.set("page", String(opts.page));
    if (opts?.perPage) q.set("perPage", String(opts.perPage));
    const qs = q.toString();
    return apiFetch<{ data: ApiRestaurant[]; meta: PageMeta }>(`/restaurants${qs ? `?${qs}` : ""}`, { auth: true });
  },
  get: (id: string) => apiFetch<ApiRestaurant>(`/restaurants/${id}`, { auth: true }),
  reserve: (id: string, body: { date?: string; partySize?: number; note?: string }) =>
    apiFetch<{ status: string }>(`/restaurants/${id}/reserve`, { method: "POST", auth: true, body }),
};
