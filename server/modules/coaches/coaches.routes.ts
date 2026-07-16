import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr, listSchema } from "../../core/http";
import { coachesService } from "./coaches.service";
import { CoachSchema, BookSessionSchema, CoachPlanSchema, CoachPlanInputSchema, TransformationSchema, TransformationInputSchema } from "./coaches.schema";

export const coachesRouter = Router();
coachesRouter.use(requireAuth);
const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({ method: "get", path: "/api/coaches", tags: ["Coaches"], summary: "Coach marketplace (paginated)", security: sec,
  responses: { 200: json(listSchema(CoachSchema)) } });
coachesRouter.get("/coaches", async (req, res) => {
  const page = Number(qstr(req.query.page)) || 1;
  const perPage = Math.min(Number(qstr(req.query.perPage)) || 20, 100);
  res.json(await coachesService.list({ search: qstr(req.query.search), countryId: qstr(req.query.countryId), page, perPage }));
});

registry.registerPath({ method: "get", path: "/api/coaches/me/bookings", tags: ["Coaches"], summary: "My session bookings", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
coachesRouter.get("/coaches/me/bookings", async (req, res) => res.json({ data: await coachesService.myBookings(req.user!.sub) }));

// coach's incoming leads (people interested in me)
registry.registerPath({ method: "get", path: "/api/coaches/me/leads", tags: ["Coaches"], summary: "My incoming interest leads", security: sec, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
coachesRouter.get("/coaches/me/leads", async (req, res) => res.json({ data: await coachesService.myLeads(req.user!.sub) }));

registry.registerPath({ method: "patch", path: "/api/coaches/me/leads/{id}", tags: ["Coaches"], summary: "Update a lead status (pending|contacted|closed)", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: z.object({ status: z.enum(["pending", "contacted", "closed"]) }) } } } }, responses: { 200: json(z.any()) } });
coachesRouter.patch("/coaches/me/leads/:id", validate({ params: idParam, body: z.object({ status: z.enum(["pending", "contacted", "closed"]) }) }), async (req, res) =>
  res.json(await coachesService.updateLeadStatus(req.user!.sub, String(req.params.id), req.body.status)));

// coach self-service: manage my PT plans
registry.registerPath({ method: "get", path: "/api/coaches/me/plans", tags: ["Coaches"], summary: "My PT plans (coach self)", security: sec, responses: { 200: json(z.object({ data: z.array(CoachPlanSchema) })) } });
coachesRouter.get("/coaches/me/plans", async (req, res) => res.json({ data: await coachesService.listPlans(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/coaches/me/plans", tags: ["Coaches"], summary: "Create PT plan", security: sec, request: { body: { content: { "application/json": { schema: CoachPlanInputSchema } } } }, responses: { 201: json(CoachPlanSchema) } });
coachesRouter.post("/coaches/me/plans", validate({ body: CoachPlanInputSchema }), async (req, res) => res.status(201).json(await coachesService.createPlan(req.user!.sub, req.body)));

registry.registerPath({ method: "patch", path: "/api/coaches/me/plans/{id}", tags: ["Coaches"], summary: "Update PT plan", security: sec, request: { params: idParam, body: { content: { "application/json": { schema: CoachPlanInputSchema.partial() } } } }, responses: { 200: json(CoachPlanSchema) } });
coachesRouter.patch("/coaches/me/plans/:id", validate({ params: idParam, body: CoachPlanInputSchema.partial() }), async (req, res) => res.json(await coachesService.updatePlan(req.user!.sub, String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/coaches/me/plans/{id}", tags: ["Coaches"], summary: "Delete PT plan", security: sec, request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
coachesRouter.delete("/coaches/me/plans/:id", validate({ params: idParam }), async (req, res) => { await coachesService.deletePlan(req.user!.sub, String(req.params.id)); res.status(204).end(); });

// coach self-service: before/after transformations
registry.registerPath({ method: "get", path: "/api/coaches/me/transformations", tags: ["Coaches"], summary: "My transformations", security: sec, responses: { 200: json(z.object({ data: z.array(TransformationSchema) })) } });
coachesRouter.get("/coaches/me/transformations", async (req, res) => res.json({ data: await coachesService.listTransformations(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/coaches/me/transformations", tags: ["Coaches"], summary: "Add transformation", security: sec, request: { body: { content: { "application/json": { schema: TransformationInputSchema } } } }, responses: { 201: json(TransformationSchema) } });
coachesRouter.post("/coaches/me/transformations", validate({ body: TransformationInputSchema }), async (req, res) => res.status(201).json(await coachesService.createTransformation(req.user!.sub, req.body)));

registry.registerPath({ method: "patch", path: "/api/coaches/me/transformations/{id}", tags: ["Coaches"], summary: "Update transformation", security: sec, request: { params: idParam, body: { content: { "application/json": { schema: TransformationInputSchema } } } }, responses: { 200: json(TransformationSchema) } });
coachesRouter.patch("/coaches/me/transformations/:id", validate({ params: idParam, body: TransformationInputSchema }), async (req, res) => res.json(await coachesService.updateTransformation(req.user!.sub, String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/coaches/me/transformations/{id}", tags: ["Coaches"], summary: "Delete transformation", security: sec, request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
coachesRouter.delete("/coaches/me/transformations/:id", validate({ params: idParam }), async (req, res) => { await coachesService.deleteTransformation(req.user!.sub, String(req.params.id)); res.status(204).end(); });

registry.registerPath({ method: "get", path: "/api/coaches/{id}", tags: ["Coaches"], summary: "Coach detail", security: sec,
  request: { params: idParam }, responses: { 200: json(CoachSchema) } });
coachesRouter.get("/coaches/:id", validate({ params: idParam }), async (req, res) => res.json(await coachesService.get(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/coaches/{id}/book", tags: ["Coaches"], summary: "Request a session (pending — no payment)", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: BookSessionSchema } } } }, responses: { 201: json(z.any()) } });
coachesRouter.post("/coaches/:id/book", validate({ params: idParam, body: BookSessionSchema }), async (req, res) =>
  res.status(201).json(await coachesService.bookSession(req.user!.sub, String(req.params.id), req.body)));
