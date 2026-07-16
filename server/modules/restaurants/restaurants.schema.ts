import { z } from "zod";

export const MoneySchema = z.object({ amount: z.number(), currency: z.string() });
const MenuItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: MoneySchema,
  calories: z.number().optional(),
});

export const RestaurantSchema = z.object({
  id: z.string(),
  countryId: z.string().nullable(),
  ownerId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  address: z.string(),
  city: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  rating: z.number(),
  phone: z.string().nullable(),
  workingHours: z.string().nullable(),
  priceRange: z.string().nullable(),
  cuisines: z.array(z.string()),
  menu: z.array(MenuItemSchema),
  isActive: z.boolean(),
}).openapi("Restaurant");

export const AdminRestaurantInputSchema = z.object({
  countryId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  logoUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  address: z.string().default(""),
  city: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  rating: z.number().min(0).max(5).default(0),
  phone: z.string().nullable().optional(),
  workingHours: z.string().nullable().optional(),
  priceRange: z.string().nullable().optional(),
  cuisines: z.array(z.string()).default([]),
  menu: z.array(MenuItemSchema).default([]),
  isActive: z.boolean().default(true),
  translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
}).openapi("AdminRestaurantInput");

export const ReserveRequestSchema = z.object({
  date: z.string().optional(),
  partySize: z.number().int().min(1).default(1),
  note: z.string().optional(),
}).openapi("ReservationRequest");
export const ReservationStatusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) }).openapi("ReservationStatus");

export type AdminRestaurantInput = z.infer<typeof AdminRestaurantInputSchema>;
