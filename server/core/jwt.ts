import jwt from "jsonwebtoken";
import { env } from "./env";

export type Role = "athlete" | "coach" | "admin";
export interface JwtPayload {
  sub: string;
  role: Role;
}

export function signAccess(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export function signRefresh(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as jwt.SignOptions);
}

export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
