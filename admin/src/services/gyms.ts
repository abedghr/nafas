import axios from "../lib/axios";

export interface Money { amount: number; currency: string }
export interface Subscription { name: string; price: Money }
export interface GymClass { name: string; time: string; duration: string; coach?: string }
export interface DaySchedule { day: string; open?: string; close?: string; closed?: boolean; classes: GymClass[] }
export type GymTranslations = Record<string, { name?: string; description?: string }>;

export interface Gym {
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
  whatsapp: string | null;
  headCoachId: string | null;
  workingHours: string | null;
  memberCount: number;
  types: string[];
  facilityIds: string[];
  facilities?: { id: string; icon: string; logoUrl: string | null; title: string; description: string }[]; // hydrated (GET single)
  subscriptions: Subscription[];
  schedule: DaySchedule[];
  isActive: boolean;
  translations?: GymTranslations;
}

export type GymInput = Omit<Gym, "id" | "schedule"> & { schedule?: DaySchedule[] };

export const GYMS_KEY = "gyms";

export const listGyms = (search?: string) =>
  axios.get<{ data: Gym[] }>("/gyms", { params: { search } }).then((r) => r.data.data);
export const getGym = (id: string) => axios.get<Gym>(`/gyms/${id}`).then((r) => r.data);
export const createGym = (data: Partial<GymInput>) => axios.post<Gym>("/gyms", data).then((r) => r.data);
export const updateGym = (id: string, data: Partial<GymInput>) => axios.patch<Gym>(`/gyms/${id}`, data).then((r) => r.data);
export const deleteGym = (id: string) => axios.delete(`/gyms/${id}`);

// image upload → returns absolute URL
export const uploadImage = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return axios.post<{ url: string }>("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.url);
};

// membership requests
export interface GymRequest {
  id: string; status: string; plan: string | null; createdAt: string;
  gymId: string; gymName: string | null; userId: string; userName: string | null; userEmail: string | null; userPhone: string | null;
}
export const GYM_REQUESTS_KEY = "gym-requests";
export const listGymRequests = () => axios.get<{ data: GymRequest[] }>("/gyms/requests").then((r) => r.data.data);
export const updateGymRequest = (id: string, status: string) => axios.patch(`/gyms/requests/${id}`, { status }).then((r) => r.data);

// classes
export type ClassTranslations = Record<string, { title?: string; description?: string }>;
export interface GymClassRow {
  id: string; gymId: string | null; eventId: string | null; coachId: string | null; title: string; description: string;
  dayOfWeek: string | null; startTime: string | null; duration: string | null; capacity: number; isActive: boolean;
  translations?: ClassTranslations;
}
export type ClassInput = Omit<GymClassRow, "id">;
export const CLASSES_KEY = "classes";
// scope by gym OR event
export const listClasses = (scope: { gymId?: string; eventId?: string }) => {
  const q = scope.eventId ? `eventId=${scope.eventId}` : `gymId=${scope.gymId}`;
  return axios.get<{ data: GymClassRow[] }>(`/classes?${q}`).then((r) => r.data.data);
};
export const createClass = (data: Partial<ClassInput>) => axios.post<GymClassRow>("/classes", data).then((r) => r.data);
export const updateClass = (id: string, data: Partial<ClassInput>) => axios.patch<GymClassRow>(`/classes/${id}`, data).then((r) => r.data);
export const deleteClass = (id: string) => axios.delete(`/classes/${id}`);

// reviews (moderation)
export interface GymReviewRow { id: string; rating: number; comment: string; createdAt: string; userId: string; userName: string | null; userAvatar: string | null }
export const REVIEWS_KEY = "gym-reviews";
export const listGymReviews = (gymId: string) => axios.get<{ data: GymReviewRow[] }>(`/gyms/${gymId}/reviews`).then((r) => r.data.data);
export const deleteGymReview = (id: string) => axios.delete(`/gyms/reviews/${id}`);

// team
export interface TeamMemberRow { id?: string; userId?: string; role: string; name: string | null; email: string | null; avatarUrl: string | null }
export interface GymTeam { owner: TeamMemberRow | null; members: TeamMemberRow[] }
export const TEAM_KEY = "gym-team";
export const getGymTeam = (gymId: string) => axios.get<GymTeam>(`/gyms/${gymId}/team`).then((r) => r.data);
export const addGymTeam = (gymId: string, userId: string) => axios.post(`/gyms/${gymId}/team`, { userId }).then((r) => r.data);
export const removeGymTeam = (id: string) => axios.delete(`/gyms/team/${id}`);
