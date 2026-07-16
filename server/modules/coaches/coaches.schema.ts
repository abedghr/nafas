import { z } from "zod";

const MoneySchema = z.object({ amount: z.number(), currency: z.string() });
export const CoachPlanSchema = z.object({
  id: z.string(), name: z.string(), includes: z.array(z.string()), duration: z.string().nullable(), price: MoneySchema.nullable(), sortOrder: z.number(),
}).openapi("CoachPlan");
export const CoachPlanInputSchema = z.object({
  name: z.string().min(1), includes: z.array(z.string()).default([]), duration: z.string().nullable().optional(), price: MoneySchema.nullable().optional(), sortOrder: z.number().int().optional(),
}).openapi("CoachPlanInput");

export const TransformationSchema = z.object({
  id: z.string(), beforeImage: z.string().nullable(), afterImage: z.string().nullable(), duration: z.string().nullable(), target: z.string().nullable(), clientName: z.string().nullable(),
}).openapi("Transformation");
export const TransformationInputSchema = z.object({
  beforeImage: z.string().nullable().optional(), afterImage: z.string().nullable().optional(), duration: z.string().nullable().optional(), target: z.string().nullable().optional(), clientName: z.string().nullable().optional(),
}).openapi("TransformationInput");

// public coach card/profile (joined user + coach_profile)
export const CoachSchema = z.object({
  id: z.string(),               // coach user id
  name: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  countryId: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  bio: z.string(),
  headline: z.string(),
  specialty: z.array(z.string()),
  certifications: z.array(z.string()),
  yearsExperience: z.number(),
  rating: z.number(),
  reviewsCount: z.number(),
  clientsCount: z.number(),
  pricePerSession: MoneySchema.nullable(),
  gymId: z.string().nullable(),
  gymName: z.string().nullable(),
  verificationStatus: z.string(),
  isFeatured: z.boolean(),
  socialLinks: z.record(z.string(), z.string()),
  plans: z.array(CoachPlanSchema).optional(),
  transformations: z.array(TransformationSchema).optional(),
}).openapi("Coach");

// admin edit of marketplace fields (the coach profile, not the user account)
export const AdminCoachInputSchema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),            // writes users.bio
  specialty: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  pricePerSession: MoneySchema.nullable().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).optional(),
  clientsCount: z.number().int().min(0).optional(),
  gymId: z.string().uuid().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
}).openapi("AdminCoachInput");

export const BookSessionSchema = z.object({ date: z.string().optional(), note: z.string().optional(), planId: z.string().uuid().optional() }).openapi("BookSession");
export const BookingStatusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) }).openapi("BookingStatus");

export type AdminCoachInput = z.infer<typeof AdminCoachInputSchema>;
