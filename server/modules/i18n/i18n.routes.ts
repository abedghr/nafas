import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { i18nService } from "./i18n.service";

export const i18nRouter = Router();

registry.registerPath({
  method: "get", path: "/api/languages", tags: ["i18n"], summary: "Active languages",
  responses: { 200: { description: "Languages", content: { "application/json": { schema: z.object({ data: z.array(z.any()) }) } } } },
});
i18nRouter.get("/languages", async (_req, res) => res.json({ data: await i18nService.activeLanguages() }));

registry.registerPath({
  method: "get", path: "/api/labels", tags: ["i18n"], summary: "Label bundle for the request locale (x-lang header)",
  responses: { 200: { description: "Bundle { grp: { key: value } }", content: { "application/json": { schema: z.any() } } } },
});
i18nRouter.get("/labels", async (req, res) => {
  const lang = (req.query.lang as string) || req.locale;
  res.json(await i18nService.bundle(lang));
});
