import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";

export const healthRouter = Router();

const HealthResponse = z
  .object({ status: z.string(), time: z.string() })
  .openapi("HealthResponse");

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "Liveness check",
  tags: ["Health"],
  responses: {
    200: {
      description: "Service is up",
      content: { "application/json": { schema: HealthResponse } },
    },
  },
});
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

registry.registerPath({
  method: "get",
  path: "/api/health/secure",
  summary: "Authenticated liveness check",
  tags: ["Health"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Authenticated and up" },
    401: { description: "Missing or invalid token" },
  },
});
healthRouter.get("/secure", requireAuth, (req, res) => {
  res.json({ status: "ok", user: req.user });
});
