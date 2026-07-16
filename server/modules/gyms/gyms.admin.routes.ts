import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { gymsService } from "./gyms.service";
import { GymSchema, AdminGymInputSchema, RequestStatusSchema, FacilitySchema, AdminFacilityInputSchema, ClassSchema, AdminClassInputSchema } from "./gyms.schema";

export const gymsAdminRouter = Router();
gymsAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/admin/gyms", tags: ["Admin: Gyms"], summary: "List gyms", security: sec,
  responses: { 200: json(z.object({ data: z.array(GymSchema) })) } });
gymsAdminRouter.get("/", async (req, res) => res.json({ data: await gymsService.adminList(qstr(req.query.search)) }));

// membership requests (registered before /:id so "requests" isn't captured as an id)
registry.registerPath({ method: "get", path: "/api/admin/gyms/requests", tags: ["Admin: Gyms"], summary: "List membership requests", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsAdminRouter.get("/requests", async (_req, res) => res.json({ data: await gymsService.adminListRequests() }));

registry.registerPath({ method: "patch", path: "/api/admin/gyms/requests/{id}", tags: ["Admin: Gyms"], summary: "Update request status", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: RequestStatusSchema } } } }, responses: { 200: json(z.any()) } });
gymsAdminRouter.patch("/requests/:id", validate({ params: idParam, body: RequestStatusSchema }), async (req, res) =>
  res.json(await gymsService.adminUpdateRequestStatus(String(req.params.id), req.body.status)));

