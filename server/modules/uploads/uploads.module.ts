import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth, requireRole } from "../../middleware/auth";
import type { AppModule } from "../types";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname) || ".png"}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const uploadHandler = (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ code: "NO_FILE", message: "No image uploaded" });
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
};

const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));
registry.registerPath({
  method: "post", path: "/api/admin/uploads", tags: ["Admin: Uploads"], summary: "Upload an image (multipart 'file'), returns its URL",
  security: [{ bearerAuth: [] }],
  responses: { 201: { content: { "application/json": { schema: z.object({ url: z.string() }) } }, description: "Uploaded" } },
});
adminRouter.post("/", upload.single("file"), uploadHandler);

// authed (any user) upload — for mobile self-service (coach before/after, etc.)
const appRouter = Router();
appRouter.use(requireAuth);
registry.registerPath({
  method: "post", path: "/api/uploads", tags: ["Uploads"], summary: "Upload an image (authed), returns its URL",
  security: [{ bearerAuth: [] }],
  responses: { 201: { content: { "application/json": { schema: z.object({ url: z.string() }) } }, description: "Uploaded" } },
});
appRouter.post("/", upload.single("file"), uploadHandler);

export const uploadsModule: AppModule = {
  name: "uploads",
  registerApp(api) {
    api.use("/uploads", appRouter);
  },
  registerAdmin(admin) {
    admin.use("/uploads", adminRouter);
  },
};
