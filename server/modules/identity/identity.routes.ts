import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { identityService } from "./identity.service";
import { MeSchema, UserPublicSchema, UpdateMeSchema, CoachProfileInputSchema } from "./identity.schema";

export const identityRouter = Router();

registry.registerPath({
  method: "get", path: "/api/me", tags: ["Identity"], summary: "Current user",
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Me", content: { "application/json": { schema: MeSchema } } } },
});
identityRouter.get("/me", requireAuth, async (req, res) => {
  res.json(await identityService.getMe(req.user!.sub));
});

registry.registerPath({
  method: "patch", path: "/api/me", tags: ["Identity"], summary: "Update current user",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: UpdateMeSchema } } } },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: MeSchema } } } },
});
identityRouter.patch("/me", requireAuth, validate({ body: UpdateMeSchema }), async (req, res) => {
  res.json(await identityService.updateMe(req.user!.sub, req.body));
});

registry.registerPath({
  method: "delete", path: "/api/me", tags: ["Identity"], summary: "Delete current user account",
  security: [{ bearerAuth: [] }],
  responses: { 204: { description: "Account deleted" } },
});
identityRouter.delete("/me", requireAuth, async (req, res) => {
  await identityService.deleteMe(req.user!.sub);
  res.status(204).end();
});

registry.registerPath({
  method: "get", path: "/api/users/username-available", tags: ["Identity"],
  summary: "Check username availability",
  responses: { 200: { description: "Availability", content: { "application/json": { schema: z.object({ available: z.boolean() }) } } } },
});
identityRouter.get("/users/username-available", validate({ query: z.object({ username: z.string().min(3) }) }), async (req, res) => {
  res.json({ available: await identityService.usernameAvailable((req as any).valid.query.username) });
});

registry.registerPath({
  method: "get", path: "/api/users/search", tags: ["Identity"], summary: "Search users (name/username/email) — for managers adding people",
  security: [{ bearerAuth: [] }],
  request: { query: z.object({ q: z.string().min(2) }) },
  responses: { 200: { description: "Matches", content: { "application/json": { schema: z.object({ data: z.array(UserPublicSchema.partial()) }) } } } },
});
identityRouter.get("/users/search", requireAuth, validate({ query: z.object({ q: z.string().min(2) }) }), async (req, res) => {
  res.json({ data: await identityService.search((req as any).valid.query.q) });
});

registry.registerPath({
  method: "get", path: "/api/users/{idOrUsername}", tags: ["Identity"], summary: "Public user profile",
  request: { params: z.object({ idOrUsername: z.string() }) },
  responses: { 200: { description: "User", content: { "application/json": { schema: UserPublicSchema } } } },
});
identityRouter.get("/users/:idOrUsername", async (req, res) => {
  res.json(await identityService.getPublic(req.params.idOrUsername));
});

registry.registerPath({
  method: "post", path: "/api/coach-profile", tags: ["Identity"], summary: "Create/update own coach profile",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: CoachProfileInputSchema } } } },
  responses: { 200: { description: "Coach profile" } },
});
identityRouter.post("/coach-profile", requireAuth, requireRole("coach"), validate({ body: CoachProfileInputSchema }), async (req, res) => {
  res.json(await identityService.upsertCoachProfile(req.user!.sub, req.body));
});
