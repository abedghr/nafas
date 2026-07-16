import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Adds .openapi() to zod schemas. Call once, here.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Bearer JWT scheme, referenced by secured paths via security:[{ bearerAuth: [] }]
export const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  { type: "http", scheme: "bearer", bearerFormat: "JWT" },
);

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Nafas API",
      version: "0.1.0",
      description: "Nafas backend API. Built contract-first from zod schemas.",
    },
    servers: [{ url: "/" }],
  });
}
