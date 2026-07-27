import { z } from "zod";

export const ProgramDayInputSchema = z.object({
  weekIndex: z.number().int().min(0),
  dayIndex: z.number().int().min(0).max(6),
  restDay: z.boolean().default(false),
  templateId: z.string().uuid().nullish(),
  label: z.string().default(""),
  notes: z.string().default(""),
});

export const ProgramCreateSchema = z.object({
  id: z.string().uuid().optional(), // client-provided id (honored, like logs)
  name: z.string().min(1),
  startDate: z.string().nullish(), // ISO date
  weeks: z.number().int().min(1).max(52).default(4),
  notes: z.string().default(""),
  days: z.array(ProgramDayInputSchema).default([]),
});

export type ProgramCreate = z.infer<typeof ProgramCreateSchema>;
