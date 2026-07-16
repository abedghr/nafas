import type { RequestHandler } from "express";
import { verifyAccess, type JwtPayload, type Role } from "../core/jwt";
import { ApiError } from "./error";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "UNAUTHORIZED", "Missing bearer token"));
  }
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "UNAUTHORIZED", "Not authenticated"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "Insufficient role"));
    }
    next();
  };
