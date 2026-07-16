import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { PaginationQuery, listSchema } from "../../core/http";
import { countriesService } from "./countries.service";
import { CountrySchema, CountryCreateSchema, CountryUpdateSchema } from "./countries.schema";

export const countriesAdminRouter = Router();
countriesAdminRouter.use(requireAuth, requireRole("admin"));

const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({
  method: "get", path: "/api/admin/countries", tags: ["Admin: Countries"],
  summary: "List all countries (paginated)", security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List", content: { "application/json": { schema: listSchema(CountrySchema) } } } },
});
countriesAdminRouter.get("/", validate({ query: PaginationQuery }), async (req, res) => {
  const q = (req as any).valid.query;
  const { rows, total } = await countriesService.adminList(q);
  res.json({ data: rows, meta: { page: q.page, perPage: q.perPage, total } });
});

registry.registerPath({
  method: "post", path: "/api/admin/countries", tags: ["Admin: Countries"],
  summary: "Create country", security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: CountryCreateSchema } } } },
  responses: { 201: { description: "Created", content: { "application/json": { schema: CountrySchema } } } },
});
countriesAdminRouter.post("/", validate({ body: CountryCreateSchema }), async (req, res) => {
  res.status(201).json(await countriesService.create(req.body));
});

registry.registerPath({
  method: "patch", path: "/api/admin/countries/{id}", tags: ["Admin: Countries"],
  summary: "Update country", security: [{ bearerAuth: [] }],
  request: { params: idParam, body: { content: { "application/json": { schema: CountryUpdateSchema } } } },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: CountrySchema } } } },
});
countriesAdminRouter.patch("/:id", validate({ params: idParam, body: CountryUpdateSchema }), async (req, res) => {
  res.json(await countriesService.update(String(req.params.id), req.body));
});

registry.registerPath({
  method: "delete", path: "/api/admin/countries/{id}", tags: ["Admin: Countries"],
  summary: "Delete country", security: [{ bearerAuth: [] }],
  request: { params: idParam },
  responses: { 204: { description: "Deleted" } },
});
countriesAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await countriesService.remove(String(req.params.id));
  res.status(204).end();
});
