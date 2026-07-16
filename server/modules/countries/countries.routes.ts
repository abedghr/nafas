import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { countriesService } from "./countries.service";
import { CountrySchema } from "./countries.schema";

export const countriesRouter = Router();

registry.registerPath({
  method: "get",
  path: "/api/countries",
  summary: "List active countries (public — drives register picker)",
  tags: ["Countries"],
  responses: {
    200: {
      description: "Active countries",
      content: { "application/json": { schema: z.object({ data: z.array(CountrySchema) }) } },
    },
  },
});
countriesRouter.get("/", async (_req, res) => {
  const data = await countriesService.listActive();
  res.json({ data });
});
