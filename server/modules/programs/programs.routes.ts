import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { programsService } from "./programs.service";
import { ProgramCreateSchema } from "./programs.schema";

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
