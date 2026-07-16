import axios from "../lib/axios";

export type EventTranslations = Record<string, { name?: string; description?: string; venue?: string }>;

export interface AdminEvent {
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
  translations?: EventTranslations;
}
export type EventInput = Omit<AdminEvent, "id" | "registeredCount">;

export const EVENTS_KEY = "events";
export const listEvents = (search?: string) =>
  axios.get<{ data: AdminEvent[] }>("/events", { params: { search } }).then((r) => r.data.data);
export const getEvent = (id: string) => axios.get<AdminEvent>(`/events/${id}`).then((r) => r.data);
export const createEvent = (data: Partial<EventInput>) => axios.post<AdminEvent>("/events", data).then((r) => r.data);
export const updateEvent = (id: string, data: Partial<EventInput>) => axios.patch<AdminEvent>(`/events/${id}`, data).then((r) => r.data);
export const deleteEvent = (id: string) => axios.delete(`/events/${id}`);

export interface EventRegistration {
  id: string; status: string; note: string | null; createdAt: string;
  eventId: string; eventName: string | null; userId: string; userName: string | null; userEmail: string | null; userPhone: string | null;
}
export const EVENT_REGS_KEY = "event-registrations";
export const listEventRegistrations = () => axios.get<{ data: EventRegistration[] }>("/events/registrations").then((r) => r.data.data);
export const updateEventRegistration = (id: string, status: string) => axios.patch(`/events/registrations/${id}`, { status }).then((r) => r.data);
