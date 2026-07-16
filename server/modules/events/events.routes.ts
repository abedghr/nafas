import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr, listSchema } from "../../core/http";
import { eventsService } from "./events.service";
import { gymsService } from "../gyms/gyms.service";
import { EventSchema, RegisterInputSchema, RegStatusSchema, AdminEventInputSchema, AddRegistrantSchema } from "./events.schema";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);
const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({ method: "get", path: "/api/events", tags: ["Events"], summary: "Events/tournaments (country-scoped, localized, paginated)", security: sec,
  responses: { 200: json(listSchema(EventSchema)) } });
eventsRouter.get("/events", async (req, res) => {
  const page = Number(qstr(req.query.page)) || 1;
  const perPage = Math.min(Number(qstr(req.query.perPage)) || 20, 100);
  res.json(await eventsService.list({
    search: qstr(req.query.search), countryId: qstr(req.query.countryId), type: qstr(req.query.type),
    upcoming: qstr(req.query.upcoming) === "true", locale: req.locale, page, perPage,
  }));
});

// me-routes before /events/:id
registry.registerPath({ method: "get", path: "/api/events/me/registrations", tags: ["Events"], summary: "My event registrations", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/events/me/registrations", async (req, res) => res.json({ data: await eventsService.myEvents(req.user!.sub, req.locale) }));

registry.registerPath({ method: "get", path: "/api/events/me/owned", tags: ["Events"], summary: "Events I organize (owned + host-gym managed)", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/events/me/owned", async (req, res) => res.json({ data: await eventsService.ownedEvents(req.user!.sub, req.locale) }));

// manager self-service CRUD (owner or host-gym manager)
registry.registerPath({ method: "get", path: "/api/events/me/managed", tags: ["Events"], summary: "Events I can manage", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/events/me/managed", async (req, res) => res.json({ data: await eventsService.managedEvents(req.user!.sub, req.locale) }));

registry.registerPath({ method: "post", path: "/api/events/me/managed", tags: ["Events"], summary: "Create an event (optionally for a gym I manage)", security: sec,
  request: { body: { content: { "application/json": { schema: AdminEventInputSchema } } } }, responses: { 201: json(z.any()) } });
eventsRouter.post("/events/me/managed", validate({ body: AdminEventInputSchema }), async (req, res) =>
  res.status(201).json(await eventsService.createManagedEvent(req.user!.sub, req.body)));

registry.registerPath({ method: "patch", path: "/api/events/me/managed/{id}", tags: ["Events"], summary: "Edit an event I manage", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminEventInputSchema.partial() } } } }, responses: { 200: json(z.any()) } });
eventsRouter.patch("/events/me/managed/:id", validate({ params: idParam, body: AdminEventInputSchema.partial() }), async (req, res) =>
  res.json(await eventsService.updateManagedEvent(req.user!.sub, String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/events/me/managed/{id}", tags: ["Events"], summary: "Delete an event I manage", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
eventsRouter.delete("/events/me/managed/:id", validate({ params: idParam }), async (req, res) => {
  await eventsService.deleteManagedEvent(req.user!.sub, String(req.params.id)); res.status(204).end();
});

// event sessions (classes) — same join flow as gym classes
registry.registerPath({ method: "get", path: "/api/events/{id}/classes", tags: ["Events"], summary: "Sessions/classes of an event (join flow)", security: sec,
  request: { params: idParam }, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/events/:id/classes", validate({ params: idParam }), async (req, res) =>
  res.json({ data: await gymsService.listEventClasses(String(req.params.id), req.user!.sub, req.locale) }));

// host-gym events (surfaces on the gym profile)
registry.registerPath({ method: "get", path: "/api/gyms/{id}/events", tags: ["Events"], summary: "Events hosted by a gym", security: sec,
  request: { params: idParam }, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/gyms/:id/events", validate({ params: idParam }), async (req, res) =>
  res.json({ data: await eventsService.eventsByGym(String(req.params.id), req.locale) }));

registry.registerPath({ method: "get", path: "/api/events/me/registrants", tags: ["Events"], summary: "Organizer: registrations for my events", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
eventsRouter.get("/events/me/registrants", async (req, res) => res.json({ data: await eventsService.ownerRegistrations(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/events/me/registrants", tags: ["Events"], summary: "Organizer: walk-in register a user (by userId)", security: sec,
  request: { body: { content: { "application/json": { schema: AddRegistrantSchema } } } }, responses: { 201: json(z.any()) } });
eventsRouter.post("/events/me/registrants", validate({ body: AddRegistrantSchema }), async (req, res) =>
  res.status(201).json(await eventsService.addRegistrant(req.user!.sub, req.body.eventId, req.body.userId, req.body.note, req.body.tierLabel)));

registry.registerPath({ method: "patch", path: "/api/events/me/registrants/{id}", tags: ["Events"], summary: "Organizer: approve/reject + record payment", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: RegStatusSchema } } } }, responses: { 200: json(z.any()) } });
eventsRouter.patch("/events/me/registrants/:id", validate({ params: idParam, body: RegStatusSchema }), async (req, res) =>
  res.json(await eventsService.ownerUpdateRegistration(req.user!.sub, String(req.params.id), req.body)));

registry.registerPath({ method: "get", path: "/api/events/{id}", tags: ["Events"], summary: "Event detail (localized, with my status)", security: sec,
  request: { params: idParam }, responses: { 200: json(EventSchema) } });
eventsRouter.get("/events/:id", validate({ params: idParam }), async (req, res) =>
  res.json(await eventsService.get(String(req.params.id), req.user!.sub, req.locale)));

registry.registerPath({ method: "post", path: "/api/events/{id}/register", tags: ["Events"], summary: "Register interest (pending → organizer confirms, no payment)", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: RegisterInputSchema } } } }, responses: { 201: json(z.any()) } });
eventsRouter.post("/events/:id/register", validate({ params: idParam, body: RegisterInputSchema }), async (req, res) =>
  res.status(201).json(await eventsService.register(req.user!.sub, String(req.params.id), req.body.note)));

registry.registerPath({ method: "delete", path: "/api/events/{id}/register", tags: ["Events"], summary: "Cancel my registration", security: sec,
  request: { params: idParam }, responses: { 200: json(z.any()) } });
eventsRouter.delete("/events/:id/register", validate({ params: idParam }), async (req, res) =>
  res.json(await eventsService.cancelRegistration(req.user!.sub, String(req.params.id))));
