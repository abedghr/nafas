import { Router } from "express";
import { z } from "zod";
import { registry } from "../../core/openapi";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qstr, listSchema } from "../../core/http";
import { gymsService } from "./gyms.service";
import { GymSchema, JoinRequestSchema, FacilitySchema, ClassSchema, EnrollStatusSchema, ReviewSchema, ReviewInputSchema, ManageGymInputSchema, AddTeamMemberSchema, TeamMemberSchema } from "./gyms.schema";

export const gymsRouter = Router();
gymsRouter.use(requireAuth);
const sec = [{ bearerAuth: [] }];
const json = (schema: z.ZodTypeAny, description = "OK") => ({ content: { "application/json": { schema } }, description });

registry.registerPath({ method: "get", path: "/api/facilities", tags: ["Gyms"], summary: "Facility catalog (localized)", security: sec,
  responses: { 200: json(z.object({ data: z.array(FacilitySchema) })) } });
gymsRouter.get("/facilities", async (req, res) => res.json({ data: await gymsService.listFacilities(req.locale) }));

registry.registerPath({
  method: "get", path: "/api/gyms", tags: ["Gyms"], summary: "Gym directory (country-scoped, localized, paginated)", security: sec,
  responses: { 200: json(listSchema(GymSchema)) },
});
gymsRouter.get("/gyms", async (req, res) => {
  const page = Number(qstr(req.query.page)) || 1;
  const perPage = Math.min(Number(qstr(req.query.perPage)) || 20, 100);
  res.json(await gymsService.list({
    search: qstr(req.query.search),
    countryId: qstr(req.query.countryId),
    locale: req.locale,
    page, perPage,
  }));
});

registry.registerPath({
  method: "get", path: "/api/gyms/{id}", tags: ["Gyms"], summary: "Gym detail (localized)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(GymSchema) },
});
gymsRouter.get("/gyms/:id", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.json(await gymsService.get(String(req.params.id), req.locale, req.user!.sub)));

registry.registerPath({
  method: "post", path: "/api/gyms/{id}/join", tags: ["Gyms"], summary: "Request to join/subscribe (pending — no payment)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: JoinRequestSchema } } } },
  responses: { 201: json(z.any()) },
});
gymsRouter.post("/gyms/:id/join", validate({ params: z.object({ id: z.string().uuid() }), body: JoinRequestSchema }), async (req, res) =>
  res.status(201).json(await gymsService.requestMembership(req.user!.sub, String(req.params.id), req.body.plan)));

registry.registerPath({ method: "delete", path: "/api/gyms/{id}/join", tags: ["Gyms"], summary: "Cancel my pending join request", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(z.any()) } });
gymsRouter.delete("/gyms/:id/join", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.json(await gymsService.cancelMembershipRequest(req.user!.sub, String(req.params.id))));

