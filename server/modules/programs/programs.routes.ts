import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { programsService } from "./programs.service";
import { ProgramCreateSchema, ShareCreateSchema, ClaimSchema } from "./programs.schema";

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
