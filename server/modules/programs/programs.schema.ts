import { z } from "zod";

// one session within a day (e.g. morning run, evening calisthenics)
export const SessionInputSchema = z.object({
  id: z.string().default(""),
  label: z.string().default(""),          // "Morning" / "Evening" / free
  name: z.string().default(""),           // workout name (training type)
  templateId: z.string().uuid().nullish(),
  exercises: z.array(z.any()).default([]),
});

export const ProgramDayInputSchema = z.object({
  weekIndex: z.number().int().min(0),
  dayIndex: z.number().int().min(0).max(6),
  restDay: z.boolean().default(false),
  // LEGACY single-workout fields (still accepted; new clients send `sessions`)
  templateId: z.string().uuid().nullish(),
  name: z.string().default(""),
  exercises: z.array(z.any()).default([]), // inline workout (same shape as template exercises)
  sessions: z.array(SessionInputSchema).optional(), // 1+ sessions; empty/absent = use legacy fields
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
  // per-day flagged deviations, keyed by "<week>-<day>"
  dayEdits: z.record(z.object({ added: z.array(z.any()).optional(), removed: z.array(z.string()).optional() })).optional(),
  // per-enrollment day order: array of "<week>-<day>" keys
  dayOrder: z.array(z.string()).optional(),
});
export const DayStatusSchema = z.object({
  weekIndex: z.number().int().min(0),
  dayIndex: z.number().int().min(0).max(6),
  sessionIndex: z.number().int().min(0).default(0), // which session in the day
  status: z.enum(["done", "skipped", "rest"]),
  completedDate: z.string().nullish(),
  durationMin: z.number().int().min(0).max(1440).nullish(),
  logId: z.string().uuid().nullish(),
});

// Compact, client-computed report context fed to the AI. Numbers only — kept
// permissive (passthrough) since it is the user's own derived stats, not trusted input.
export const ReportContextSchema = z.object({
  language: z.string().max(8).optional(),
}).passthrough();
