import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../identity/identity.db";

export const otpPurpose = pgEnum("otp_purpose", ["verify", "reset"]);

// Refresh tokens (hashed) for rotation + reuse detection.
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  hashIdx: index("rt_hash_idx").on(t.tokenHash),  // looked up on every refresh
  userIdx: index("rt_user_idx").on(t.userId),     // revoke-all-for-user
}));

// Email OTP codes (hashed) for verify + password reset.
export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: otpPurpose("purpose").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  emailPurposeIdx: index("otp_email_purpose_idx").on(t.email, t.purpose),
}));
