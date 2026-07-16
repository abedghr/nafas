import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "./error";

interface Targets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

// Validates request parts against zod. Validated values are attached to
// req.valid (Express 5 makes req.query a read-only getter, so we never reassign
// it — handlers read req.valid.query / .body / .params).
export function validate(targets: Targets): RequestHandler {
  return (req, _res, next) => {
    try {
      const valid: Record<string, unknown> = {};
      if (targets.body) valid.body = targets.body.parse(req.body);
      if (targets.query) valid.query = targets.query.parse(req.query);
      if (targets.params) valid.params = targets.params.parse(req.params);
      if (targets.body) req.body = valid.body; // body is settable; convenient
      (req as any).valid = valid;
      next();
    } catch (e: any) {
      next(
        new ApiError(422, "VALIDATION_ERROR", "Invalid request", e.errors ?? e.message),
      );
    }
  };
}
