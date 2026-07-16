import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { eventsService } from "./events.service";
import { EventSchema, AdminEventInputSchema } from "./events.schema";

export const eventsAdminRouter = Router();
eventsAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/admin/events", tags: ["Admin: Events"], summary: "List events", security: sec,
  responses: { 200: json(z.object({ data: z.array(EventSchema) })) } });
eventsAdminRouter.get("/", async (req, res) => res.json({ data: await eventsService.adminList(qstr(req.query.search)) }));

// registrations (before /:id)
registry.registerPath({ method: "get", path: "/api/admin/events/registrations", tags: ["Admin: Events"], summary: "List event registrations", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsAdminRouter.get("/registrations", async (_req, res) => res.json({ data: await eventsService.adminListRegistrations() }));

registry.registerPath({ method: "patch", path: "/api/admin/events/registrations/{id}", tags: ["Admin: Events"], summary: "Update registration status", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: z.object({ status: z.enum(["pending", "confirmed", "rejected", "cancelled"]) }) } } } }, responses: { 200: json(z.any()) } });
eventsAdminRouter.patch("/registrations/:id", validate({ params: idParam, body: z.object({ status: z.enum(["pending", "confirmed", "rejected", "cancelled"]) }) }), async (req, res) =>
  res.json(await eventsService.adminUpdateRegistration(String(req.params.id), req.body.status)));

registry.registerPath({ method: "get", path: "/api/admin/events/{id}", tags: ["Admin: Events"], summary: "Get event (+ translations)", security: sec,
  request: { params: idParam }, responses: { 200: json(EventSchema) } });
eventsAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await eventsService.adminGet(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/events", tags: ["Admin: Events"], summary: "Create event", security: sec,
  request: { body: { content: { "application/json": { schema: AdminEventInputSchema } } } }, responses: { 201: json(EventSchema) } });
eventsAdminRouter.post("/", validate({ body: AdminEventInputSchema }), async (req, res) => res.status(201).json(await eventsService.adminCreate(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/events/{id}", tags: ["Admin: Events"], summary: "Update event", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminEventInputSchema.partial() } } } }, responses: { 200: json(EventSchema) } });
eventsAdminRouter.patch("/:id", validate({ params: idParam, body: AdminEventInputSchema.partial() }), async (req, res) => res.json(await eventsService.adminUpdate(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/events/{id}", tags: ["Admin: Events"], summary: "Delete event", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
eventsAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => { await eventsService.adminDelete(String(req.params.id)); res.status(204).end(); });
