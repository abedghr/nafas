# Nafas — Productionization Roadmap

Goal: turn the prototype into a **real, multi-user system** — no mock data, no
demo shortcuts, every flow closed end-to-end. Method: **one business domain at a
time, fully closed (all logic + scenarios + tests) before the next.** Some
features are explicitly **deferred** to later phases.

> This is the plan. Each phase below has a detail section: data model → API →
> client wiring (what mock to delete) → scenarios/edge cases → definition of done.
> Phases are sequenced by dependency; later phases assume earlier ones are closed.

## Delivery grouping (current — supersedes the old P0–P8 numbering for *sequencing*)

We build in **three phases**, hiding (not removing) later-phase features. The
detailed P0–P8 sections below are still the reference for *data models +
scenarios*; the grouping just sets order and what's active. See
[BACKEND_PLAN.md](BACKEND_PLAN.md) for the build mechanics.

- **Phase 1 (now):** Auth & Identity · Countries · **Workout & AI Coach** (one domain — AI insights/plan/recommendations live *inside* workout; the standalone AI Coach tab is removed) · Nutrition (incl. InBody / body composition). Maps to ROADMAP P0+P1, P2, P3.
- **Phase 2 (later):** Discover & Directories · Coach Marketplace · Gyms · Restaurants · Tournaments/Events (P5–P7). Marketplace records are pending/unpaid — **no payments** (P8) yet.
- **Phase 3 (later):** Community/Social · Find a Partner (P4 + deferred realtime).

Phase 2/3 stay hidden behind feature flags / unmounted routers until Phase 1 is verified.

---

## Working method (applies to every phase)

- **Definition of Done per domain:** schema + migration; API with zod validation + auth + authorization; client reads/writes through React Query (no `mock-data.ts` left in that domain); every scenario + edge case below handled; happy + failure paths tested; the corresponding rows in `FEATURES.md` flip to ✅.
- **No mock / no demo:** delete the domain's slice of `lib/mock-data.ts` when it goes live. No "accept anything" shortcuts. Faked auth is removed in Phase 0.
- **One domain at a time:** we don't half-open five domains. A domain is either untouched (still mock) or closed.
- **Tests:** API integration tests per endpoint (happy + auth-fail + validation-fail + not-found). Critical client logic (timers, macro math, streak) gets unit tests.
- **Branch per domain**, merged only when its Done criteria pass.

---

## Tech baseline (decided once, in Phase 0)

Reuse what's scaffolded; don't add frameworks.

| Concern | Choice | Why |
|---|---|---|
| API | **Express** (existing `server/`) | Already there; `routes.ts` is the empty seam. |
| DB / ORM | **Postgres + Drizzle** (existing `shared/schema.ts`, `drizzle.config.ts`) | Already wired for it. |
| Validation | **zod** (already a dep) | Shared schemas client+server via `shared/`. |
| Client data | **React Query** (already mounted in `_layout.tsx`) | Use `lib/query-client.ts`; it's currently inert. |
| Auth | **JWT access + refresh**, refresh in secure storage | Standard for mobile; no session server needed. |
| OTP delivery | **Email OTP now**, behind a **pluggable sender interface** (SMS added later, no code change at call sites) | Decided: email first; SMS per-country later. |
| **Multi-country** | **Country is a first-class entity** from Phase 0 (see below) | Decided: **Jordan = primary launch country**, KSA next, must be able to add more. |
| Media (avatars, post images) | **S3-compatible object storage** + signed uploads | Introduced in Phase 4 (Social), not before. |
| Hosting | **Cloud-agnostic**: Docker + env-driven config | Decided later; build so it runs on either the in-house Docker Swarm or a managed host. |
| Payments | **Deferred to Phase 8** — a PSP (likely Moyasar/Tap/HyperPay, multi-currency) | Decided: **no payment of any kind before Phase 8.** Provider locked at P8. |

**No payments early:** Phases 1–7 ship with zero payment paths. Bookings/memberships/orders are created as *pending/unpaid records*; money is bolted on only in Phase 8.

