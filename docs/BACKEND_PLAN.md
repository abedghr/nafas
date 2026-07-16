# Nafas — Backend Build Plan (contract-first)

How we build the backend. Pairs with [ROADMAP.md](ROADMAP.md) (the *what/when*);
this is the *how* for the server side. Backend-first, API-first, admin from day one.

## Reality check

The current backend is a **stub** — `server/routes.ts` has no endpoints,
`server/storage.ts` is in-memory `MemStorage`, `shared/schema.ts` has one unused
table. There is nothing to reverse-engineer. **The business logic source of
truth is the client**: the screen flows, `lib/mock-data.ts` shapes, and the
TypeScript interfaces in `lib/app-context.tsx`. We lift the contract from there.

## Strategy

1. **Contract-first / OpenAPI.** zod is already a dependency and already used.
   Make **zod schemas in `shared/` the single source of truth**, generate the
   **OpenAPI 3 (Swagger)** spec from them (`@asteasolutions/zod-to-openapi`),
   serve it via **swagger-ui-express** at `/docs`, and **validate every request**
   against those same zod schemas. One definition → docs + validation + client
   types. No spec/code drift.
2. **Domain-vertical, one at a time, grouped into 3 phases.** A domain ships its
   schemas, tables, service logic, **app routes + admin routes + admin-panel
   section**, tests, and Swagger — then we move on. We only work the current
   phase; **later-phase features are hidden, not removed** (see below).
3. **Admin built per-feature.** Every domain that needs back-office control ships
   its `/admin/*` API **and** the matching admin-panel section in the same pass.
   The admin panel is scaffolded up front (empty shell) and grows feature by
   feature. No big-bang dashboard at the end.
4. **Flow→endpoint coverage.** For each client screen/flow we list the calls it
   must make and confirm an endpoint exists. Gaps surface here, not in QA.
5. **Verify, don't just document.** Swagger is the contract; **tests are the
   verification** — every endpoint: happy + authz-fail + validation-fail +
   not-found, plus the domain's business scenarios. **Then run it** — each
   feature is checked on all three surfaces (API/Swagger · admin panel · mobile
   app) before it's marked done. Progress tracked in [PROGRESS.md](PROGRESS.md).

## Stack & decisions (adjustable, but chosen so we can start)

| Concern | Choice |
|---|---|
| Runtime/API | Express (existing `server/`), TypeScript via `tsx` |
| DB / ORM / migrations | Postgres + Drizzle + `drizzle-kit` |
| Validation + contract | **zod → `@asteasolutions/zod-to-openapi` → swagger-ui-express at `/docs`** |
| Request validation | zod at the route boundary (a `validate(schema)` middleware) |
| Auth | JWT access + refresh; `Authorization: Bearer` |
| **Roles / RBAC** | `athlete`, `coach`, `admin` — middleware `requireRole(...)` |
| Layout | `server/` stays in this repo. Structure: `routes/` (app) + `routes/admin/` + `services/` (logic) + `db/` (drizzle) + `middleware/` + `shared/` schemas |
| Errors | central handler (already stubbed) → `{ code, message, details? }`, correct HTTP status |
| Admin panel UI | **separate web app `admin/` (Vite + React), in this repo, consuming `/api/admin/*`.** Scaffolded in B0 (empty shell + auth); each feature adds its own section as it's built. |
| Feature hiding | central flag config (server: only mount current-phase routers; client: `lib/features.ts` gates tabs/routes). Deferred code stays in the repo, just unreachable. |

**Layering rule:** routes do auth + validation + shape; **all business logic
lives in `services/`** so app routes and admin routes reuse the same logic and
scenarios are tested once.

## RBAC model

- **athlete** — owns their data; reads public content; creates social/bookings/orders.
- **coach** — athlete + manages own coach profile, services, courses, incoming bookings (after verification).
- **admin** — full back-office: manage users, verify coaches, CRUD all directory listings, moderate content, oversee bookings/orders, manage countries, read metrics.

## Phases & feature hiding

Three phases. **We build Phase 1 only, fully, then stop and verify before Phase 2.**

| Phase | Features (domains) |
|---|---|
| **Phase 1 — Core** *(now)* | Auth & Identity · Countries · **Workout & AI Coach** (one domain) · Nutrition |
| **Phase 2 — Discovery & Marketplace** | Discover & Directories · Coach Marketplace · Gyms · Restaurants · Tournaments/Events |
| **Phase 3 — Social** | Community/Social · Find a Partner |

*(Payments stays a cross-cutting later effort, attached to Phase 2 marketplace — no payment paths until then.)*

**Hiding deferred features (Phase 2 + 3) — not removing:**
- **Server:** only mount Phase-1 routers (auth, countries, workout, nutrition + their admin). Deferred domains aren't built yet; nothing to expose.
- **Client:** a `lib/features.ts` flag map (`{ discovery:false, marketplace:false, social:false, findPartner:false }`) gates tabs, routes, and entry points. Deferred screen files stay in `app/` but are unreachable. Phase-1 tab set shrinks to **Workout (home, with AI insights inside) · Nutrition · Profile** — the standalone "AI Coach", "Communities", and "Discover" tabs are hidden.
- **Admin panel:** only Phase-1 sections rendered (countries, users, exercises, foods).
- Flipping a flag / mounting a router is how a later phase turns on — no code resurrection needed.

