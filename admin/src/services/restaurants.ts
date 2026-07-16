import axios from "../lib/axios";

export interface Money { amount: number; currency: string }
export interface MenuItem { name: string; description?: string; price: Money; calories?: number }
export type RTranslations = Record<string, { name?: string; description?: string }>;

export interface Restaurant {
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
  translations?: RTranslations;
}
export type RestaurantInput = Omit<Restaurant, "id">;

export const RESTAURANTS_KEY = "restaurants";

export const listRestaurants = (search?: string) =>
  axios.get<{ data: Restaurant[] }>("/restaurants", { params: { search } }).then((r) => r.data.data);
export const getRestaurant = (id: string) => axios.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data);
export const createRestaurant = (data: Partial<RestaurantInput>) => axios.post<Restaurant>("/restaurants", data).then((r) => r.data);
export const updateRestaurant = (id: string, data: Partial<RestaurantInput>) => axios.patch<Restaurant>(`/restaurants/${id}`, data).then((r) => r.data);
export const deleteRestaurant = (id: string) => axios.delete(`/restaurants/${id}`);

// reservations
export interface Reservation {
  id: string; status: string; date: string | null; partySize: number; note: string | null; createdAt: string;
  restaurantId: string; restaurantName: string | null; userId: string; userName: string | null; userEmail: string | null;
}
export const RESERVATIONS_KEY = "reservations";
export const listReservations = () => axios.get<{ data: Reservation[] }>("/restaurants/reservations").then((r) => r.data.data);
export const updateReservation = (id: string, status: string) => axios.patch(`/restaurants/reservations/${id}`, { status }).then((r) => r.data);
