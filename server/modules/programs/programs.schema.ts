import { z } from "zod";

export const ProgramDayInputSchema = z.object({
  weekIndex: z.number().int().min(0),
  dayIndex: z.number().int().min(0).max(6),
  restDay: z.boolean().default(false),
  templateId: z.string().uuid().nullish(),
  name: z.string().default(""),
  exercises: z.array(z.any()).default([]), // inline workout (same shape as template exercises)
  label: z.string().default(""),
  notes: z.string().default(""),
});

export const WeekMetaSchema = z.object({
  index: z.number().int().min(0),
  name: z.string().default(""),
  notes: z.string().default(""),
});

export const ProgramCreateSchema = z.object({
  id: z.string().uuid().optional(), // client-provided id (honored, like logs)
  name: z.string().min(1),
  startDate: z.string().nullish(), // ISO date
  weeks: z.number().int().min(1).max(52).default(4),
  notes: z.string().default(""),
  weekMeta: z.array(WeekMetaSchema).default([]),
  days: z.array(ProgramDayInputSchema).default([]),
});

export type ProgramCreate = z.infer<typeof ProgramCreateSchema>;

// Share an original program with a user and/or via a redeemable code.
export const ShareCreateSchema = z.object({
  toUserId: z.string().uuid().nullish(),
  generateCode: z.boolean().default(false),
  claimExpiresAt: z.string().datetime().nullish(),   // null/absent = unlimited
  accessExpiresAt: z.string().datetime().nullish(),  // null/absent = unlimited
}).refine((v) => v.toUserId || v.generateCode, { message: "toUserId or generateCode required" });

export const ClaimSchema = z.object({ code: z.string().min(4).max(12) });

// ── program enrollment / scheduling ──
export const EnrollSchema = z.object({
  programId: z.string().uuid(),
  startDate: z.string(), // ISO date
});
export const EnrollUpdateSchema = z.object({
  startDate: z.string().optional(),
  status: z.enum(["active", "finished", "abandoned"]).optional(),
  overrides: z.record(z.record(z.number().int().min(0).max(6))).optional(),
});
export const DayStatusSchema = z.object({
  weekIndex: z.number().int().min(0),
  dayIndex: z.number().int().min(0).max(6),
  status: z.enum(["done", "skipped"]),
  completedDate: z.string().nullish(),
  logId: z.string().uuid().nullish(),
});
