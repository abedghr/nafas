import axios from "../lib/axios";

export type FacilityTranslations = Record<string, { title?: string; description?: string }>;
export interface Facility {
  id: string;
  icon: string;
  logoUrl: string | null;
  title: string;
  description: string;
  translations?: FacilityTranslations;
}
export interface FacilityInput {
  icon: string;
  logoUrl?: string | null;
  title: string;
  description: string;
  translations?: FacilityTranslations;
}

export const FACILITIES_KEY = "facilities";

// all under admin baseURL (/api/admin/facilities) — returns en base + translations
export const listFacilities = () => axios.get<{ data: Facility[] }>("/facilities").then((r) => r.data.data);
export const createFacility = (data: FacilityInput) => axios.post<Facility>("/facilities", data).then((r) => r.data);
export const updateFacility = (id: string, data: Partial<FacilityInput>) => axios.patch<Facility>(`/facilities/${id}`, data).then((r) => r.data);
export const deleteFacility = (id: string) => axios.delete(`/facilities/${id}`);
