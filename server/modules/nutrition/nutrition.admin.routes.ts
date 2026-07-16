import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { nutritionService } from "./nutrition.service";
import { FoodSchema, AdminFoodInputSchema } from "./nutrition.schema";

export const nutritionAdminRouter = Router();
nutritionAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/admin/foods", tags: ["Admin: Nutrition"], summary: "List foods", security: sec,
  responses: { 200: json(z.object({ data: z.array(FoodSchema) })) } });
nutritionAdminRouter.get("/", async (req, res) => res.json({ data: await nutritionService.adminListFoods(qstr(req.query.search)) }));

registry.registerPath({ method: "post", path: "/api/admin/foods", tags: ["Admin: Nutrition"], summary: "Create food (en/ar + macros)", security: sec,
  request: { body: { content: { "application/json": { schema: AdminFoodInputSchema } } } }, responses: { 201: json(FoodSchema) } });
nutritionAdminRouter.post("/", validate({ body: AdminFoodInputSchema }), async (req, res) => res.status(201).json(await nutritionService.adminCreateFood(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/foods/{id}", tags: ["Admin: Nutrition"], summary: "Update food", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminFoodInputSchema.partial() } } } }, responses: { 200: json(FoodSchema) } });
nutritionAdminRouter.patch("/:id", validate({ params: idParam, body: AdminFoodInputSchema.partial() }), async (req, res) => res.json(await nutritionService.adminUpdateFood(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/foods/{id}", tags: ["Admin: Nutrition"], summary: "Delete food", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
nutritionAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await nutritionService.adminDeleteFood(String(req.params.id));
  res.status(204).end();
});
