import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { PaginationQuery, listSchema } from "../../core/http";
import { identityService } from "./identity.service";
import { MeSchema, AdminUserUpdateSchema } from "./identity.schema";

export const identityAdminRouter = Router();
identityAdminRouter.use(requireAuth, requireRole("admin"));

const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({
  method: "get", path: "/api/admin/users", tags: ["Admin: Users"],
  summary: "List users (paginated, searchable)", security: [{ bearerAuth: [] }],
  responses: { 200: { description: "List", content: { "application/json": { schema: listSchema(MeSchema) } } } },
});
identityAdminRouter.get("/", validate({ query: PaginationQuery }), async (req, res) => {
  const q = (req as any).valid.query;
  const { rows, total } = await identityService.adminList(q);
  res.json({ data: rows, meta: { page: q.page, perPage: q.perPage, total } });
});

registry.registerPath({
  method: "get", path: "/api/admin/users/{id}", tags: ["Admin: Users"],
  summary: "Get user", security: [{ bearerAuth: [] }], request: { params: idParam },
  responses: { 200: { description: "User", content: { "application/json": { schema: MeSchema } } } },
});
identityAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => {
  res.json(await identityService.adminGet(String(req.params.id)));
});

registry.registerPath({
  method: "patch", path: "/api/admin/users/{id}", tags: ["Admin: Users"],
  summary: "Update user (suspend / role)", security: [{ bearerAuth: [] }],
  request: { params: idParam, body: { content: { "application/json": { schema: AdminUserUpdateSchema } } } },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: MeSchema } } } },
});
identityAdminRouter.patch("/:id", validate({ params: idParam, body: AdminUserUpdateSchema }), async (req, res) => {
  res.json(await identityService.adminUpdate(String(req.params.id), req.body));
});
