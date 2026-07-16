import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { validate } from "../../middleware/validate";
import { authService } from "./auth.service";
import {
  RegisterSchema, LoginSchema, OtpRequestSchema, OtpVerifySchema,
  RefreshSchema, LogoutSchema, ForgotPasswordSchema, ResetPasswordSchema, TokenPairSchema,
} from "./auth.schema";

export const authRouter = Router();

const MessageSchema = z.object({ message: z.string() });
const body = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({
  method: "post", path: "/api/auth/register", tags: ["Auth"], summary: "Register (athlete or coach)",
  request: { body: body(RegisterSchema) },
  responses: { 201: json(z.object({ email: z.string(), message: z.string() }), "Registered; OTP sent") },
});
authRouter.post("/register", validate({ body: RegisterSchema }), async (req, res) => {
  res.status(201).json(await authService.register(req.body));
});

registry.registerPath({
  method: "post", path: "/api/auth/otp/verify", tags: ["Auth"], summary: "Verify email OTP → tokens",
  request: { body: body(OtpVerifySchema) },
  responses: { 200: json(TokenPairSchema, "Verified") },
});
authRouter.post("/otp/verify", validate({ body: OtpVerifySchema }), async (req, res) => {
  res.json(await authService.verifyOtp(req.body.email, req.body.code));
});

registry.registerPath({
  method: "post", path: "/api/auth/otp/request", tags: ["Auth"], summary: "Request a new OTP (rate-limited)",
  request: { body: body(OtpRequestSchema) },
  responses: { 200: json(MessageSchema) },
});
authRouter.post("/otp/request", validate({ body: OtpRequestSchema }), async (req, res) => {
  await authService.requestOtp(req.body.email, req.body.purpose);
  res.json({ message: "If the account exists, a code was sent." });
});

registry.registerPath({
  method: "post", path: "/api/auth/login", tags: ["Auth"], summary: "Login",
  request: { body: body(LoginSchema) },
  responses: { 200: json(TokenPairSchema) },
});
authRouter.post("/login", validate({ body: LoginSchema }), async (req, res) => {
  res.json(await authService.login(req.body.email, req.body.password));
});

registry.registerPath({
  method: "post", path: "/api/auth/refresh", tags: ["Auth"], summary: "Rotate refresh token",
  request: { body: body(RefreshSchema) },
  responses: { 200: json(TokenPairSchema) },
});
authRouter.post("/refresh", validate({ body: RefreshSchema }), async (req, res) => {
  res.json(await authService.refresh(req.body.refreshToken));
});

registry.registerPath({
  method: "post", path: "/api/auth/logout", tags: ["Auth"], summary: "Revoke a refresh token",
  request: { body: body(LogoutSchema) },
  responses: { 204: { description: "Logged out" } },
});
authRouter.post("/logout", validate({ body: LogoutSchema }), async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).end();
});

registry.registerPath({
  method: "post", path: "/api/auth/password/forgot", tags: ["Auth"], summary: "Request password reset OTP",
  request: { body: body(ForgotPasswordSchema) },
  responses: { 200: json(MessageSchema) },
});
authRouter.post("/password/forgot", validate({ body: ForgotPasswordSchema }), async (req, res) => {
  await authService.requestOtp(req.body.email, "reset");
  res.json({ message: "If the account exists, a reset code was sent." });
});

registry.registerPath({
  method: "post", path: "/api/auth/password/reset", tags: ["Auth"], summary: "Reset password with OTP",
  request: { body: body(ResetPasswordSchema) },
  responses: { 200: json(MessageSchema) },
});
authRouter.post("/password/reset", validate({ body: ResetPasswordSchema }), async (req, res) => {
  await authService.resetPassword(req.body.email, req.body.code, req.body.newPassword);
  res.json({ message: "Password updated. Please log in." });
});
