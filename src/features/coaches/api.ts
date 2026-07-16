import { apiFetch } from "@/src/lib/api";

export interface Money { amount: number; currency: string }
export interface CoachPlan { id: string; name: string; includes: string[]; duration: string | null; price: Money | null; sortOrder: number }
export interface Transformation { id: string; beforeImage: string | null; afterImage: string | null; duration: string | null; target: string | null; clientName: string | null }
export interface ApiCoach {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  countryId: string | null;
  phone: string | null;
  whatsapp: string | null;
  bio: string;
  headline: string;
  specialty: string[];
  certifications: string[];
  yearsExperience: number;
  rating: number;
  reviewsCount: number;
  clientsCount: number;
  pricePerSession: Money | null;
  gymId: string | null;
  gymName: string | null;
  verificationStatus: string;
  isFeatured: boolean;
  socialLinks: Record<string, string>;
  plans?: CoachPlan[];
  transformations?: Transformation[];
}
export interface PageMeta { page: number; perPage: number; total: number }

// coach self-service plan management
export const coachPlansApi = {
  mine: () => apiFetch<{ data: CoachPlan[] }>("/coaches/me/plans", { auth: true }).then((r) => r.data),
  create: (body: Partial<CoachPlan>) => apiFetch<CoachPlan>("/coaches/me/plans", { method: "POST", auth: true, body }),
  update: (id: string, body: Partial<CoachPlan>) => apiFetch<CoachPlan>(`/coaches/me/plans/${id}`, { method: "PATCH", auth: true, body }),
  remove: (id: string) => apiFetch<void>(`/coaches/me/plans/${id}`, { method: "DELETE", auth: true }),
};

// coach self-service before/after transformations
export const coachTransformationsApi = {
  mine: () => apiFetch<{ data: Transformation[] }>("/coaches/me/transformations", { auth: true }).then((r) => r.data),
  create: (body: Partial<Transformation>) => apiFetch<Transformation>("/coaches/me/transformations", { method: "POST", auth: true, body }),
  update: (id: string, body: Partial<Transformation>) => apiFetch<Transformation>(`/coaches/me/transformations/${id}`, { method: "PATCH", auth: true, body }),
  remove: (id: string) => apiFetch<void>(`/coaches/me/transformations/${id}`, { method: "DELETE", auth: true }),
};

export const coachesApi = {
  list: (opts?: { search?: string; page?: number; perPage?: number }) => {
    const q = new URLSearchParams();
    if (opts?.search) q.set("search", opts.search);
    if (opts?.perPage) q.set("perPage", String(opts.perPage));
    const qs = q.toString();
    return apiFetch<{ data: ApiCoach[]; meta: PageMeta }>(`/coaches${qs ? `?${qs}` : ""}`, { auth: true });
  },
  get: (id: string) => apiFetch<ApiCoach>(`/coaches/${id}`, { auth: true }),
  book: (id: string, body: { date?: string; note?: string; planId?: string }) =>
    apiFetch<{ status: string }>(`/coaches/${id}/book`, { method: "POST", auth: true, body }),
  myLeads: () => apiFetch<{ data: CoachLead[] }>("/coaches/me/leads", { auth: true }).then((r) => r.data),
  updateLead: (id: string, status: string) => apiFetch(`/coaches/me/leads/${id}`, { method: "PATCH", auth: true, body: { status } }),
};

export interface CoachLead { id: string; status: string; note: string | null; createdAt: string; planName: string | null; clientName: string | null; clientPhone: string | null; clientEmail: string | null }
