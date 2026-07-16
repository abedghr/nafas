import { z } from "zod";

export const EventSchema = z.object({
  id: z.string(),
  countryId: z.string().nullable(),
  ownerId: z.string().nullable(),
  gymId: z.string().nullable(),
  gymName: z.string().nullable().optional(),
  type: z.string(),
  category: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  venue: z.string(),
  city: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  capacity: z.number(),
  registeredCount: z.number(),
  status: z.string(),
  isActive: z.boolean(),
  isFree: z.boolean().optional(),
  currency: z.string().nullable().optional(),
  priceTiers: z.array(z.object({ label: z.string(), amount: z.number() })).optional(),
  tags: z.array(z.string()),
  myStatus: z.string().nullable().optional(),
  canManage: z.boolean().optional(),
}).openapi("Event");

const PriceTierSchema = z.object({ label: z.string().min(1).max(48), amount: z.number().min(0) });

export const AdminEventInputSchema = z.object({
  countryId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  gymId: z.string().uuid().nullable().optional(),
  type: z.enum(["tournament", "event", "challenge"]).default("tournament"),
  category: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  logoUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  venue: z.string().default(""),
  city: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  capacity: z.number().int().min(0).default(0),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming"),
  isActive: z.boolean().default(true),
  isFree: z.boolean().optional(),
  currency: z.string().length(3).nullable().optional(),
  priceTiers: z.array(PriceTierSchema).optional(),
  tags: z.array(z.string()).default([]),
  translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional(), venue: z.string().optional() })).optional(),
}).openapi("AdminEventInput");

export const RegisterInputSchema = z.object({ note: z.string().max(500).optional() }).openapi("EventRegisterInput");

// Organizer updates a registration: change approval status and/or record payment.
export const RegStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "rejected", "cancelled"]).optional(),
  paid: z.boolean().optional(),
  amountPaid: z.number().min(0).nullable().optional(),
  tierLabel: z.string().max(48).nullable().optional(),
}).openapi("EventRegUpdate");

// Manager walk-in: register an existing user at the door.
export const AddRegistrantSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  note: z.string().max(500).optional(),
  tierLabel: z.string().max(48).optional(),
}).openapi("EventAddRegistrant");

export type AdminEventInput = z.infer<typeof AdminEventInputSchema>;
