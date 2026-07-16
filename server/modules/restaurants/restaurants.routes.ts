import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr, listSchema } from "../../core/http";
import { restaurantsService } from "./restaurants.service";
import { RestaurantSchema, ReserveRequestSchema } from "./restaurants.schema";

export const restaurantsRouter = Router();
restaurantsRouter.use(requireAuth);
const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({ method: "get", path: "/api/restaurants", tags: ["Restaurants"], summary: "Restaurant directory (country-scoped, localized, paginated)", security: sec,
  responses: { 200: json(listSchema(RestaurantSchema)) } });
restaurantsRouter.get("/restaurants", async (req, res) => {
  const page = Number(qstr(req.query.page)) || 1;
  const perPage = Math.min(Number(qstr(req.query.perPage)) || 20, 100);
  res.json(await restaurantsService.list({ search: qstr(req.query.search), countryId: qstr(req.query.countryId), locale: req.locale, page, perPage }));
});

registry.registerPath({ method: "get", path: "/api/restaurants/me/reservations", tags: ["Restaurants"], summary: "My reservations", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
restaurantsRouter.get("/restaurants/me/reservations", async (req, res) => res.json({ data: await restaurantsService.myReservations(req.user!.sub) }));

registry.registerPath({ method: "get", path: "/api/restaurants/{id}", tags: ["Restaurants"], summary: "Restaurant detail (localized)", security: sec,
  request: { params: idParam }, responses: { 200: json(RestaurantSchema) } });
restaurantsRouter.get("/restaurants/:id", validate({ params: idParam }), async (req, res) =>
  res.json(await restaurantsService.get(String(req.params.id), req.locale)));

registry.registerPath({ method: "post", path: "/api/restaurants/{id}/reserve", tags: ["Restaurants"], summary: "Request a reservation (pending — no payment)", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: ReserveRequestSchema } } } }, responses: { 201: json(z.any()) } });
restaurantsRouter.post("/restaurants/:id/reserve", validate({ params: idParam, body: ReserveRequestSchema }), async (req, res) =>
  res.status(201).json(await restaurantsService.requestReservation(req.user!.sub, String(req.params.id), req.body)));