**AI Coach folds into Workout:** AI insights, recommendations, and the weekly plan are part of the **Workout** domain and surface *inside* the workout experience — not a separate tab. (Body-composition / InBody moves to **Nutrition**, since it's body metrics + targets.)

## Definition of Done — per domain

- [ ] zod schemas in `shared/` (request + response + entity)
- [ ] Drizzle tables + migration
- [ ] service layer with all business scenarios from ROADMAP
- [ ] app routes wired + authz
- [ ] **admin routes** wired + `requireRole('admin')`
- [ ] **admin-panel section** built (if the feature needs back-office control)
- [ ] OpenAPI paths auto-registered → visible + correct in `/docs`
- [ ] tests: happy + authz-fail + validation-fail + not-found + domain scenarios
- [ ] flow→endpoint coverage checked for the client screens in that domain
- [ ] the domain's slice of `mock-data.ts` is deletable (client can run off API)

---

## B0 — Skeleton & tooling *(enabler)*

Build once; every domain plugs into it.

- Express app split: `app.ts` (middleware) vs `index.ts` (serve + listen). Mount `/api` (app) and `/api/admin` (admin) routers; keep existing web-static serving.
- **Postgres via `docker-compose.yml`** (decided) — one command brings up the DB; cloud-agnostic, matches "host decided later". Backend reads `DATABASE_URL` from env.
- Drizzle: db client, `drizzle.config.ts` wired to `DATABASE_URL`, migration scripts (`db:generate`, `db:migrate`), no seed of fake demo data.
- zod + zod-to-openapi registry; `swagger-ui-express` at `/docs`; a `validate()` middleware.
- Auth + RBAC middleware (`requireAuth`, `requireRole`), JWT issue/verify/refresh utilities.
- Central error handler emitting `{code,message}`; `/api/health`.
- Fix `lib/query-client.ts` `getApiUrl` (drop forced `https`, env-driven scheme) so the client can actually reach `:5001` in dev.
- **Client feature flags:** add `lib/features.ts` and gate tabs/routes. Phase-1 tab set = **Workout · Nutrition · Profile**; hide Communities/Discover tabs + the standalone AI Coach tab. Deferred screens stay as files.
- **Admin panel scaffold:** create `admin/` (Vite + React web app) — empty shell with admin login (against `/api/admin` auth) + nav skeleton + an env-driven API base. No feature sections yet; they land with each domain.

**DoD:** `/docs` loads (empty but live); a protected `/api/health/secure` returns 401 without a token and 200 with one; migrations run against a real DB; the admin shell logs in and renders an empty dashboard; the app shows only the 3 Phase-1 tabs.

---

## Domain delivery

Each domain lists **app** endpoints, **admin** endpoints + panel section. Fields
live in the zod schemas; scenarios in ROADMAP. This is the coverage checklist —
not final signatures. **Phase 1 = the four `F*` domains below. Phase 2/3 domains
are listed for context but NOT built yet (hidden).**

## ── Phase 1 (build now) ──

### F1 — Auth & Identity

**App**
- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout`
- `POST /auth/otp/request` · `POST /auth/otp/verify` (email OTP now)
- `POST /auth/password/forgot` · `POST /auth/password/reset`
- `GET /me` · `PATCH /me` · `GET /users/:idOrUsername` · `GET /users/username-available`
- `POST /coach-profile` · `PATCH /coach-profile` (coach role — captured now even though marketplace is Phase 2)

**Admin** — `GET /admin/users` (search/filter/paginate) · `GET /admin/users/:id` · `PATCH /admin/users/:id` (suspend/role).
**Admin panel:** Users section.
**Scenarios:** all ROADMAP P0 auth; email OTP behind a `Notifier` interface (SMS later); register picks country (→ F2).

### F2 — Countries *(foundation; ships with/just before F1 since register needs it)*

**App** — `GET /countries` (active list — drives currency/locale/timezone).
**Admin** — `GET/POST/PATCH/DELETE /admin/countries` — **add a country = one row.** Seed **Jordan (primary) + KSA**.
**Admin panel:** Countries section.
**Scenarios:** register in Jordan vs KSA → right currency/locale/tz; no hardcoded SAR/Riyadh anywhere; `Money = {amount,currency}`.

### F3 — Workout & AI Coach *(one domain — AI lives inside workout)*

**Exercise library = the provided seed, verbatim (single source of truth).**
Port the seed at `nafas-backend/src/migration/seeds/data` — **data only** (it's
NestJS/TypeORM; we're Express/Drizzle): 15 workout types, ~103 exercises +
descriptions, M:N exercise↔type links, the weighted **26-target body map** +
type-fallback map. Replaces the mobile mock's 36 exercises + 9 crude groups; the
26-target enum becomes the muscle taxonomy. **No invented exercises or
muscle %** — the seed is authoritative. Internal integrity verified clean (103
exercises all type-linked, 97 valid target-maps, no orphans/typos).

**Reconciliation fixes applied during the port** (covering seed↔system gaps, both directions):
- Fill the 6 exercises lacking an explicit body-target (Deadlift, Dips, Plank, Burpee, Planche, Snatch) — % derived from their own descriptions, not invented.
- Add a `measurementType` field (`reps` | `time_hold` | `distance_duration`) to all 103 — the seed has none and the live-workout UI requires it. EMOM stays a set/template mode.
- Adopt all 15 seed workout types; keep "Custom" as user `is_custom`; drop legacy "Strength"; add "Wall Sit" (hold), which the old system had and the seed lacks.

**App** — exercises `GET /exercises` (search/filter); templates `GET/POST/PATCH/DELETE /workout-templates`; logs `GET/POST/GET:id/DELETE /workout-logs`; active session `PUT/GET/DELETE /active-session`; progress `GET /workout-logs/:id/progress` (vs previous same-name); **AI `GET /workout/insights`, `GET /workout/weekly-plan`, `GET /workout/recommendations`** (server-side heuristic now; LLM later, same endpoints).
**Admin** — `GET/POST/PATCH/DELETE /admin/exercises` (curate global library); `GET /admin/workout-logs` (oversight/metrics).
**Admin panel:** Exercise library section.
**Notes:** reconcile duplicate `Workout`/`WorkoutLog` into one model. AI insight/plan/recommendations are part of this domain and surface inside the workout UI — **the standalone AI Coach tab is removed.**

### F4 — Nutrition *(includes InBody / body composition)*

**App** — foods `GET /foods` (search); day `GET /nutrition/days/:date`, `POST/DELETE /nutrition/days/:date/items`; targets `GET/POST /nutrition/targets`; **InBody `GET/POST/DELETE /inbody`** (moved here from the old AI Coach tab).
**Admin** — `GET/POST/PATCH/DELETE /admin/foods` (manage food DB).
**Admin panel:** Food database section.
**Scenarios:** serving-size math; multi-day history; per-country timezone day-rollover (Amman vs Riyadh); targets recompute from weight/goal; InBody deltas.

> **Phase 1 admin panel sections:** Users · Countries · Exercises · Foods (+ a metrics overview as data lands).

## ── Phase 2 (hidden until Phase 1 verified) ──

Discovery & Directories · Coach Marketplace · Gyms · Restaurants · Tournaments/Events.
App: directory read/search/detail/map/reviews. Admin: full CRUD of all listings
(the bulk of the dashboard) + coach verification. Marketplace logic (bookings,
courses, memberships, orders, registrations) creates **pending/unpaid** records —
**no payments**. Endpoint catalog drafted when Phase 2 starts.

## ── Phase 3 (hidden) ──

Community/Social (feed, posts, likes, comments, follow, media) + Find a Partner
(presence/matching, realtime). Admin: moderation + reports. Catalog at Phase 3 start.

---

## Admin panel — incremental

`admin/` is a separate Vite+React web app consuming only `/api/admin/*`,
scaffolded in B0 (shell + login + nav). Sections are added **with the feature
that needs them**, not at the end:

- **Phase 1:** Users, Countries, Exercises, Foods, metrics overview.
- **Phase 2:** Directory CRUD (gyms, coaches+verification, restaurants+menus, tournaments), reviews, marketplace oversight.
- **Phase 3:** Content moderation, reports, communities.

Metrics (`GET /admin/metrics/*`) grow per domain as real data appears.

## Flow→endpoint coverage (how we close gaps)

Per domain, before marking done, walk each client screen and list its required
calls; tick each against the catalog above. Example (auth): `auth/index` →
register/social-stub-removed; `login` → `POST /auth/login`; `verify-otp` →
`otp/verify`; `forgot-password` → forgot+reset. Any screen action with no
endpoint = a gap to add before closing the domain. This is where the prototype's
**dead buttons** get real endpoints (or stay explicitly deferred).

## Sequence

```
B0 skeleton (Express+Drizzle+zod→Swagger+RBAC, admin shell, feature flags)
  └─ PHASE 1 (build now, then STOP + verify)
       F1 Auth & Identity
       F2 Countries          (foundation, with F1)
       F3 Workout & AI Coach (AI folded in)
       F4 Nutrition          (InBody here)
            │  ← Phase 2 & 3 hidden behind flags / unmounted until Phase 1 signed off
  ── PHASE 2 (later) ── Discover/Directories · Coach Marketplace · Gyms · Restaurants · Tournaments
  ── PHASE 3 (later) ── Community/Social · Find a Partner
       (Payments: cross-cutting, attaches to Phase 2 marketplace — no $ before then)
```

Each box: not started, or **fully closed** (Swagger + tests + admin + mock deleted). Never in between. We do not start Phase 2 until you confirm Phase 1 works as wanted.
