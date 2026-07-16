import { z } from "zod";

// Safe public view of a user.
export const UserPublicSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    username: z.string(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    rank: z.string(),
    role: z.enum(["athlete", "coach", "admin"]),
  })
  .openapi("UserPublic");

// Full self view (/me).
export const MeSchema = UserPublicSchema.extend({
  email: z.string().email(),
  phone: z.string().nullable(),
  countryId: z.string().uuid().nullable(),
  language: z.string(),
  theme: z.string(),
  height: z.number().nullable(),
  weight: z.number().nullable(),
  age: z.number().nullable(),
  gender: z.string().nullable(),
  goal: z.string().nullable(),
  interests: z.array(z.string()),
  profileComplete: z.boolean(),
  status: z.enum(["active", "suspended"]),
}).openapi("Me");

export const UpdateMeSchema = z
  .object({
    name: z.string().min(1).optional(),
    username: z.string().min(3).max(32).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    bio: z.string().optional(),
    height: z.number().int().optional(),
    weight: z.number().int().optional(),
    age: z.number().int().optional(),
    gender: z.string().optional(),
    goal: z.string().optional(),
    interests: z.array(z.string()).optional(),
    language: z.string().optional(),
    theme: z.enum(["dark", "light"]).optional(),
    countryId: z.string().uuid().optional(),
    profileComplete: z.boolean().optional(),
  })
  .openapi("UpdateMe");

export const CoachProfileInputSchema = z
  .object({
    specialty: z.array(z.string()).min(1),
    yearsExperience: z.number().int().min(0),
    certifications: z.array(z.string()).default([]),
  })
  .openapi("CoachProfileInput");

export const AdminUserUpdateSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    role: z.enum(["athlete", "coach", "admin"]).optional(),
  })
  .openapi("AdminUserUpdate");

export type UpdateMe = z.infer<typeof UpdateMeSchema>;
export type CoachProfileInput = z.infer<typeof CoachProfileInputSchema>;
export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;
