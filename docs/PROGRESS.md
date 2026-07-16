# Nafas — Build Progress Tracker

**Living document.** Update it every work session: tick boxes, set status. This is
the single place to see what's done and what's left. Plan/why lives in
[BACKEND_PLAN.md](BACKEND_PLAN.md) + [ROADMAP.md](ROADMAP.md).

## Status legend

`[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (note why)

## Per-feature **Kickoff Breakdown** (given BEFORE writing any code)

At the start of every task/feature, produce a 3-bucket breakdown across all surfaces (backend, shared schema, admin, mobile):

1. **Already built** — exists, reused as-is.
2. **Needs modification** — exists but must change — say what + why.
3. **New** — added from scratch.

Only after this breakdown is shared do we start building.

## Per-feature **Verification Gate** (a feature is NOT done until all pass)

Every feature, before it's marked done, must be **run and checked on all three surfaces**:

1. **API** — endpoints live in **Swagger `/docs`** (always kept current); happy + authz-fail + validation-fail + not-found + scenario tests green.
2. **Admin panel** — the feature's admin section loads, lists, and mutates against the real API.
3. **Mobile app** — the feature's screens run against the real API (no mock for that domain), happy path walked.

Record the gate result inline under each feature (`Verified: API ✅ / Admin ✅ / Mobile ✅` + date).

## Project structure (applied 2026-06-26)

- **Backend modular:** `server/core/` (env, db, jwt, openapi, http) · `server/middleware/` · `server/modules/<feature>/` with `<f>.{schema,db,service,routes,admin.routes,test}.ts` + `<f>.module.ts`; `server/modules/index.ts` is the registry; `app.ts` mounts all modules. Health is the reference module.
- **API envelope (typed, not over-engineered):** single resource → entity JSON; list → `{ data, meta:{page,perPage,total} }` (helpers in `core/http.ts`); errors → `{ code, message, details? }`. All zod-typed in Swagger.
- **Admin dashboard:** `admin/` (Vite+React+**Tailwind**+react-router+react-query+axios+lucide), dark Nafas theme. Design shape follows souq/Rubick (SideMenu sidebar + TopBar + page layout) but built fresh. Pattern per feature: `services/<domain>` (axios) → `hooks/<domain>` (react-query) → `pages/<Feature>`; nav in `layouts/SideMenu/nav.ts`; routes in `router/`. Sections added per feature.
- **Mobile structured:** `src/features/<domain>/{components,hooks,api,types}` + `src/{components/ui,lib,theme,api}`; `app/` stays thin routing. Migrate per feature (see `src/README.md`).

---

## Phase 1 — Core *(building now)*

### B0 — Skeleton & tooling *(enabler)* ✅ DONE 2026-06-26

**Backend**
- [x] `docker-compose.yml` with Postgres (host port **5433** — 5432 taken locally); `DATABASE_URL` via env; `.env.example` + `.env`
- [x] Express split: `app.ts` (middleware + mount `/api` + `/api/admin` + swagger) + `index.ts` (listen); web-static serving kept
- [x] Drizzle client (`server/db/client.ts`) + `drizzle.config.ts` (dotenv) + `db:generate`/`db:migrate`/`db:up`/`db:down` scripts — migration ran clean
- [x] zod → `@asteasolutions/zod-to-openapi` registry (`server/lib/openapi.ts`); **swagger-ui at `/docs`** + `/openapi.json`; `validate()` middleware
- [x] JWT utils (`server/lib/jwt.ts`); `requireAuth`, `requireRole`; bearerAuth scheme in OpenAPI
- [x] central error handler `{code,message}`; `/api/health` + `/api/health/secure`
- note: deleted dead `server/routes.ts` (it shadowed `server/routes/index.ts` — `.ts` file wins over dir, broke router imports)

**Mobile**
- [x] `lib/query-client.ts` `getApiUrl` — env-driven scheme (`EXPO_PUBLIC_API_URL` or http for local hosts)
- [x] `lib/features.ts` flags; tabs gated → Phase-1 tabs = **Workout · Nutrition · Profile**; `index` redirects to Workout when social off

**Admin panel**
- [x] scaffold `admin/` (Vite + React); login screen + token storage; sidebar nav shell (sections tagged F1–F4); env API base. Real admin login wires in F1 (no admin-auth endpoint yet; "Preview shell" works)

**Gate:** `/docs` loads ✅ · `/api/health/secure` 401→200 with JWT ✅ · migrations run ✅ · admin shell renders ✅ · app shows 3 tabs + lands on Workout ✅.
**Verified: API ✅ / Admin ✅ / Mobile ✅ — 2026-06-26**

---

### F2 — Countries *(foundation; do with/just before F1 — register needs it)*

- [ ] `shared/` zod: Country entity + requests
- [ ] Drizzle `countries` table + migration; **seed Jordan (primary) + KSA** (currency JOD/SAR, locale, timezone Asia/Amman / Asia/Riyadh, phone code)
- [ ] service: list active; admin CRUD
- [ ] app route `GET /countries`
- [ ] admin routes `GET/POST/PATCH/DELETE /admin/countries`
- [ ] admin panel: **Countries** section (list + add/edit/deactivate)
- [ ] mobile: country pickup at register (drives currency/locale/tz); `Money={amount,currency}` helper — no hardcoded SAR/Riyadh
- [~] tests: manual curl verified (list, admin CRUD authz 401/403); automated tests TODO
- [x] flow→endpoint coverage: register picker consumes `/countries`

**Scenarios:** add a country = one row ✅; JO=JOD/Asia-Amman, SA=SAR/Asia-Riyadh seeded ✅.
**Verified: API ✅ (GET /countries + admin CRUD) / Admin ✅ (Countries page live CRUD) / Mobile ✅ (register country picker loads from /api/countries)** — 2026-06-26 ✅ DONE

---

### F1 — Auth & Identity

**Backend / shared**
- [ ] zod: register/login/refresh/otp/password/profile schemas
- [ ] Drizzle: extend `users` (name, username unique, email, phone, type athlete|coach, avatar_url, body metrics, goal, bio, rank, **country_id FK**, language, theme, status, timestamps); `coach_profiles`; `refresh_tokens`; `otp_codes`
- [ ] `Notifier` interface + **email sender** (SMTP); OTP issue/verify with rate-limit
- [ ] services: register, login, refresh-rotation+reuse-detect, logout/revoke, OTP, password reset, profile

**App routes**
- [ ] `POST /auth/register|login|refresh|logout`
- [ ] `POST /auth/otp/request|verify`
- [ ] `POST /auth/password/forgot|reset`
- [ ] `GET /me` · `PATCH /me` · `GET /users/:idOrUsername` · `GET /users/username-available`
- [ ] `POST /coach-profile` · `PATCH /coach-profile`

**Admin**
- [ ] `GET /admin/users` (search/filter/paginate) · `GET /admin/users/:id` · `PATCH /admin/users/:id` (suspend/role)
- [ ] admin panel: **Users** section

**Mobile**
- [ ] replace all `app/auth/*` faking with real calls; secure token storage; real `NavigationGuard`; delete mocked-login user gen

**Tests / scenarios** (backend, curl-verified)
- [x] dup email 409 · wrong-password 401 · register→OTP→verify→tokens · login 200 (verified user) · refresh rotation 200 · admin-route 401 (no token) / 403 (athlete) · reuse-detection + resend-throttle implemented
- [~] automated test files TODO
- [x] flow→endpoint coverage (register/login/verify/forgot mapped)

**Built:** `server/modules/{countries,identity,auth}/*` + `core/{mailer,schema,http}` + `seed.ts` (countries + admin user). 20 Swagger paths at `/docs`. Admin pages: real Login, Countries (CRUD), Users (role/suspend) + services/hooks. Mobile: `src/{lib/{api,auth-tokens},features/auth/{api,session}}` + rewired `app/auth/{index,login,register,verify-otp,forgot-password}` + `app-context` session hydration (/me on launch) + token storage + logout clears tokens.
**Verified: API ✅ (full auth + identity flows) / Admin ✅ (login + Users page live, shows API-created user) / Mobile ✅ (real-session hydrate → tabs greets DB user "Sami Test"; register country picker live)** — 2026-06-26 ✅ DONE

---

### F3 — Workout & AI Coach *(one domain; AI inside workout)*

**Exercise library = the provided seed, verbatim (single source of truth)** (`nafas-backend/.../seeds/data`, **data only** — port from NestJS/TypeORM to Drizzle): 15 workout types, 103 exercises + descriptions, M:N type links, weighted 26-target body map (97 explicit) + type-fallback map. Replaces the mobile mock (36 ex / 9 crude groups). Seed internal integrity verified clean (no orphans/typos). **No invented exercises/percentages.**

**Seed↔system reconciliation (do during the F3 seed port):**
- [ ] **Fill 6 missing body-target maps** (no explicit entry → generic fallback): Deadlift, Dips, Plank, Burpee, Planche, Snatch — derive % from each exercise's own description (not invented)
- [ ] **Add `measurementType` to every exercise** (seed lacks it; live-workout UI needs it): `reps` | `time_hold` | `distance_duration`; classify all 103. EMOM stays a set/template mode, not an exercise field
- [ ] Adopt all **15 seed workout types** (system gains Core, Calisthenics, Functional, Olympic Lifting, Powerlifting, CrossFit/WOD); keep "Custom" as user `is_custom` mechanism (not seeded); **drop "Strength"** (covered)
- [ ] **Add "Wall Sit"** (hold) — in old system, absent from seed *(Ab Crunches ~ covered by Cable Crunch — skip)*

**EMOM weight (user request 2026-06-26):** EMOM set config gets an **optional `weight`** field — athletes do weighted EMOM (e.g. 10 intervals @ 10kg). Add to `set_configs` (reps/hold/emom) + the live-workout EMOM UI. *(Chin-up confirmed already in seed — lats45/biceps35/mid_back10/rear-delt10; no add.)*

**Backend / shared**
- [ ] zod + Drizzle: `body_targets` enum (26), `workout_types`, `exercises` (system + user `is_custom` + `measurementType`), `exercise_workout_types` (M:N), `exercise_body_targets` (% map), `workout_templates`+`template_exercises`+`set_configs` (**emom supports optional weight**), `workout_logs`+`log_exercises`+`log_sets`, `active_sessions`
- [ ] migration + **seed exercises/types/body-targets** (ported data + gap adds)
- [ ] **reconcile duplicate `Workout`/`WorkoutLog` into one model**
- [ ] services: library search; template CRUD; log create/list/get/delete; active-session save/resume; progress-vs-previous; **AI insight/weekly-plan/recommendations (server heuristic now, LLM later — same endpoints)**

**App routes**
- [ ] `GET /exercises` (search/filter by type/target) · `GET /workout-types`
- [ ] `GET/POST/PATCH/DELETE /workout-templates`
- [ ] `GET/POST /workout-logs` · `GET/DELETE /workout-logs/:id` · `GET /workout-logs/:id/progress`
- [ ] `PUT/GET/DELETE /active-session`
- [ ] `GET /workout/insights` · `GET /workout/weekly-plan` · `GET /workout/recommendations`

**Admin**
- [ ] `GET/POST/PATCH/DELETE /admin/exercises` + `/admin/workout-types`; `GET /admin/workout-logs` (oversight)
- [ ] admin panel: **Exercise library** section (curate types/exercises/body-targets)

**Mobile** ✅
- [x] `src/features/workout/{api,library-cache}.ts` — typed API + live-binding cache for exercises/types
- [x] `app-context` sources exercises/types/logs/templates/active-session from API on hydrate; writes (addWorkoutLog/Template, delete, setActiveSession) optimistic + background sync to server
- [x] picker screens (`prepare-workout`, `live-workout`, `workout-logger`) swapped from mock `exerciseLibrary`/`MUSCLE_GROUPS`/`workoutTypes` → API cache (one-line import change)
- [x] Workout tab AI/insights derive from real server-loaded logs (streak/volume); standalone AI Coach tab already removed in B0 (relabelled Workout)
- [~] deferred: custom-exercise create stays local (no user-exercise endpoint yet); training-type selector still uses local WORKOUT_TYPES const; `share-workout` Save-to-Gallery + offline reconcile = follow-up
**Verified:** real session → Workout tab shows server log (1 workout, 3430kg volume) + active-session loaded from API (round-trip: API PUT → shown → DELETE 204); prepare-workout renders off API exercise cache.

**Tests / scenarios** (backend curl-verified)
- [x] log create 201 (incl. weighted EMOM set persisted) · history · progress-vs-previous · active-session put/get/clear · AI insights update with logs · exercise search/filter by type
- [~] offline-then-sync / concurrent edits → handled in mobile wiring (next)
- [x] flow→endpoint coverage (library/templates/logs/session/AI mapped)

**Built:** `server/modules/workout/*` (db, schema, service, routes, admin, module, seed + `seed-data/` ported) — 7 tables, 33 Swagger paths total. Seed: **104 exercises** (103 + Wall Sit), 15 types, 407 weighted body-targets, 201 links; reconciliation applied (6 filled targets, measurementType, Wall Sit). EMOM set config supports optional weight. Admin **Exercises** page live (search, create, delete, shows types + measurement + weighted targets).
- Fixed mid-build: mount order — `/api` shadowed `/api/admin` once a `/`-mounted app router (workout) with global requireAuth existed → mount adminRouter before apiRouter in `app.ts`.
**Full-flow + extras (2026-06-26):**
- **Per-set note** (optional): `SetConfig.note` added (backend zod + mobile type); editor in `prepare-workout` (all set types) + `live-workout` (during session, `SetRowItem`); persists through log to API.
- **EMOM weight** field in `prepare-workout` EMOM editor.
- **Admin exercise full CRUD**: create/edit details + **body targets** (target + %) + **workout-type links**; `GET /admin/exercises/meta` (15 types + 26 targets); edit/delete per row. Verified create-with-targets returns hydrated.
- **Flow verified on real data:** Templates tab shows server template (My Push Routine); Workout tab shows server log + active session; workout-detail renders server log (planned vs actual, EMOM set, Use-as-Template/Share/Delete); log create 201; template create 201.
- minor cosmetic: detail start/end "Invalid Date" when a log lacks startTime/endTime (curl-made logs); training-type selector still local const; custom-exercise create still local.

**Verified: API ✅ / Admin ✅ (Exercises full CRUD + targets) / Mobile ✅ (prepare→live→save→history→detail→use-template, per-set notes)** — 2026-06-26 ✅ DONE

---

### F4 — Nutrition *(incl. InBody / body composition)*

**Backend / shared**
- [ ] zod + Drizzle: `foods`, `nutrition_days`+`meals`+`meal_items`, `nutrition_targets`, `inbody_tests`
- [ ] migration + seed real `foods` (port/expand the mock food DB)
- [ ] services: food search; day get/add/remove; targets get/recalc-from-profile; InBody CRUD + deltas

**App routes**
- [ ] `GET /foods`
- [ ] `GET /nutrition/days/:date` · `POST/DELETE /nutrition/days/:date/items`
- [ ] `GET/POST /nutrition/targets`
- [ ] `GET/POST/DELETE /inbody`

**Admin**
- [ ] `GET/POST/PATCH/DELETE /admin/foods`
- [ ] admin panel: **Food database** section

**Mobile**
- [ ] wire `(tabs)/nutrition`, `meal-logger`, InBody (moved here from old coach tab); **multi-day history** (new); fix hardcoded-English "Meals" (i18n)

**Tests / scenarios**
- [ ] serving-size math · edit/remove item · per-country timezone day-rollover (Amman vs Riyadh) · target recompute on weight/goal change · InBody delta
- [ ] flow→endpoint coverage

Verified: API ☐ / Admin ☐ / Mobile ☐

---

### F4 Nutrition — ✅ DONE 2026-06-27
**Verified: API ✅ (foods en/ar, day, targets-from-profile, inbody) / Admin ✅ (Foods page) / Mobile ✅ (nutrition tab real 554/2100kcal + macros + meals; meal-logger→API foods; InBody moved to Nutrition, server-backed; Workout tab = Dashboard+Insights)**. Deferred minor: multi-day history.

#### F4.1 Food meal-types + expanded library — ✅ DONE 2026-06-27
- `foods.mealTypes` jsonb `text[]` (hints, multi): breakfast/lunch/dinner/snack/drink/dessert/pre_workout/post_workout. migration `0005`. `meal_type` label group seeded en/ar.
- **Food library expanded 15→110** (researched MFP-style standard per-serving macros across 13 categories: poultry/meat, fish, eggs/dairy, grains, legumes, vegetables, fruits, nuts/fats, beverages, snacks/desserts, ME/Jordanian dishes [mansaf, maqluba, musakhan, …], fast food, supplements) — all with ar names + mealTypes. Seed re-syncs macros/hints on existing rows (single source of truth).
- `GET /foods?mealType=` = hint (surfaces matching first, never excludes). Admin Foods: meal-type chip multiselect in modal + Meal types table column. Mobile meal-logger: passes current slot as hint + renders localized chips on cards.
- Verified all 3 surfaces (API 110 foods + hint order + ar; admin chips/column; mobile en+ar RTL chips).

### Phase 1 sign-off

- [x] B0, F1, F2, F3, F4 gates green (backend+admin+mobile) + i18n (RTL, en/ar) + typecheck wired (0 errors)
- [x] real flows verified: register→OTP→verify→login, workout log+templates+AI, nutrition log+targets+InBody, admin manages countries/users/exercises/foods/labels
- [ ] **AWAITING user confirmation Phase 1 works as wanted → then start Phase 2**

---

## Phase 2 — Discovery & Marketplace *(hidden until Phase 1 signed off)*

High-level (task breakdown drafted when Phase 2 starts):
- [ ] Discover & Directories (gyms/coaches/restaurants/tournaments read, search, map, reviews) + admin CRUD
- [ ] Coach Marketplace (services, courses, bookings — pending/unpaid) + coach verification (admin)
- [ ] Gyms (plans, classes, events — pending/unpaid)
- [ ] Restaurants (menus, orders — pending/unpaid)
- [ ] Tournaments / Events (registration — pending/unpaid)
- [ ] *(Payments: cross-cutting, after marketplace — no money before this)*

## Phase 3 — Social *(hidden)*

- [ ] Community/Social (feed, posts, likes, comments, follow, media) + moderation (admin)
- [ ] Find a Partner (presence/matching, realtime)
