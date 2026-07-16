import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { restaurantsService } from "./restaurants.service";
import { RestaurantSchema, AdminRestaurantInputSchema, ReservationStatusSchema } from "./restaurants.schema";

export const restaurantsAdminRouter = Router();
restaurantsAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/admin/restaurants", tags: ["Admin: Restaurants"], summary: "List restaurants", security: sec,
  responses: { 200: json(z.object({ data: z.array(RestaurantSchema) })) } });
restaurantsAdminRouter.get("/", async (req, res) => res.json({ data: await restaurantsService.adminList(qstr(req.query.search)) }));

// reservations (before /:id so "reservations" isn't captured as an id)
registry.registerPath({ method: "get", path: "/api/admin/restaurants/reservations", tags: ["Admin: Restaurants"], summary: "List reservations", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
restaurantsAdminRouter.get("/reservations", async (_req, res) => res.json({ data: await restaurantsService.adminListReservations() }));

registry.registerPath({ method: "patch", path: "/api/admin/restaurants/reservations/{id}", tags: ["Admin: Restaurants"], summary: "Update reservation status", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: ReservationStatusSchema } } } }, responses: { 200: json(z.any()) } });
restaurantsAdminRouter.patch("/reservations/:id", validate({ params: idParam, body: ReservationStatusSchema }), async (req, res) =>
  res.json(await restaurantsService.adminUpdateReservationStatus(String(req.params.id), req.body.status)));

registry.registerPath({ method: "get", path: "/api/admin/restaurants/{id}", tags: ["Admin: Restaurants"], summary: "Get restaurant (+ translations)", security: sec,
  request: { params: idParam }, responses: { 200: json(RestaurantSchema) } });
restaurantsAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await restaurantsService.adminGet(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/restaurants", tags: ["Admin: Restaurants"], summary: "Create restaurant", security: sec,
  request: { body: { content: { "application/json": { schema: AdminRestaurantInputSchema } } } }, responses: { 201: json(RestaurantSchema) } });
restaurantsAdminRouter.post("/", validate({ body: AdminRestaurantInputSchema }), async (req, res) => res.status(201).json(await restaurantsService.adminCreate(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/restaurants/{id}", tags: ["Admin: Restaurants"], summary: "Update restaurant", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminRestaurantInputSchema.partial() } } } }, responses: { 200: json(RestaurantSchema) } });
restaurantsAdminRouter.patch("/:id", validate({ params: idParam, body: AdminRestaurantInputSchema.partial() }), async (req, res) => res.json(await restaurantsService.adminUpdate(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/restaurants/{id}", tags: ["Admin: Restaurants"], summary: "Delete restaurant", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
restaurantsAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await restaurantsService.adminDelete(String(req.params.id));
  res.status(204).end();
});