**Open decisions** (don't block the plan; lock before the relevant phase): concrete SMS provider per country (before SMS is enabled); hosting host (before P0 deploy); PSP (before P8).

---

## Phase 0 — Foundation *(enabler; no standalone business value)*

Everything depends on this. Closes the "no backend / no auth" gaps.

**Build**
- DB connection + Drizzle setup, migration workflow (`drizzle-kit`), seed-free.
- Express skeleton in `server/routes.ts`: router structure, central error handler (already stubbed in `index.ts`), zod request validation, auth middleware, request-scoped user.
- **Real auth**, replacing all of `app/auth/*` faking:
  - register (athlete/coach), login, JWT issue + refresh rotation, logout/revoke.
  - **OTP via email now** (real SMTP), behind a `Notifier` interface so SMS slots in later with no call-site change. Resend with rate limit.
  - password reset (request → email OTP → set), real.
- **Multi-country foundation (must land in P0, not retrofitted):**
  - `countries` table: code (ISO), name, **currency** (JOD, SAR, …), phone code, default language, **locale + timezone**, `is_active`. **Seed Jordan (primary) + KSA.** Adding a country = a row, not a deploy.
  - `Money` is always `{ amount, currency }` — never a bare number, never hardcoded `'SAR'`.
  - User belongs to a country (set at register / from locale); a **selected-country context** drives currency, timezone, and which directory data is shown.
  - No hardcoded geo/currency anywhere — purge the Riyadh/SAR assumptions baked into the current mock (`mock-data.ts` coords, `'SAR'` literals, `Asia/Riyadh`).
- Client: token storage (secure), attach auth header in `apiRequest`, fix `getApiUrl` (it force-`https`es — make scheme env-driven), rebuild `NavigationGuard` on real session, add a country/currency provider, delete mocked auth logic.

**Scenarios:** duplicate email; wrong password lockout/backoff; expired/replayed/invalid OTP; resend throttle; refresh-token expiry & rotation reuse detection; logout invalidates refresh; deep-link while unauthenticated; token present but user deleted; **registration in Jordan vs KSA picks the right currency/locale/timezone; switching country changes displayed currency + directory scope.**

**DoD:** a real account can register → verify (email OTP) → login → stay logged in across reload → refresh silently → logout. No "any password / any OTP" anywhere. **Jordan and KSA both work; a third country can be added by inserting one row.**

---

## Phase 1 — Identity & Profile

**Model:** `users` (extend the stub: name, username unique, email, phone, type athlete|coach, avatar_url, height/weight/age/gender, goal, bio, rank, **country_id (FK), language, theme**, timestamps), `coach_profiles` (specialty[], years, certifications[], verification_status). Country comes from the P0 `countries` table.

**API:** get/update me; get public profile by id/username; avatar upload (defer actual upload to Phase 4 media, use URL until then); coach-profile CRUD; username availability.

**Client:** `app-context` user hydrates from `/me` not AsyncStorage-only (keep AsyncStorage as cache); wire `onboarding`, `profile` (edit + achievements buttons go live), `user-profile/[id]` off mock `users`.

**Scenarios:** username collision; profile completeness gating; coach pending verification can't list services yet; rank derived server-side from real workout count; language/theme persist per account.

**DoD:** real profiles, editable, viewable across users; `mock-data.users` deleted.

---

## Phase 2 — Workouts

Most-built client feature; mostly needs persistence + sync + dedup of the two models.

**Model:** `exercises` (seed the static library as real rows + user `is_custom`), `workout_templates` + `template_exercises` + `set_configs`, `workout_logs` + `log_exercises` + `log_sets`, `active_sessions` (server-side resumable).

**API:** exercise library (search/filter); template CRUD; log create/list/get/delete; active-session save/resume; progress query (vs previous same-name).

**Client:** wire `prepare-workout`, `live-workout`, `workout-logger`, `workout-summary`, `workout-detail`, `saved-workouts` to API. **Reconcile the duplicate `Workout` vs `WorkoutLog` models into one.** Keep keep-alive auto-save hitting the server. Workout `aiInsight` stays the local heuristic (real AI deferred to its phase).

**Scenarios:** offline during a live session → reconcile on reconnect; concurrent edits on two devices; delete template referenced by logs (keep logs); EMOM/hold timer correctness; volume/streak/weekly computed server-side and matching client; large history pagination.

**DoD:** workouts persist per account, sync across devices, history is real; `share-workout`'s "Save to Gallery" implemented (real image export) — "Post to Community" wired in Phase 4.

---

## Phase 3 — Nutrition

**Model:** `foods` (seed `foodDatabase` as rows; add serving sizes), `nutrition_days` + `meals` + `meal_items`, `inbody_tests`, per-user `nutrition_targets`.

**API:** food search; add/remove meal item; get day (any date, not just today); targets get/recalc; InBody CRUD.

**Client:** wire `(tabs)/nutrition`, `meal-logger`, InBody tab. Add **multi-day history** (currently today-only — a 🔴 gap). Targets recompute from profile server-side. Fix the hardcoded-English "Meals" header (i18n).

**Scenarios:** serving-size math; editing/removing a logged item; day rollover/timezone **per the user's country (Jordan = Asia/Amman, KSA = Asia/Riyadh) — never hardcode one zone**; target recalculation when weight/goal change; InBody delta vs previous.

**DoD:** real food logging with history; `mock-data.foodDatabase` deleted.

---

## Phase 4 — Social / Community  *(introduces media storage)*

Turns the "mirage" social layer real and multi-user.

**Model:** `posts` (type text/image/video/workout_share, community, body, media refs, workout_log ref), `comments`, `likes` (post + comment), `follows`, `communities` (seed real), media via object storage.

**API:** feed (by community, paginated, follow-aware); post create (incl. share-a-workout); like/unlike; comment CRUD; follow/unfollow; signed media upload.

**Client:** wire `(tabs)/index`, `community/[id]`, `comments/[postId]`, `user-profile` posts/follow; implement the **create-post FAB** (currently dead), **share/post** buttons, real **comment persistence** (currently session-only). Likes/follows become real + server-counted.

**Scenarios:** pagination + new-post insertion; optimistic like/comment with rollback; follow affects feed; delete own post/comment cascade; media upload failure/retry; report/block (basic moderation — decide scope); empty-community states.

**DoD:** posts/likes/comments/follows are real and shared between users; `mock-data.posts` deleted.

---

## Phase 5 — Discovery & Directories (read side)

Listings real; transactions still deferred to 6–8.

**Model:** `gyms`, `coaches` (link to coach_profiles), `restaurants` + `menu_items`, `tournaments`, geo coords, ratings, `reviews` (shared by coaches/gyms). **Every listing has a `country_id`; prices are `Money {amount, currency}` in that country's currency.**

**API:** list/search/filter by sport/distance **scoped to the selected country**; detail; reviews list/create; map data feed. Seed real Jordan (Amman) listings as the launch set; KSA can follow.

**Client:** wire `(tabs)/events`, `coach-profile`, `gym-profile`, `restaurant-profile`, `map` data off mock. Reviews go live. Phone-call buttons already work. **Booking/Subscribe/Order/Register stay disabled** with honest "coming soon" until their phase.

**Scenarios:** real distance from user location; search ranking; review only after interaction (later tightened); unverified coaches hidden.

**DoD:** directories are real, searchable, reviewable; `mock-data` gyms/coaches/restaurants/tournaments deleted.

---

## Phase 6 — Coach Marketplace logic *(no money yet)*

**Model:** `coach_services` (session types, price SAR, duration), `courses` + `enrollments`, `bookings` (state machine: requested → confirmed → completed/cancelled/no-show), `availability`.

**API:** list services/courses; request booking; coach confirm/decline; cancel; enroll in course; booking history both sides.

**Client:** "Book Session" goes live as a **reservation request** (no payment yet); course "enroll" creates an unpaid enrollment; add a minimal **coach-side surface** to accept/decline (closes the coach dead-end). 

**Scenarios:** double-booking/availability conflict; cancellation windows; no-show; coach verification required to offer paid services; timezone on slots.

**DoD:** full booking lifecycle works without payment; payment capture slots into Phase 8.

---

## Phase 7 — Gym Memberships & Restaurant Orders logic *(no money yet)*

**Model:** `gym_plans`, `memberships` (active/expired/cancelled), `gym_events` + `event_registrations`, `orders` + `order_items` (cart, status pending→… ), `tournament_registrations`.

**API:** subscribe (creates pending membership); join event; place order; register for tournament; status/history.

**Client:** "Subscribe"/"Join Now"/"Order Now"/"Register" go live as **pending records**; carts for restaurants; event/tournament join real.

**Scenarios:** plan upgrade/downgrade/expiry; membership already active; order modification before confirm; tournament capacity/levels; event full.

**DoD:** all these buttons create real records; money still pending Phase 8.

---

## Phase 8 — Payments *(cross-cutting; makes 6 & 7 transactional)*

**Build:** integrate Saudi PSP; `payments` + `transactions`; attach to bookings, enrollments, memberships, orders, tournament entries; refunds; receipts; webhook reconciliation.

**Scenarios:** payment success/failure/timeout; webhook idempotency; partial refund; **multi-currency — charge in the listing's country currency (JOD primary, SAR, …), not a fixed one**; failed payment reverts the pending record from Phase 6/7; payout/settlement to coaches/gyms (decide scope or defer).

**DoD:** the monetization buttons actually charge; pending records from 6/7 settle.

---

## Deferred to later phases (intentionally stopped for now)

These are **explicitly out of the initial roadmap** — revisit after the above closes:

| Feature | Why deferred | Interim |
|---|---|---|
| **Real AI Coach (LLM)** | Differentiator, not core to "make it real"; needs LLM infra + cost model. | Keep current heuristic insights; label honestly. |
| **Find-a-partner real-time matching** | Needs presence/real-time infra (sockets, geo, notifications). | Keep screen disabled or static until then. |
| **Push notifications** | Depends on bookings/social being real first. | — |
| **Interactive web map** | Mobile map is real; web list fallback is acceptable. | Keep list fallback. |
| **Coach analytics / rich coach dashboard** | Minimal accept/decline ships in Phase 6; full tooling later. | Phase 6 minimal surface. |
| **Advanced moderation/anti-abuse** | Basic report/block in Phase 4; full system later. | Basic only. |
| **Multi-day nutrition analytics, barcode scan** | Core logging ships in Phase 3; extras later. | — |

---

## Sequence at a glance

```
P0 Foundation (auth+API+DB)  ── enables everything
   └─ P1 Identity/Profile
        └─ P2 Workouts
        └─ P3 Nutrition
        └─ P4 Social (+media)
             └─ P5 Discovery/Directories (read)
                  └─ P6 Coach bookings (no $)
                  └─ P7 Memberships/Orders (no $)
                       └─ P8 Payments (turns 6+7 transactional)
Deferred: AI Coach · realtime partner · push · web map · coach analytics
```

P1–P3 can run after P0 in any order (independent user-owned data). P5 needs P1.
P6/P7 need P5. P8 needs P6/P7. Social (P4) needs media storage introduced there.
