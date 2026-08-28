import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { programsService } from "./programs.service";
import { ProgramCreateSchema, ShareCreateSchema, ClaimSchema, EnrollSchema, EnrollUpdateSchema, DayStatusSchema } from "./programs.schema";

export const programsRouter = Router();
programsRouter.use(requireAuth);

const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });
const body = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });
const idParam = z.object({ id: z.string().uuid() });

registry.registerPath({ method: "get", path: "/api/programs", tags: ["Programs"], summary: "My programs", security: sec, responses: { 200: json(z.any()) } });
programsRouter.get("/programs", async (req, res) => res.json({ data: await programsService.list(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/programs", tags: ["Programs"], summary: "Create program", security: sec, request: { body: body(ProgramCreateSchema) }, responses: { 201: json(z.any()) } });
programsRouter.post("/programs", validate({ body: ProgramCreateSchema }), async (req, res) => res.status(201).json(await programsService.create(req.user!.sub, req.body)));

registry.registerPath({ method: "get", path: "/api/programs/{id}", tags: ["Programs"], summary: "Get program", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
programsRouter.get("/programs/:id", validate({ params: idParam }), async (req, res) => {
  const p = await programsService.get(req.user!.sub, String(req.params.id));
  if (!p) return res.status(404).json({ code: "NOT_FOUND", message: "" });
  res.json(p);
});

registry.registerPath({ method: "patch", path: "/api/programs/{id}", tags: ["Programs"], summary: "Update program", security: sec, request: { params: idParam, body: body(ProgramCreateSchema) }, responses: { 200: json(z.any()) } });
programsRouter.patch("/programs/:id", validate({ params: idParam, body: ProgramCreateSchema }), async (req, res) => {
  const p = await programsService.update(req.user!.sub, String(req.params.id), req.body);
  if (!p) return res.status(404).json({ code: "NOT_FOUND", message: "" });
  res.json(p);
});

registry.registerPath({ method: "delete", path: "/api/programs/{id}", tags: ["Programs"], summary: "Delete program", security: sec, request: { params: idParam }, responses: { 204: { description: "Deleted" } } });
programsRouter.delete("/programs/:id", validate({ params: idParam }), async (req, res) => {
  await programsService.remove(req.user!.sub, String(req.params.id));
  res.status(204).end();
});

// ── sharing ────────────────────────────────────────────────────────────────
registry.registerPath({ method: "post", path: "/api/programs/{id}/share", tags: ["Programs"], summary: "Share a program", security: sec, request: { params: idParam, body: body(ShareCreateSchema) }, responses: { 201: json(z.any()) } });
programsRouter.post("/programs/:id/share", validate({ params: idParam, body: ShareCreateSchema }), async (req, res) => {
  const r = await programsService.share(req.user!.sub, String(req.params.id), req.body);
  if ("error" in r && r.error) return res.status(r.error === "cannot_reshare" ? 403 : 404).json({ code: r.error.toUpperCase(), message: "" });
  res.status(201).json(r.share);
});

registry.registerPath({ method: "get", path: "/api/program-invites", tags: ["Programs"], summary: "My incoming program invites", security: sec, responses: { 200: json(z.any()) } });
programsRouter.get("/program-invites", async (req, res) => res.json({ data: await programsService.invites(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/program-invites/{id}/accept", tags: ["Programs"], summary: "Accept an invite", security: sec, request: { params: idParam }, responses: { 201: json(z.any()) } });
programsRouter.post("/program-invites/:id/accept", validate({ params: idParam }), async (req, res) => {
  const r = await programsService.accept(req.user!.sub, String(req.params.id));
  if ("error" in r && r.error) return res.status(r.error === "expired" ? 410 : 404).json({ code: r.error.toUpperCase(), message: "" });
  res.status(201).json(r.program);
});

registry.registerPath({ method: "post", path: "/api/program-invites/{id}/decline", tags: ["Programs"], summary: "Decline an invite", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
programsRouter.post("/program-invites/:id/decline", validate({ params: idParam }), async (req, res) => {
  await programsService.decline(req.user!.sub, String(req.params.id));
  res.json({ ok: true });
});

registry.registerPath({ method: "post", path: "/api/program-shares/claim", tags: ["Programs"], summary: "Claim a program by code", security: sec, request: { body: body(ClaimSchema) }, responses: { 201: json(z.any()) } });
programsRouter.post("/program-shares/claim", validate({ body: ClaimSchema }), async (req, res) => {
  const r = await programsService.claimByCode(req.user!.sub, req.body.code);
  if ("error" in r && r.error) return res.status(r.error === "expired" ? 410 : r.error === "own_program" ? 400 : 404).json({ code: r.error.toUpperCase(), message: "" });
  res.status(201).json(r.program);
});

// ── enrollment / scheduling ──
const enrollIdParam = z.object({ id: z.string().uuid() });
const dayParams = z.object({ id: z.string().uuid(), week: z.string(), day: z.string() });

registry.registerPath({ method: "get", path: "/api/enrollments", tags: ["Programs"], summary: "My program enrollments", security: sec, responses: { 200: json(z.any()) } });
programsRouter.get("/enrollments", async (req, res) => res.json({ data: await programsService.enrollments(req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/enrollments", tags: ["Programs"], summary: "Start a program", security: sec, request: { body: body(EnrollSchema) }, responses: { 201: json(z.any()) } });
programsRouter.post("/enrollments", validate({ body: EnrollSchema }), async (req, res) => {
  const r = await programsService.enroll(req.user!.sub, req.body.programId, req.body.startDate);
  if (!r) return res.status(404).json({ code: "NOT_FOUND", message: "Program not found" });
  res.status(201).json(r);
});

registry.registerPath({ method: "patch", path: "/api/enrollments/{id}", tags: ["Programs"], summary: "Update an enrollment", security: sec, request: { params: enrollIdParam, body: body(EnrollUpdateSchema) }, responses: { 200: json(z.any()) } });
programsRouter.patch("/enrollments/:id", validate({ params: enrollIdParam, body: EnrollUpdateSchema }), async (req, res) => {
  const r = await programsService.updateEnrollment(req.user!.sub, String(req.params.id), req.body);
  if (!r) return res.status(404).json({ code: "NOT_FOUND", message: "" });
  res.json(r);
});

registry.registerPath({ method: "delete", path: "/api/enrollments/{id}", tags: ["Programs"], summary: "Delete an enrollment", security: sec, request: { params: enrollIdParam }, responses: { 200: json(z.any()) } });
programsRouter.delete("/enrollments/:id", validate({ params: enrollIdParam }), async (req, res) => {
  res.json(await programsService.removeEnrollment(req.user!.sub, String(req.params.id)));
});

registry.registerPath({ method: "post", path: "/api/enrollments/{id}/days", tags: ["Programs"], summary: "Mark a program day done/skipped", security: sec, request: { params: enrollIdParam, body: body(DayStatusSchema) }, responses: { 200: json(z.any()) } });
programsRouter.post("/enrollments/:id/days", validate({ params: enrollIdParam, body: DayStatusSchema }), async (req, res) => {
  const r = await programsService.setDay(req.user!.sub, String(req.params.id), req.body);
  if (!r) return res.status(404).json({ code: "NOT_FOUND", message: "" });
  res.json(r);
});

registry.registerPath({ method: "delete", path: "/api/enrollments/{id}/days/{week}/{day}", tags: ["Programs"], summary: "Clear a day's status", security: sec, request: { params: dayParams }, responses: { 200: json(z.any()) } });
programsRouter.delete("/enrollments/:id/days/:week/:day", validate({ params: dayParams }), async (req, res) => {
  const session = req.query.session != null ? Number(req.query.session) : undefined;
  const r = await programsService.clearDay(req.user!.sub, String(req.params.id), Number(req.params.week), Number(req.params.day), Number.isFinite(session as number) ? session : undefined);
  if (!r) return res.status(404).json({ code: "NOT_FOUND", message: "" });
  res.json(r);
});

// owner share dashboard + revoke
registry.registerPath({ method: "get", path: "/api/programs/{id}/shares", tags: ["Programs"], summary: "Who has this program (owner)", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
programsRouter.get("/programs/:id/shares", validate({ params: idParam }), async (req, res) => {
  const r = await programsService.shares(req.user!.sub, String(req.params.id));
  if ("error" in r && r.error) return res.status(404).json({ code: r.error.toUpperCase(), message: "" });
  res.json(r.data);
});

registry.registerPath({ method: "post", path: "/api/program-shares/{id}/revoke", tags: ["Programs"], summary: "Revoke a share (owner)", security: sec, request: { params: idParam }, responses: { 200: json(z.any()) } });
programsRouter.post("/program-shares/:id/revoke", validate({ params: idParam }), async (req, res) => {
  const r = await programsService.revoke(req.user!.sub, String(req.params.id));
  if ("error" in r && r.error) return res.status(404).json({ code: r.error.toUpperCase(), message: "" });
  res.json({ ok: true });
});