// reviews moderation (registered before /:id so "reviews" isn't captured as an id)
registry.registerPath({ method: "get", path: "/api/admin/gyms/{id}/reviews", tags: ["Admin: Gyms"], summary: "List a gym's reviews", security: sec,
  request: { params: idParam }, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsAdminRouter.get("/:id/reviews", validate({ params: idParam }), async (req, res) =>
  res.json({ data: await gymsService.listReviews(String(req.params.id)) }));

registry.registerPath({ method: "delete", path: "/api/admin/gyms/reviews/{id}", tags: ["Admin: Gyms"], summary: "Delete any review (moderation)", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
gymsAdminRouter.delete("/reviews/:id", validate({ params: idParam }), async (req, res) => {
  await gymsService.deleteReview(req.user!.sub, String(req.params.id), true);
  res.status(204).end();
});

// team (registered before /:id)
registry.registerPath({ method: "get", path: "/api/admin/gyms/{id}/team", tags: ["Admin: Gyms"], summary: "Gym team (owner + managers)", security: sec,
  request: { params: idParam }, responses: { 200: json(z.any()) } });
gymsAdminRouter.get("/:id/team", validate({ params: idParam }), async (req, res) => res.json(await gymsService.gymTeamMembers(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/gyms/{id}/team", tags: ["Admin: Gyms"], summary: "Add a manager by userId", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: z.object({ userId: z.string().uuid() }) } } } }, responses: { 201: json(z.any()) } });
gymsAdminRouter.post("/:id/team", validate({ params: idParam, body: z.object({ userId: z.string().uuid() }) }), async (req, res) =>
  res.status(201).json(await gymsService.adminAddTeamMember(String(req.params.id), req.body.userId)));

registry.registerPath({ method: "delete", path: "/api/admin/gyms/team/{id}", tags: ["Admin: Gyms"], summary: "Remove a team member", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Removed" } } });
gymsAdminRouter.delete("/team/:id", validate({ params: idParam }), async (req, res) => {
  await gymsService.adminRemoveTeamMember(String(req.params.id));
  res.status(204).end();
});

registry.registerPath({ method: "get", path: "/api/admin/gyms/{id}", tags: ["Admin: Gyms"], summary: "Get gym (hydrated + translations)", security: sec,
  request: { params: idParam }, responses: { 200: json(GymSchema) } });
gymsAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await gymsService.adminGet(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/gyms", tags: ["Admin: Gyms"], summary: "Create gym", security: sec,
  request: { body: { content: { "application/json": { schema: AdminGymInputSchema } } } }, responses: { 201: json(GymSchema) } });
gymsAdminRouter.post("/", validate({ body: AdminGymInputSchema }), async (req, res) => res.status(201).json(await gymsService.adminCreate(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/gyms/{id}", tags: ["Admin: Gyms"], summary: "Update gym", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminGymInputSchema.partial() } } } }, responses: { 200: json(GymSchema) } });
gymsAdminRouter.patch("/:id", validate({ params: idParam, body: AdminGymInputSchema.partial() }), async (req, res) => res.json(await gymsService.adminUpdate(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/gyms/{id}", tags: ["Admin: Gyms"], summary: "Delete gym", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
gymsAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await gymsService.adminDelete(String(req.params.id));
  res.status(204).end();
});

// ── facility catalog admin (mounted at /api/admin/facilities) ─────────────────
export const facilitiesAdminRouter = Router();
facilitiesAdminRouter.use(requireAuth, requireRole("admin"));

registry.registerPath({ method: "get", path: "/api/admin/facilities", tags: ["Admin: Gyms"], summary: "List facilities", security: sec,
  responses: { 200: json(z.object({ data: z.array(FacilitySchema) })) } });
facilitiesAdminRouter.get("/", async (_req, res) => res.json({ data: await gymsService.adminListFacilities() }));

registry.registerPath({ method: "post", path: "/api/admin/facilities", tags: ["Admin: Gyms"], summary: "Create facility", security: sec,
  request: { body: { content: { "application/json": { schema: AdminFacilityInputSchema } } } }, responses: { 201: json(FacilitySchema) } });
facilitiesAdminRouter.post("/", validate({ body: AdminFacilityInputSchema }), async (req, res) => res.status(201).json(await gymsService.adminCreateFacility(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/facilities/{id}", tags: ["Admin: Gyms"], summary: "Update facility", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminFacilityInputSchema.partial() } } } }, responses: { 200: json(FacilitySchema) } });
facilitiesAdminRouter.patch("/:id", validate({ params: idParam, body: AdminFacilityInputSchema.partial() }), async (req, res) => res.json(await gymsService.adminUpdateFacility(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/facilities/{id}", tags: ["Admin: Gyms"], summary: "Delete facility", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
facilitiesAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await gymsService.adminDeleteFacility(String(req.params.id));
  res.status(204).end();
});

// ── class admin (mounted at /api/admin/classes) ───────────────────────────────
export const classesAdminRouter = Router();
classesAdminRouter.use(requireAuth, requireRole("admin"));

registry.registerPath({ method: "get", path: "/api/admin/classes", tags: ["Admin: Gyms"], summary: "List a gym's classes (?gymId=)", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
classesAdminRouter.get("/", async (req, res) => res.json({ data: await gymsService.adminListClasses({ gymId: qstr(req.query.gymId), eventId: qstr(req.query.eventId) }) }));

registry.registerPath({ method: "post", path: "/api/admin/classes", tags: ["Admin: Gyms"], summary: "Create class", security: sec,
  request: { body: { content: { "application/json": { schema: AdminClassInputSchema } } } }, responses: { 201: json(ClassSchema) } });
classesAdminRouter.post("/", validate({ body: AdminClassInputSchema }), async (req, res) => res.status(201).json(await gymsService.adminCreateClass(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/classes/{id}", tags: ["Admin: Gyms"], summary: "Update class", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminClassInputSchema.partial() } } } }, responses: { 200: json(ClassSchema) } });
classesAdminRouter.patch("/:id", validate({ params: idParam, body: AdminClassInputSchema.partial() }), async (req, res) => res.json(await gymsService.adminUpdateClass(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/classes/{id}", tags: ["Admin: Gyms"], summary: "Delete class", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
classesAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await gymsService.adminDeleteClass(String(req.params.id));
  res.status(204).end();
});
