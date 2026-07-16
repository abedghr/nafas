import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { i18nService } from "./i18n.service";

export const i18nAdminRouter = Router();
i18nAdminRouter.use(requireAuth, requireRole("admin"));
const sec = [{ bearerAuth: [] }];

registry.registerPath({
  method: "get", path: "/api/admin/labels", tags: ["Admin: i18n"], summary: "All label translations (optionally by group)",
  security: sec, responses: { 200: { description: "{ grp: { key: { locale: value } } }", content: { "application/json": { schema: z.any() } } } },
});
i18nAdminRouter.get("/", async (req, res) => res.json(await i18nService.listLabels(req.query.grp as string | undefined)));

const UpsertSchema = z.object({ grp: z.string(), key: z.string(), locale: z.string(), value: z.string() });
registry.registerPath({
  method: "put", path: "/api/admin/labels", tags: ["Admin: i18n"], summary: "Upsert a label translation",
  security: sec, request: { body: { content: { "application/json": { schema: UpsertSchema } } } },
  responses: { 200: { description: "Saved" } },
});
i18nAdminRouter.put("/", validate({ body: UpsertSchema }), async (req, res) => {
  const { grp, key, locale, value } = req.body;
  await i18nService.upsertLabel(grp, key, locale, value);
  res.json({ ok: true });
});
