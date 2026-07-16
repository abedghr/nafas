import express from "express";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import { modules } from "./modules";
import { buildOpenApiDocument } from "./core/openapi";
import { errorHandler } from "./middleware/error";
import { localeMiddleware } from "./middleware/locale";

const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
        origins.add(`https://${d.trim()}`),
      );
    }
    // Explicit allowed origins (e.g. the admin dashboard site). Full origins,
    // comma-separated: CORS_ORIGINS=https://nafas-admin.onrender.com
    if (process.env.CORS_ORIGINS) {
      process.env.CORS_ORIGINS.split(",").forEach((o) => { const v = o.trim(); if (v) origins.add(v); });
    }
    const origin = req.header("origin");
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-lang, Accept-Language");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let captured: unknown;
    const orig = res.json;
    res.json = function (body, ...args) {
      captured = body;
      return orig.apply(res, [body, ...args]);
    };
    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;
      let line = `${req.method} ${reqPath} ${res.statusCode} in ${Date.now() - start}ms`;
      if (captured) line += ` :: ${JSON.stringify(captured)}`;
      if (line.length > 100) line = line.slice(0, 99) + "…";
      log(line);
    });
    next();
  });
}

// ── Static Expo web serving + landing page (unchanged behaviour) ──────────────
function getAppName(): string {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8"),
    );
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(process.cwd(), "static-build", platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(process.cwd(), "server", "templates", "landing-page.html");
  const landingPageTemplate = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf-8")
    : "<h1>APP_NAME_PLACEHOLDER</h1>";
  const appName = getAppName();

  // Production web: the Expo web export (SPA). When present, serve it as the app
  // at every non-API route (this is what the installable PWA loads).
  const distDir = path.resolve(process.cwd(), "dist");
  const hasWebApp = fs.existsSync(path.join(distDir, "index.html"));
  const isWebRoute = (p: string) => !(p.startsWith("/api") || p.startsWith("/docs") || p.startsWith("/uploads"));

  // Native Expo clients (OTA/dev) ask for the manifest via the expo-platform header.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isWebRoute(req.path)) return next();
    const platform = req.header("expo-platform");
    if ((req.path === "/" || req.path === "/manifest") && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));

  if (hasWebApp) {
    app.use(express.static(distDir, { index: false }));
    // SPA fallback — client-side routing: any other web GET returns index.html
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || !isWebRoute(req.path)) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).sendFile(path.join(distDir, "index.html"));
    });
  } else {
    // Dev/Replit fallback: landing page + legacy static-build.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!isWebRoute(req.path) || req.path !== "/") return next();
      const forwardedProto = req.header("x-forwarded-proto");
      const protocol = forwardedProto || req.protocol || "https";
      const host = req.header("x-forwarded-host") || req.get("host");
      const baseUrl = `${protocol}://${host}`;
      const html = landingPageTemplate
        .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
        .replace(/EXPS_URL_PLACEHOLDER/g, `${host}`)
        .replace(/APP_NAME_PLACEHOLDER/g, appName);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    });
    app.use(express.static(path.resolve(process.cwd(), "static-build")));
  }
}

export function createApp() {
  const app = express();
  // API responses are dynamic — no ETag/304 (a 304 yields an empty body in the
  // mobile fetch path, which silently blanked food lists). Always send fresh 200s.
  app.disable("etag");

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  app.use(localeMiddleware);

  // Swagger UI from the live OpenAPI document (always current — generated from zod)
  app.get("/openapi.json", (_req, res) => res.json(buildOpenApiDocument()));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));

  // API — each feature module registers its app + admin routes
  const apiRouter = Router();
  const adminRouter = Router();
  apiRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  for (const m of modules) {
    m.registerApp?.(apiRouter);
    m.registerAdmin?.(adminRouter);
  }
  // Admin first — "/api" is a prefix of "/api/admin", so the more specific
  // mount must be registered first or the app router would shadow it.
  app.use("/api/admin", adminRouter);
  app.use("/api", apiRouter);

  // uploaded images (gym logos/covers, …)
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // Web (Expo static + landing) — must come after /api and /docs
  configureExpoAndLanding(app);

  // Errors last
  app.use(errorHandler);

  return app;
}
