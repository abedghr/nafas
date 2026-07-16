import type { RequestHandler } from "express";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED = ["en", "ar"]; // mirrors active languages; extend as languages are added

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      locale: string;
    }
  }
}

// Resolves request locale from `x-lang` header (preferred) or Accept-Language,
// falling back to the default. Unsupported → default.
export const localeMiddleware: RequestHandler = (req, _res, next) => {
  const raw =
    (req.headers["x-lang"] as string) ||
    (req.headers["accept-language"] as string)?.split(",")[0]?.split("-")[0] ||
    DEFAULT_LOCALE;
  req.locale = SUPPORTED.includes(raw) ? raw : DEFAULT_LOCALE;
  next();
};
