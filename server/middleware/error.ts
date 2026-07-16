import type { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Central error handler — always emits { code, message, details? }
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ code: err.code, message: err.message, details: err.details });
  }

  console.error("Unhandled error:", err);
  const e = err as { status?: number; message?: string };
  return res.status(e.status ?? 500).json({
    code: "INTERNAL",
    message: e.message ?? "Internal Server Error",
  });
}
