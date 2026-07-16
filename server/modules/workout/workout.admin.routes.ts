import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr } from "../../core/http";
import { workoutService } from "./workout.service";
import { ExerciseSchema, AdminExerciseInputSchema, AdminWorkoutTypeInputSchema } from "./workout.schema";
import { ENUM_SYSTEM_BODY_TARGET } from "./seed-data/body-target.enum";

export const workoutAdminRouter = Router();
workoutAdminRouter.use(requireAuth, requireRole("admin"));

const sec = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().uuid() });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const ExerciseListResponse = z.object({ data: z.array(ExerciseSchema) });

// reference data for the admin form
registry.registerPath({ method: "get", path: "/api/admin/exercises/meta", tags: ["Admin: Workout"], summary: "Form reference (workout types + body targets)", security: sec,
  responses: { 200: json(z.object({ workoutTypes: z.array(z.object({ id: z.string(), name: z.string() })), bodyTargets: z.array(z.string()) })) } });
workoutAdminRouter.get("/meta", async (_req, res) => {
  res.json({ workoutTypes: await workoutService.adminListWorkoutTypes(), bodyTargets: Object.values(ENUM_SYSTEM_BODY_TARGET) });
});

registry.registerPath({ method: "get", path: "/api/admin/exercises", tags: ["Admin: Workout"], summary: "List exercises (with targets)", security: sec,
  responses: { 200: json(ExerciseListResponse, "List") } });
workoutAdminRouter.get("/", async (req, res) => res.json({ data: await workoutService.adminListExercises(qstr(req.query.search)) }));

registry.registerPath({ method: "get", path: "/api/admin/exercises/{id}", tags: ["Admin: Workout"], summary: "Get exercise", security: sec,
  request: { params: idParam }, responses: { 200: json(ExerciseSchema) } });
workoutAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await workoutService.adminGetExercise(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/exercises", tags: ["Admin: Workout"], summary: "Create exercise (with body targets + type links)", security: sec,
  request: { body: { content: { "application/json": { schema: AdminExerciseInputSchema } } } }, responses: { 201: json(ExerciseSchema, "Created") } });
workoutAdminRouter.post("/", validate({ body: AdminExerciseInputSchema }), async (req, res) => res.status(201).json(await workoutService.adminCreateExercise(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/exercises/{id}", tags: ["Admin: Workout"], summary: "Update exercise (details, body targets, type links)", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminExerciseInputSchema.partial() } } } }, responses: { 200: json(ExerciseSchema) } });
workoutAdminRouter.patch("/:id", validate({ params: idParam, body: AdminExerciseInputSchema.partial() }), async (req, res) => res.json(await workoutService.adminUpdateExercise(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/exercises/{id}", tags: ["Admin: Workout"], summary: "Delete exercise", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
workoutAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await workoutService.adminDeleteExercise(String(req.params.id));
  res.status(204).end();
});

// ── training/workout types admin CRUD (mounted at /api/admin/workout-types) ──
export const workoutTypeAdminRouter = Router();
workoutTypeAdminRouter.use(requireAuth, requireRole("admin"));

registry.registerPath({ method: "get", path: "/api/admin/workout-types", tags: ["Admin: Workout"], summary: "List training types", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
workoutTypeAdminRouter.get("/", async (_req, res) => res.json({ data: await workoutService.adminListWorkoutTypesFull() }));

registry.registerPath({ method: "get", path: "/api/admin/workout-types/{id}", tags: ["Admin: Workout"], summary: "Get a training type", security: sec,
  request: { params: idParam }, responses: { 200: json(z.any()) } });
workoutTypeAdminRouter.get("/:id", validate({ params: idParam }), async (req, res) => res.json(await workoutService.adminGetWorkoutType(String(req.params.id))));

registry.registerPath({ method: "post", path: "/api/admin/workout-types", tags: ["Admin: Workout"], summary: "Create a training type", security: sec,
  request: { body: { content: { "application/json": { schema: AdminWorkoutTypeInputSchema } } } }, responses: { 201: json(z.any(), "Created") } });
workoutTypeAdminRouter.post("/", validate({ body: AdminWorkoutTypeInputSchema }), async (req, res) => res.status(201).json(await workoutService.adminCreateWorkoutType(req.body)));

registry.registerPath({ method: "patch", path: "/api/admin/workout-types/{id}", tags: ["Admin: Workout"], summary: "Update a training type", security: sec,
  request: { params: idParam, body: { content: { "application/json": { schema: AdminWorkoutTypeInputSchema.partial() } } } }, responses: { 200: json(z.any()) } });
workoutTypeAdminRouter.patch("/:id", validate({ params: idParam, body: AdminWorkoutTypeInputSchema.partial() }), async (req, res) => res.json(await workoutService.adminUpdateWorkoutType(String(req.params.id), req.body)));

registry.registerPath({ method: "delete", path: "/api/admin/workout-types/{id}", tags: ["Admin: Workout"], summary: "Delete a training type", security: sec,
  request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
workoutTypeAdminRouter.delete("/:id", validate({ params: idParam }), async (req, res) => {
  await workoutService.adminDeleteWorkoutType(String(req.params.id));
  res.status(204).end();
});
