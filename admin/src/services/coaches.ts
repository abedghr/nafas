import axios from "../lib/axios";

export interface Money { amount: number; currency: string }
export interface Coach {
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
}
export type CoachInput = Partial<Omit<Coach, "id" | "name" | "avatarUrl" | "countryId">>;

export const COACHES_KEY = "coaches";
export const listCoaches = (search?: string) =>
  axios.get<{ data: Coach[] }>("/coaches", { params: { search } }).then((r) => r.data.data);
export const getCoach = (id: string) => axios.get<Coach>(`/coaches/${id}`).then((r) => r.data);
export const updateCoach = (id: string, data: CoachInput) => axios.patch<Coach>(`/coaches/${id}`, data).then((r) => r.data);

export interface Booking {
  id: string; status: string; date: string | null; note: string | null; createdAt: string;
  coachId: string; coachName: string | null; clientId: string; clientName: string | null; clientEmail: string | null;
}
export const BOOKINGS_KEY = "coach-bookings";
export const listBookings = () => axios.get<{ data: Booking[] }>("/coaches/bookings").then((r) => r.data.data);
export const updateBooking = (id: string, status: string) => axios.patch(`/coaches/bookings/${id}`, { status }).then((r) => r.data);
