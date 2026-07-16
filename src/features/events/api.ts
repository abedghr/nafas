import { apiFetch } from "@/src/lib/api";
import type { ClassItem } from "@/src/features/gyms/api";

export interface ApiEvent {
  id: string;
  countryId: string | null;
  ownerId: string | null;
  gymId: string | null;
  gymName?: string | null;
  type: string;
  category: string | null;
  name: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  venue: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  registeredCount: number;
  status: string;
  isActive: boolean;
  tags: string[];
  isFree?: boolean;
  currency?: string | null;
  priceTiers?: { label: string; amount: number }[];
  myStatus?: string | null;
  my?: { status: string; paid: boolean; amountPaid: number | null; tierLabel: string | null } | null;
  canManage?: boolean;
}
export interface PageMeta { page: number; perPage: number; total: number }
export interface MyEvent { id: string; status: string; eventId: string; name: string; startsAt: string | null; venue: string | null; type: string | null }
export interface PaymentEntry { at: string; by: string | null; byName?: string; amount: number | null; tierLabel: string | null; action: string }
export interface EventRegistrant {
  id: string; status: string; note: string | null; createdAt: string;
  eventId: string; eventName: string | null; userId: string; addedBy: string | null;
  userName: string | null; userPhone: string | null; userEmail: string | null;
  paid: boolean; amountPaid: number | null; tierLabel: string | null; paidAt: string | null;
  paymentHistory: PaymentEntry[];
}
export interface RegPatch { status?: string; paid?: boolean; amountPaid?: number | null; tierLabel?: string | null }

export const eventsApi = {
  list: (opts?: { search?: string; type?: string; upcoming?: boolean; countryId?: string }) => {
    const q = new URLSearchParams();
    if (opts?.search) q.set("search", opts.search);
    if (opts?.type) q.set("type", opts.type);
    if (opts?.upcoming) q.set("upcoming", "true");
    if (opts?.countryId) q.set("countryId", opts.countryId);
    const qs = q.toString();
    return apiFetch<{ data: ApiEvent[]; meta: PageMeta }>(`/events${qs ? `?${qs}` : ""}`, { auth: true });
  },
  get: (id: string) => apiFetch<ApiEvent>(`/events/${id}`, { auth: true }),
  register: (id: string, note?: string) => apiFetch(`/events/${id}/register`, { method: "POST", auth: true, body: { note } }),
  cancelRegister: (id: string) => apiFetch(`/events/${id}/register`, { method: "DELETE", auth: true }),
  mine: () => apiFetch<{ data: MyEvent[] }>("/events/me/registrations", { auth: true }).then((r) => r.data),
  owned: () => apiFetch<{ data: ApiEvent[] }>("/events/me/owned", { auth: true }).then((r) => r.data),
  registrants: () => apiFetch<{ data: EventRegistrant[] }>("/events/me/registrants", { auth: true }).then((r) => r.data),
  updateRegistrant: (id: string, patch: RegPatch) => apiFetch(`/events/me/registrants/${id}`, { method: "PATCH", auth: true, body: patch }),
  addRegistrant: (eventId: string, userId: string, tierLabel?: string) => apiFetch(`/events/me/registrants`, { method: "POST", auth: true, body: { eventId, userId, tierLabel } }),
  // event sessions (classes) — same join flow as gym classes
  classes: (eventId: string) => apiFetch<{ data: ClassItem[] }>(`/events/${eventId}/classes`, { auth: true }).then((r) => r.data),
  // host-gym events (gym profile)
  forGym: (gymId: string) => apiFetch<{ data: ApiEvent[] }>(`/gyms/${gymId}/events`, { auth: true }).then((r) => r.data),
  // manager self-service
  managed: () => apiFetch<{ data: ApiEvent[] }>("/events/me/managed", { auth: true }).then((r) => r.data),
  create: (body: Record<string, any>) => apiFetch<ApiEvent>("/events/me/managed", { method: "POST", auth: true, body }),
  update: (id: string, body: Record<string, any>) => apiFetch<ApiEvent>(`/events/me/managed/${id}`, { method: "PATCH", auth: true, body }),
  remove: (id: string) => apiFetch(`/events/me/managed/${id}`, { method: "DELETE", auth: true }),
};
