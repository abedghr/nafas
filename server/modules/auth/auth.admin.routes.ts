import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { validate } from "../../middleware/validate";
import { authService } from "./auth.service";
import { LoginSchema, TokenPairSchema } from "./auth.schema";

export const authAdminRouter = Router();

registry.registerPath({
  method: "post", path: "/api/admin/auth/login", tags: ["Admin: Auth"],
  summary: "Admin login (role must be admin)",
  request: { body: { content: { "application/json": { schema: LoginSchema } } } },
  responses: { 200: { description: "Tokens", content: { "application/json": { schema: TokenPairSchema } } } },
});
authAdminRouter.post("/login", validate({ body: LoginSchema }), async (req, res) => {
  res.json(await authService.login(req.body.email, req.body.password, { requireAdmin: true }));
});
