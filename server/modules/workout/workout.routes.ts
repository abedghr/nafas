import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { workoutService } from "./workout.service";
import {
  ExerciseSchema, WorkoutTypeSchema, TemplateCreateSchema, LogCreateSchema, ActiveSessionSchema,
} from "./workout.schema";

export const workoutRouter = Router();
workoutRouter.use(requireAuth);

const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const body = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });
const idParam = z.object({ id: z.string().uuid() });

// ── library ──
registry.registerPath({ method: "get", path: "/api/workout-types", tags: ["Workout"], summary: "Workout types", security: sec,
  responses: { 200: json(z.object({ data: z.array(WorkoutTypeSchema) })) } });
workoutRouter.get("/workout-types", async (req, res) => res.json({ data: await workoutService.listWorkoutTypes(req.locale) }));

registry.registerPath({ method: "get", path: "/api/exercises", tags: ["Workout"], summary: "Exercise library (search, filter by type)", security: sec,
  responses: { 200: json(z.object({ data: z.array(ExerciseSchema) })) } });
workoutRouter.get("/exercises", async (req, res) => {
  const data = await workoutService.listExercises({
    search: qstr(req.query.search),
    typeId: qstr(req.query.typeId),
    userId: req.user!.sub,
    locale: req.locale,
  });
  res.json({ data });
});

// ── templates ──
registry.registerPath({ method: "get", path: "/api/workout-templates", tags: ["Workout"], summary: "My templates", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout-templates", async (req, res) => res.json({ data: await workoutService.listTemplates(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/workout-templates", tags: ["Workout"], summary: "Create template", security: sec, request: { body: body(TemplateCreateSchema) }, responses: { 201: json(z.any()) } });
workoutRouter.post("/workout-templates", validate({ body: TemplateCreateSchema }), async (req, res) => res.status(201).json(await workoutService.createTemplate(req.user!.sub, req.body)));

registry.registerPath({ method: "patch", path: "/api/workout-templates/{id}", tags: ["Workout"], summary: "Update template", security: sec, request: { params: idParam, body: body(TemplateCreateSchema) }, responses: { 200: json(z.any()) } });
workoutRouter.patch("/workout-templates/:id", validate({ params: idParam, body: TemplateCreateSchema }), async (req, res) => res.json(await workoutService.updateTemplate(req.user!.sub, String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/workout-templates/{id}", tags: ["Workout"], summary: "Delete template", security: sec, request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
workoutRouter.delete("/workout-templates/:id", validate({ params: idParam }), async (req, res) => { await workoutService.deleteTemplate(req.user!.sub, String(req.params.id)); res.status(204).end(); });

// ── logs ──
registry.registerPath({ method: "get", path: "/api/workout-logs", tags: ["Workout"], summary: "My workout history (paginated)", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout-logs", async (req, res) => {
  const page = Math.max(1, parseInt(qstr(req.query.page) ?? "") || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(qstr(req.query.perPage) ?? "") || 30));
  const { rows, total } = await workoutService.listLogs(req.user!.sub, page, perPage);
  res.json({ data: rows, meta: { page, perPage, total } });
});

registry.registerPath({ method: "post", path: "/api/workout-logs", tags: ["Workout"], summary: "Save a completed workout", security: sec, request: { body: body(LogCreateSchema) }, responses: { 201: json(z.any()) } });
workoutRouter.post("/workout-logs", validate({ body: LogCreateSchema }), async (req, res) => res.status(201).json(await workoutService.createLog(req.user!.sub, req.body)));

registry.registerPath({ method: "get", path: "/api/workout-logs/{id}/progress", tags: ["Workout"], summary: "Progress vs previous same-name workout", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout-logs/:id/progress", validate({ params: idParam }), async (req, res) => res.json(await workoutService.progress(req.user!.sub, String(req.params.id))));

registry.registerPath({ method: "get", path: "/api/workout-logs/{id}", tags: ["Workout"], summary: "Get a workout log", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout-logs/:id", validate({ params: idParam }), async (req, res) => res.json(await workoutService.getLog(req.user!.sub, String(req.params.id))));

registry.registerPath({ method: "delete", path: "/api/workout-logs/{id}", tags: ["Workout"], summary: "Delete a workout log", security: sec, request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
workoutRouter.delete("/workout-logs/:id", validate({ params: idParam }), async (req, res) => { await workoutService.deleteLog(req.user!.sub, String(req.params.id)); res.status(204).end(); });

// ── active session ──
registry.registerPath({ method: "get", path: "/api/workout/prs", tags: ["Workout"], summary: "Personal records — top exercises by max done-set weight", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout/prs", async (req, res) => {
  const limit = Math.min(Number(qstr(req.query.limit)) || 5, 20);
  res.json({ data: await workoutService.prs(req.user!.sub, limit) });
});

registry.registerPath({ method: "get", path: "/api/workout/last", tags: ["Workout"], summary: "Last performance per exercise name (?names=a,b)", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout/last", async (req, res) => {
  const names = (qstr(req.query.names) || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  res.json({ data: await workoutService.lastPerformance(req.user!.sub, names) });
});

registry.registerPath({ method: "get", path: "/api/active-session", tags: ["Workout"], summary: "Resume in-progress session", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/active-session", async (req, res) => res.json({ data: await workoutService.getActiveSession(req.user!.sub) }));

registry.registerPath({ method: "put", path: "/api/active-session", tags: ["Workout"], summary: "Save in-progress session", security: sec, request: { body: body(ActiveSessionSchema) }, responses: { 200: json(z.any()) } });
workoutRouter.put("/active-session", validate({ body: ActiveSessionSchema }), async (req, res) => res.json(await workoutService.putActiveSession(req.user!.sub, req.body.data)));

registry.registerPath({ method: "delete", path: "/api/active-session", tags: ["Workout"], summary: "Discard session", security: sec, responses: { 204: { description: "Cleared" } } });
workoutRouter.delete("/active-session", async (req, res) => { await workoutService.clearActiveSession(req.user!.sub); res.status(204).end(); });

// ── AI (inside workout) ──
registry.registerPath({ method: "get", path: "/api/workout/insights", tags: ["Workout: AI"], summary: "Smart insights", security: sec, responses: { 200: json(z.object({ insights: z.array(z.string()) })) } });
workoutRouter.get("/workout/insights", async (req, res) => res.json(await workoutService.insights(req.user!.sub)));

registry.registerPath({ method: "get", path: "/api/workout/recommendations", tags: ["Workout: AI"], summary: "Recommendations", security: sec, responses: { 200: json(z.object({ recommendations: z.array(z.string()) })) } });
workoutRouter.get("/workout/recommendations", async (req, res) => res.json(await workoutService.recommendations(req.user!.sub, qstr(req.query.goal))));

registry.registerPath({ method: "get", path: "/api/workout/weekly-plan", tags: ["Workout: AI"], summary: "AI weekly plan", security: sec, responses: { 200: json(z.any()) } });
workoutRouter.get("/workout/weekly-plan", async (req, res) => res.json(await workoutService.weeklyPlan(req.user!.sub, qstr(req.query.goal))));
