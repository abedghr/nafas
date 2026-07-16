import { apiFetch } from "@/src/lib/api";

export interface Money { amount: number; currency: string }
export interface GymSubscription { name: string; price: Money }
export interface GymClass { name: string; time: string; duration: string; coach?: string }
export interface DaySchedule { day: string; open?: string; close?: string; closed?: boolean; classes: GymClass[] }
export interface Facility { id: string; icon: string; logoUrl: string | null; title: string; description: string }
export interface ApiGym {
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
  reviewsCount: number;
  phone: string | null;
  whatsapp: string | null;
  headCoachId: string | null;
  workingHours: string | null;
  memberCount: number;
  types: string[];
  facilityIds: string[];
  facilities: Facility[]; // hydrated from catalog (localized)
  subscriptions: GymSubscription[];
  schedule: DaySchedule[];
  coaches?: { id: string; name: string; avatarUrl: string | null; headline: string; specialty: string[]; rating: number; pricePerSession: Money | null }[];
  isActive: boolean;
  canManage?: boolean;
}

export interface PageMeta { page: number; perPage: number; total: number }

export const gymsApi = {
  list: (opts?: { search?: string; countryId?: string; page?: number; perPage?: number }) => {
    const q = new URLSearchParams();
    if (opts?.search) q.set("search", opts.search);
    if (opts?.countryId) q.set("countryId", opts.countryId);
    if (opts?.page) q.set("page", String(opts.page));
    if (opts?.perPage) q.set("perPage", String(opts.perPage));
    const qs = q.toString();
    return apiFetch<{ data: ApiGym[]; meta: PageMeta }>(`/gyms${qs ? `?${qs}` : ""}`, { auth: true });
  },
  get: (id: string) => apiFetch<ApiGym>(`/gyms/${id}`, { auth: true }),
  join: (id: string, plan?: string) => apiFetch<{ status: string }>(`/gyms/${id}/join`, { method: "POST", auth: true, body: { plan } }),
  cancelJoin: (id: string) => apiFetch(`/gyms/${id}/join`, { method: "DELETE", auth: true }),
  myGyms: () => apiFetch<{ data: MyGym[] }>("/gyms/me/gyms", { auth: true }).then((r) => r.data),
  ownedGyms: () => apiFetch<{ data: ApiGym[] }>("/gyms/me/owned", { auth: true }).then((r) => r.data),
  ownerLeads: () => apiFetch<{ data: GymLead[] }>("/gyms/me/leads", { auth: true }).then((r) => r.data),
  updateOwnerLead: (id: string, status: string) => apiFetch(`/gyms/me/leads/${id}`, { method: "PATCH", auth: true, body: { status } }),
  // team & manager self-service
  facilitiesCatalog: () => apiFetch<{ data: Facility[] }>("/facilities", { auth: true }).then((r) => r.data),
  managed: () => apiFetch<{ data: ManagedGym[] }>("/gyms/me/managed", { auth: true }).then((r) => r.data),
  updateManaged: (id: string, patch: Record<string, any>) => apiFetch<ApiGym>(`/gyms/me/managed/${id}`, { method: "PATCH", auth: true, body: patch }),
  team: (id: string) => apiFetch<{ owner: TeamMember | null; members: TeamMember[] }>(`/gyms/me/managed/${id}/team`, { auth: true }),
  addManager: (id: string, email: string) => apiFetch(`/gyms/me/managed/${id}/team`, { method: "POST", auth: true, body: { email } }),
  removeManager: (id: string, memberId: string) => apiFetch(`/gyms/me/managed/${id}/team/${memberId}`, { method: "DELETE", auth: true }),
};

export interface ManagedGym extends ApiGym { isOwner: boolean }
export interface TeamMember { id?: string; userId?: string; role: string; name: string | null; email: string | null; avatarUrl: string | null }

// classes
export interface ClassItem { id: string; gymId: string; coachId: string | null; coachName: string | null; title: string; description: string; dayOfWeek: string | null; startTime: string | null; duration: string | null; capacity: number; enrolledCount: number; myStatus: string | null }
export interface ClassRequest { id: string; status: string; expiresAt: string | null; createdAt: string; classId: string; className: string | null; userName: string | null; userPhone: string | null; userEmail: string | null }
export interface MyClass { id: string; status: string; expiresAt: string | null; classId: string; title: string; startTime: string | null; dayOfWeek: string | null; gymId: string | null; gymName: string | null }

export const classesApi = {
  forGym: (gymId: string) => apiFetch<{ data: ClassItem[] }>(`/gyms/${gymId}/classes`, { auth: true }).then((r) => r.data),
  join: (classId: string) => apiFetch(`/classes/${classId}/join`, { method: "POST", auth: true }),
  cancel: (classId: string) => apiFetch(`/classes/${classId}/join`, { method: "DELETE", auth: true }),
  mine: () => apiFetch<{ data: MyClass[] }>("/gyms/me/classes", { auth: true }).then((r) => r.data),
  requests: () => apiFetch<{ data: ClassRequest[] }>("/gyms/me/class-requests", { auth: true }).then((r) => r.data),
  updateRequest: (id: string, status: string) => apiFetch(`/gyms/me/class-requests/${id}`, { method: "PATCH", auth: true, body: { status } }),
};

// reviews
export interface GymReview { id: string; rating: number; comment: string; createdAt: string; userId: string; userName: string | null; userAvatar: string | null; mine: boolean }

export const reviewsApi = {
  forGym: (gymId: string) => apiFetch<{ data: GymReview[] }>(`/gyms/${gymId}/reviews`, { auth: true }).then((r) => r.data),
  submit: (gymId: string, rating: number, comment?: string) => apiFetch(`/gyms/${gymId}/reviews`, { method: "POST", auth: true, body: { rating, comment } }),
  remove: (id: string) => apiFetch(`/gyms/reviews/${id}`, { method: "DELETE", auth: true }),
};

export interface MyGym { kind: "membership" | "request"; status: string; plan: string | null; gymId: string; gym: ApiGym }
export interface GymLead { id: string; status: string; plan: string | null; createdAt: string; gymId: string; gymName: string | null; userName: string | null; userPhone: string | null; userEmail: string | null }