registry.registerPath({ method: "get", path: "/api/gyms/me/requests", tags: ["Gyms"], summary: "My gym membership requests", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/requests", async (req, res) => res.json({ data: await gymsService.myRequests(req.user!.sub) }));

registry.registerPath({ method: "get", path: "/api/gyms/me/gyms", tags: ["Gyms"], summary: "My gyms (memberships + pending requests)", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/gyms", async (req, res) => res.json({ data: await gymsService.myGyms(req.user!.sub, req.locale) }));

// gym owner: gyms I own + their leads
registry.registerPath({ method: "get", path: "/api/gyms/me/owned", tags: ["Gyms"], summary: "Gyms I own", security: sec, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/owned", async (req, res) => res.json({ data: await gymsService.ownedGyms(req.user!.sub, req.locale) }));

registry.registerPath({ method: "get", path: "/api/gyms/me/leads", tags: ["Gyms"], summary: "Incoming leads for gyms I own", security: sec, responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/leads", async (req, res) => res.json({ data: await gymsService.ownerLeads(req.user!.sub) }));

registry.registerPath({ method: "patch", path: "/api/gyms/me/leads/{id}", tags: ["Gyms"], summary: "Owner: update a lead (pending|approved|rejected)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: z.object({ status: z.enum(["pending", "approved", "rejected"]) }) } } } }, responses: { 200: json(z.any()) } });
gymsRouter.patch("/gyms/me/leads/:id", validate({ params: z.object({ id: z.string().uuid() }), body: z.object({ status: z.enum(["pending", "approved", "rejected"]) }) }), async (req, res) =>
  res.json(await gymsService.ownerUpdateLeadStatus(req.user!.sub, String(req.params.id), req.body.status)));

// ── team & manager self-service (me-routes, before /gyms/:id) ──
registry.registerPath({ method: "get", path: "/api/gyms/me/managed", tags: ["Gyms"], summary: "Gyms I can manage (owned + team)", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/managed", async (req, res) => res.json({ data: await gymsService.managedGyms(req.user!.sub, req.locale) }));

registry.registerPath({ method: "patch", path: "/api/gyms/me/managed/{id}", tags: ["Gyms"], summary: "Edit a gym I manage (whitelisted fields)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: ManageGymInputSchema } } } }, responses: { 200: json(GymSchema) } });
gymsRouter.patch("/gyms/me/managed/:id", validate({ params: z.object({ id: z.string().uuid() }), body: ManageGymInputSchema }), async (req, res) => {
  const { translations, ...patch } = req.body;
  res.json(await gymsService.updateManagedGym(req.user!.sub, String(req.params.id), patch, translations));
});

registry.registerPath({ method: "get", path: "/api/gyms/me/managed/{id}/team", tags: ["Gyms"], summary: "Team (owner + managers) of a gym I manage", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(z.object({ owner: z.any(), members: z.array(TeamMemberSchema) })) } });
gymsRouter.get("/gyms/me/managed/:id/team", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) => {
  if (!(await gymsService.canManageGym(req.user!.sub, String(req.params.id)))) return res.status(403).json({ code: "FORBIDDEN", message: "Not your gym" });
  res.json(await gymsService.gymTeamMembers(String(req.params.id)));
});

registry.registerPath({ method: "post", path: "/api/gyms/me/managed/{id}/team", tags: ["Gyms"], summary: "Owner: add a manager by email", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: AddTeamMemberSchema } } } }, responses: { 201: json(z.any()) } });
gymsRouter.post("/gyms/me/managed/:id/team", validate({ params: z.object({ id: z.string().uuid() }), body: AddTeamMemberSchema }), async (req, res) =>
  res.status(201).json(await gymsService.addTeamMember(req.user!.sub, String(req.params.id), req.body.email)));

registry.registerPath({ method: "delete", path: "/api/gyms/me/managed/{id}/team/{memberId}", tags: ["Gyms"], summary: "Owner: remove a manager", security: sec,
  request: { params: z.object({ id: z.string().uuid(), memberId: z.string().uuid() }) }, responses: { 204: { description: "Removed" } } });
gymsRouter.delete("/gyms/me/managed/:id/team/:memberId", validate({ params: z.object({ id: z.string().uuid(), memberId: z.string().uuid() }) }), async (req, res) => {
  await gymsService.removeTeamMember(req.user!.sub, String(req.params.id), String(req.params.memberId));
  res.status(204).end();
});

// ── classes ── (me-routes registered BEFORE /gyms/:id/classes so "me" isn't captured as :id)
registry.registerPath({ method: "get", path: "/api/gyms/me/classes", tags: ["Gyms"], summary: "My class enrollments", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/classes", async (req, res) => res.json({ data: await gymsService.myClasses(req.user!.sub, req.locale) }));

registry.registerPath({ method: "get", path: "/api/gyms/me/class-requests", tags: ["Gyms"], summary: "Coach: join requests for my classes", security: sec,
  responses: { 200: json(z.object({ data: z.array(z.any()) })) } });
gymsRouter.get("/gyms/me/class-requests", async (req, res) => res.json({ data: await gymsService.coachClassRequests(req.user!.sub) }));

registry.registerPath({ method: "patch", path: "/api/gyms/me/class-requests/{id}", tags: ["Gyms"], summary: "Coach: approve/reject a class join (enrolled sets 30d expiry)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: EnrollStatusSchema } } } }, responses: { 200: json(z.any()) } });
gymsRouter.patch("/gyms/me/class-requests/:id", validate({ params: z.object({ id: z.string().uuid() }), body: EnrollStatusSchema }), async (req, res) =>
  res.json(await gymsService.coachUpdateEnrollment(req.user!.sub, String(req.params.id), req.body.status)));

registry.registerPath({ method: "get", path: "/api/gyms/{id}/classes", tags: ["Gyms"], summary: "Classes for a gym (localized, with my status)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(z.object({ data: z.array(ClassSchema) })) } });
gymsRouter.get("/gyms/:id/classes", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.json({ data: await gymsService.listClasses(String(req.params.id), req.user!.sub, req.locale) }));

registry.registerPath({ method: "post", path: "/api/classes/{id}/join", tags: ["Gyms"], summary: "Request to join a class (pending → coach approval)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 201: json(z.any()) } });
gymsRouter.post("/classes/:id/join", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.status(201).json(await gymsService.requestJoinClass(req.user!.sub, String(req.params.id))));

registry.registerPath({ method: "delete", path: "/api/classes/{id}/join", tags: ["Gyms"], summary: "Cancel my class enrollment/request", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(z.any()) } });
gymsRouter.delete("/classes/:id/join", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.json(await gymsService.cancelClassEnrollment(req.user!.sub, String(req.params.id))));

// ── reviews ──
registry.registerPath({ method: "get", path: "/api/gyms/{id}/reviews", tags: ["Gyms"], summary: "Reviews for a gym", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: json(z.object({ data: z.array(ReviewSchema) })) } });
gymsRouter.get("/gyms/:id/reviews", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) =>
  res.json({ data: await gymsService.listReviews(String(req.params.id), req.user!.sub) }));

registry.registerPath({ method: "post", path: "/api/gyms/{id}/reviews", tags: ["Gyms"], summary: "Create/update my review (recomputes rating)", security: sec,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: ReviewInputSchema } } } }, responses: { 201: json(z.any()) } });
gymsRouter.post("/gyms/:id/reviews", validate({ params: z.object({ id: z.string().uuid() }), body: ReviewInputSchema }), async (req, res) =>
  res.status(201).json(await gymsService.upsertReview(req.user!.sub, String(req.params.id), req.body.rating, req.body.comment)));

registry.registerPath({ method: "delete", path: "/api/gyms/reviews/{id}", tags: ["Gyms"], summary: "Delete my review", security: sec,
  request: { params: z.object({ id: z.string().uuid() }) }, responses: { 204: { description: "Deleted" } } });
gymsRouter.delete("/gyms/reviews/:id", validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) => {
  await gymsService.deleteReview(req.user!.sub, String(req.params.id));
  res.status(204).end();
});
