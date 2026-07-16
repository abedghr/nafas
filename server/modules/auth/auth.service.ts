import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "../../core/db";
import { users, coachProfiles, type User } from "../identity/identity.db";
import { refreshTokens, otpCodes } from "./auth.db";
import { signAccess, signRefresh, verifyRefresh } from "../../core/jwt";
import { mailer } from "../../core/mailer";
import { ApiError } from "../../middleware/error";
import { identityService, toMe } from "../identity/identity.service";
import type { RegisterInput } from "./auth.schema";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const genOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

async function issueTokens(user: User) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { accessToken, refreshToken, user: toMe(user) };
}

async function createOtp(email: string, purpose: "verify" | "reset") {
  const [last] = await db
    .select().from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)))
    .orderBy(desc(otpCodes.createdAt)).limit(1);
  if (last && Date.now() - last.createdAt.getTime() < RESEND_WINDOW_MS) {
    throw new ApiError(429, "RATE_LIMITED", "Please wait before requesting another code");
  }
  const code = genOtp();
  await db.insert(otpCodes).values({
    email, codeHash: sha256(code), purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await mailer.sendOtp(email, code, purpose);
}

async function consumeOtp(email: string, code: string, purpose: "verify" | "reset") {
  // Demo/no-email mode: when AUTH_DEV_OTP is set, that fixed code always verifies
  // (so signups work without SMTP). Off unless the env var is present.
  const devOtp = process.env.AUTH_DEV_OTP;
  if (devOtp && code === devOtp) {
    // consume any pending code for tidiness, but don't require one to exist
    await db.update(otpCodes).set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)));
    return;
  }
  const [otp] = await db
    .select().from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt)).limit(1);
  if (!otp) throw new ApiError(400, "OTP_INVALID", "No pending code");
  if (otp.expiresAt.getTime() < Date.now()) throw new ApiError(400, "OTP_EXPIRED", "Code expired");
  if (otp.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(429, "OTP_LOCKED", "Too many attempts");
  if (otp.codeHash !== sha256(code)) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    throw new ApiError(400, "OTP_INVALID", "Incorrect code");
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
}

export const authService = {
  async register(input: RegisterInput) {
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    if (await identityService.findByEmail(email)) throw new ApiError(409, "EMAIL_TAKEN", "Email already registered");
    if (!(await identityService.usernameAvailable(username))) throw new ApiError(409, "USERNAME_TAKEN", "Username taken");
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db.insert(users).values({
      name: input.name, username, email, passwordHash, role: input.role, countryId: input.countryId,
    }).returning();
    if (input.role === "coach") {
      await db.insert(coachProfiles).values({ userId: user.id, specialty: [], certifications: [] });
    }
    await createOtp(email, "verify");
    return { email, message: "Registered. Check your email for the verification code." };
  },

  async verifyOtp(email: string, code: string) {
    email = email.toLowerCase();
    await consumeOtp(email, code, "verify");
    const [user] = await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, email)).returning();
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    return issueTokens(user);
  },

  async requestOtp(email: string, purpose: "verify" | "reset") {
    email = email.toLowerCase();
    const user = await identityService.findByEmail(email);
    if (!user) {
      if (purpose === "reset") return; // don't leak which emails exist
      throw new ApiError(404, "NOT_FOUND", "No account for this email");
    }
    await createOtp(email, purpose);
  },

  async login(email: string, password: string, opts?: { requireAdmin?: boolean }) {
    email = email.toLowerCase();
    const user = await identityService.findByEmail(email);
    if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    if (user.status === "suspended") throw new ApiError(403, "SUSPENDED", "Account suspended");
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    if (!user.emailVerifiedAt) throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Verify your email first");
    if (opts?.requireAdmin && user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Not an admin");
    return issueTokens(user);
  },

  async refresh(token: string) {
    try {
      verifyRefresh(token);
    } catch {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid refresh token");
    }
    const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, sha256(token)));
    if (!stored) throw new ApiError(401, "UNAUTHORIZED", "Refresh token not recognized");
    if (stored.revokedAt) {
      // reuse detection — revoke the whole family
      await db.update(refreshTokens).set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, stored.userId), isNull(refreshTokens.revokedAt)));
      throw new ApiError(401, "TOKEN_REUSE", "Refresh token reuse detected; please log in again");
    }
    if (stored.expiresAt.getTime() < Date.now()) throw new ApiError(401, "UNAUTHORIZED", "Refresh token expired");
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    const user = await identityService.findById(stored.userId);
    if (!user) throw new ApiError(401, "UNAUTHORIZED", "User no longer exists");
    return issueTokens(user);
  },

  async logout(token: string) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, sha256(token)));
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    email = email.toLowerCase();
    await consumeOtp(email, code, "reset");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const [user] = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email)).returning();
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    await db.update(refreshTokens).set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));
  },
};
