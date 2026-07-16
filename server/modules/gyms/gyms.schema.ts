import { z } from "zod";

export const MoneySchema = z.object({ amount: z.number(), currency: z.string() }).openapi("Money");
const SubscriptionSchema = z.object({ name: z.string(), price: MoneySchema });
const GymClassSchema = z.object({ name: z.string(), time: z.string(), duration: z.string(), coach: z.string().optional() });
const DayScheduleSchema = z.object({
  day: z.string(),
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
  classes: z.array(GymClassSchema),
});

export const FacilitySchema = z.object({
  id: z.string(),
  icon: z.string(),
  logoUrl: z.string().nullable(),
  title: z.string(),
  description: z.string(),
}).openapi("Facility");

export const AdminFacilityInputSchema = z.object({
  icon: z.string().default("checkmark-circle-outline"),
  logoUrl: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  translations: z.record(z.string(), z.object({ title: z.string().optional(), description: z.string().optional() })).optional(),
}).openapi("AdminFacilityInput");

export const GymSchema = z.object({
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
  reviewsCount: z.number(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  headCoachId: z.string().nullable(),
  workingHours: z.string().nullable(),
  memberCount: z.number(),
  types: z.array(z.string()),
  facilityIds: z.array(z.string()),
  facilities: z.array(FacilitySchema), // hydrated from the catalog (localized)
  subscriptions: z.array(SubscriptionSchema),
  schedule: z.array(DayScheduleSchema),
  isActive: z.boolean(),
}).openapi("Gym");

// admin create/update
export const AdminGymInputSchema = z.object({
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
  whatsapp: z.string().nullable().optional(),
  headCoachId: z.string().uuid().nullable().optional(),
  workingHours: z.string().nullable().optional(),
  memberCount: z.number().int().min(0).default(0),
  types: z.array(z.string()).default([]),
  facilityIds: z.array(z.string()).default([]),
  subscriptions: z.array(SubscriptionSchema).default([]),
  schedule: z.array(DayScheduleSchema).default([]),
  isActive: z.boolean().default(true),
  translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
}).openapi("AdminGymInput");

export const JoinRequestSchema = z.object({ plan: z.string().optional() }).openapi("GymJoinRequest");
export const RequestStatusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) }).openapi("GymRequestStatus");

// ── classes ──
export const ClassSchema = z.object({
  id: z.string(),
  gymId: z.string().nullable(),
  eventId: z.string().nullable(),
  coachId: z.string().nullable(),
  coachName: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  dayOfWeek: z.string().nullable(),
  startTime: z.string().nullable(),
  duration: z.string().nullable(),
  capacity: z.number(),
  enrolledCount: z.number(),
  myStatus: z.string().nullable(),
}).openapi("GymClass");

export const AdminClassInputSchema = z.object({
  gymId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  coachId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  dayOfWeek: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  capacity: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  translations: z.record(z.string(), z.object({ title: z.string().optional(), description: z.string().optional() })).optional(),
}).openapi("AdminClassInput");

export const EnrollStatusSchema = z.object({ status: z.enum(["enrolled", "rejected", "cancelled"]) }).openapi("ClassEnrollStatus");

// ── reviews ──
export const ReviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  comment: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  userAvatar: z.string().nullable(),
  mine: z.boolean(),
}).openapi("GymReview");
export const ReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
}).openapi("GymReviewInput");

// ── team & manager self-service ──
export const ManageGymInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  workingHours: z.string().nullable().optional(),
  address: z.string().optional(),
  city: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  types: z.array(z.string()).optional(),
  facilityIds: z.array(z.string()).optional(),
  subscriptions: z.array(z.object({ name: z.string(), price: z.object({ amount: z.number(), currency: z.string() }) })).optional(),
  schedule: z.array(z.object({
    day: z.string(), open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional(),
    classes: z.array(z.object({ name: z.string(), time: z.string().optional(), duration: z.string().optional(), coach: z.string().optional() })).default([]),
  })).optional(),
  translations: z.record(z.string(), z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
}).openapi("ManageGymInput");
export const AddTeamMemberSchema = z.object({ email: z.string().email() }).openapi("AddTeamMember");
export const TeamMemberSchema = z.object({
  id: z.string(), userId: z.string(), role: z.string(),
  name: z.string().nullable(), email: z.string().nullable(), avatarUrl: z.string().nullable(),
}).openapi("GymTeamMember");

export type AdminGymInput = z.infer<typeof AdminGymInputSchema>;
export type AdminFacilityInput = z.infer<typeof AdminFacilityInputSchema>;
export type AdminClassInput = z.infer<typeof AdminClassInputSchema>;
