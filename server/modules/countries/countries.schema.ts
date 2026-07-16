import { z } from "zod";

export const CountrySchema = z
  .object({
    id: z.string().uuid(),
    code: z.string().length(2),
    name: z.string(),
    currency: z.string().length(3),
    phoneCode: z.string(),
    language: z.string(),
    locale: z.string(),
    timezone: z.string(),
    isActive: z.boolean(),
  })
  .openapi("Country");

export const CountryCreateSchema = z
  .object({
    code: z.string().length(2),
    name: z.string().min(1),
    currency: z.string().length(3),
    phoneCode: z.string().min(1),
    language: z.string().default("en"),
    locale: z.string().min(2),
    timezone: z.string().min(2),
    isActive: z.boolean().default(true),
  })
  .openapi("CountryCreate");

export const CountryUpdateSchema = CountryCreateSchema.partial().openapi("CountryUpdate");

export type CountryCreate = z.infer<typeof CountryCreateSchema>;
export type CountryUpdate = z.infer<typeof CountryUpdateSchema>;
