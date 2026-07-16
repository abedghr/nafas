import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { coachesService } from "./coaches.service";
import { CoachSchema, AdminCoachInputSchema, BookingStatusSchema } from "./coaches.schema";

export const coachesAdminRouter = Router();
coachesAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/admin/coaches", tags: ["Admin: Coaches"], summary: "List coaches", security: sec,
  responses: { 200: json(z.object({ data: z.array(CoachSchema) })) } });
coachesAdminRouter.get("/", async (req, res) => res.json({ data: await coachesService.adminList(qstr(req.query.search)) }));

// bookings (before /:id)
registry.registerPath({ method: "get", path: "/api/admin/coaches/bookings", tags: ["Admin: Coaches"], summary: "List session bookings", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
coachesAdminRouter.get("/bookings", async (_req, res) => res.json({ data: await coachesService.adminListBookings() }));

registry.registerPath({ method: "patch", path: "/api/admin/coaches/bookings/{id}", tags: ["Admin: Coaches"], summary: "Update booking status", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: BookingStatusSchema } } } }, responses: { 200: json(z.any()) } });
coachesAdminRouter.patch("/bookings/:id", validate({ params: idParam, body: BookingStatusSchema }), async (req, res) =>
  res.json(await coachesService.adminUpdateBookingStatus(String(req.params.id), req.body.status)));

registry.registerPath({ method: "get", path: "/api/admin/coaches/{id}", tags: ["Admin: Coaches"], summary: "Get coach", security: sec,
  request: { params: idParam }, responses: { 200: json(CoachSchema) } });
coachesAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await coachesService.get(String(req.params.id))));

registry.registerPath({ method: "patch", path: "/api/admin/coaches/{id}", tags: ["Admin: Coaches"], summary: "Update coach marketplace profile", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminCoachInputSchema } } } }, responses: { 200: json(CoachSchema) } });
coachesAdminRouter.patch("/:id", validate({ params: idParam, body: AdminCoachInputSchema }), async (req, res) =>
  res.json(await coachesService.adminUpdate(String(req.params.id), req.body)));
