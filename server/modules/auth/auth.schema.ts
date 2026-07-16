import { z } from "zod";
import { MeSchema } from "../identity/identity.schema";

export const RegisterSchema = z
  .object({
    name: z.string().min(1),
    username: z.string().min(3).max(32),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["athlete", "coach"]).default("athlete"),
    countryId: z.string().uuid().optional(),
  })
  .openapi("RegisterRequest");

export const LoginSchema = z
  .object({ email: z.string().email(), password: z.string().min(1) })
  .openapi("LoginRequest");

export const OtpRequestSchema = z
  .object({ email: z.string().email(), purpose: z.enum(["verify", "reset"]).default("verify") })
  .openapi("OtpRequest");

export const OtpVerifySchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6),
    purpose: z.enum(["verify", "reset"]).default("verify"),
  })
  .openapi("OtpVerify");

export const RefreshSchema = z.object({ refreshToken: z.string() }).openapi("RefreshRequest");
export const LogoutSchema = z.object({ refreshToken: z.string() }).openapi("LogoutRequest");
export const ForgotPasswordSchema = z.object({ email: z.string().email() }).openapi("ForgotPassword");
export const ResetPasswordSchema = z
  .object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(8) })
  .openapi("ResetPassword");

export const TokenPairSchema = z
  .object({ accessToken: z.string(), refreshToken: z.string(), user: MeSchema })
  .openapi("TokenPair");

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
