import { z } from "zod";

// Standard list query params (search + pagination + ordering).
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

// Express 5 query values are string | string[] | ParsedQs | …; narrow to a plain string.
export const qstr = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
}

// Typed list envelope. Single resources return the entity directly;
// lists return { data, meta }. Errors are { code, message } (see middleware/error).
export function paginated<T>(data: T[], meta: PageMeta) {
  return { data, meta };
}

// zod response schema for a paginated list of `item`, for OpenAPI.
export function listSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      page: z.number(),
      perPage: z.number(),
      total: z.number(),
    }),
  });
}
