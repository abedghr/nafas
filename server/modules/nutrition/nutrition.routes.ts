import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { nutritionService } from "./nutrition.service";
import { FoodSchema, AddItemSchema, TargetsSchema, InBodyInputSchema } from "./nutrition.schema";

export const nutritionRouter = Router();
nutritionRouter.use(requireAuth);
const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const dateParam = z.object({ date: z.string() });

registry.registerPath({ method: "get", path: "/api/foods", tags: ["Nutrition"], summary: "Food search (localized)", security: sec,
  responses: { 200: json(z.object({ data: z.array(FoodSchema) })) } });
nutritionRouter.get("/foods", async (req, res) =>
  res.json({ data: await nutritionService.listFoods({ search: qstr(req.query.search), userId: req.user!.sub, locale: req.locale, mealType: qstr(req.query.mealType) }) }));

registry.registerPath({ method: "get", path: "/api/nutrition/days/{date}", tags: ["Nutrition"], summary: "Day (meals + targets)", security: sec,
  request: { params: dateParam }, responses: { 200: json(z.any()) } });
nutritionRouter.get("/nutrition/days/:date", validate({ params: dateParam }), async (req, res) =>
  res.json(await nutritionService.getDay(req.user!.sub, String(req.params.date))));

registry.registerPath({ method: "post", path: "/api/nutrition/days/{date}/items", tags: ["Nutrition"], summary: "Add meal item", security: sec,
  request: { params: dateParam, body: { content: { "application/json": { schema: AddItemSchema } } } }, responses: { 200: json(z.any()) } });
nutritionRouter.post("/nutrition/days/:date/items", validate({ params: dateParam, body: AddItemSchema }), async (req, res) =>
  res.json(await nutritionService.addItem(req.user!.sub, String(req.params.date), req.body)));

registry.registerPath({ method: "delete", path: "/api/nutrition/days/{date}/items", tags: ["Nutrition"], summary: "Remove meal item (?mealType=&itemId=)", security: sec,
  request: { params: dateParam }, responses: { 200: json(z.any()) } });
nutritionRouter.delete("/nutrition/days/:date/items", validate({ params: dateParam }), async (req, res) =>
  res.json(await nutritionService.removeItem(req.user!.sub, String(req.params.date), qstr(req.query.mealType) ?? "", qstr(req.query.itemId) ?? "")));

registry.registerPath({ method: "get", path: "/api/nutrition/targets", tags: ["Nutrition"], summary: "Macro targets (from profile if unset)", security: sec,
  responses: { 200: json(TargetsSchema) } });
nutritionRouter.get("/nutrition/targets", async (req, res) => res.json(await nutritionService.getTargets(req.user!.sub)));

registry.registerPath({ method: "post", path: "/api/nutrition/targets", tags: ["Nutrition"], summary: "Set macro targets", security: sec,
  request: { body: { content: { "application/json": { schema: TargetsSchema } } } }, responses: { 200: json(TargetsSchema) } });
nutritionRouter.post("/nutrition/targets", validate({ body: TargetsSchema }), async (req, res) => res.json(await nutritionService.setTargets(req.user!.sub, req.body)));

registry.registerPath({ method: "get", path: "/api/nutrition/targets/recommend", tags: ["Nutrition"], summary: "Recommended macros for a goal (?goal=cut|maintain|bulk&weight=)", security: sec,
  responses: { 200: json(TargetsSchema) } });
nutritionRouter.get("/nutrition/targets/recommend", async (req, res) => {
  const weight = qstr(req.query.weight);
  res.json(await nutritionService.recommendTargets(req.user!.sub, qstr(req.query.goal) ?? "maintain", weight ? Number(weight) : undefined));
});

registry.registerPath({ method: "get", path: "/api/inbody", tags: ["Nutrition"], summary: "InBody tests", security: sec, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
nutritionRouter.get("/inbody", async (req, res) => res.json({ data: await nutritionService.listInBody(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/inbody", tags: ["Nutrition"], summary: "Add InBody test", security: sec,
  request: { body: { content: { "application/json": { schema: InBodyInputSchema } } } }, responses: { 201: json(z.any()) } });
nutritionRouter.post("/inbody", validate({ body: InBodyInputSchema }), async (req, res) => res.status(201).json(await nutritionService.addInBody(req.user!.sub, req.body)));

registry.registerPath({ method: "delete", path: "/api/inbody/{id}", tags: ["Nutrition"], summary: "Delete InBody test", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 204: { description: "Deleted" } } });
nutritionRouter.delete("/inbody/:id", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) => {
  await nutritionService.deleteInBody(req.user!.sub, String(req.params.id));
  res.status(204).end();
});
