# Nafas — Test Scenarios by User Type

Full manual-test checklist for every role and every feature built so far
(Phases 1–2). Use it to walk each flow end-to-end and confirm the loop closes
on all **3 surfaces**: **API** (Swagger `/docs` or curl), **Admin** dashboard,
**Mobile** app.

Legend: ⬜ = to test · ✅ = passes · ❌ = fails/gap · 💳 = must stay
payment-free until P8 (button records interest/pending only, never charges).

---

## 0. Setup

```bash
npm run db:up
PORT=5001 NODE_ENV=development npx tsx server/index.ts          # API :5001, Swagger /docs
cd admin && npm run dev                                          # Admin :5174
EXPO_PUBLIC_DOMAIN=localhost:5001 npx expo start --web --port 8081   # Mobile :8081
```

### Seed data
```bash
npm run seed:workout && npm run seed:i18n && npm run seed:nutrition \
  && npm run seed:gyms && npm run seed:coaches && npm run seed:events
```

### Test credentials
| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@nafas.app` | `admin12345` | full admin panel |
| Coach | `khalid@nafas.app` | `pass1234` | verified coach · **owns** Gold's / Body Master (demo) · event organizer |
| Coach | `fatima@nafas.app` | `pass1234` | verified coach, on Gold's Gym |
| Coach | `omar@nafas.app` | `pass1234` | verified coach |
| Athlete | `sami@test.com` | `pass1234` | verified athlete |
| Athlete | `sara@nafas.app` | `pass1234` | athlete · gym **manager** of Body Master (team) |

> New sign-ups need an email OTP. Dev logs it: `[mailer:dev] verify OTP for … : 123456` in the API console. Enter that code.

### The 3-surface rule
A feature is **not done** until verified on API + Admin + Mobile. Each scenario
below tags the surface(s) it touches.

---

## Roles overview

| Role | How you become it | What they can do |
|---|---|---|
| **Athlete** | default on sign-up | workouts, nutrition, discover, join gyms/classes/events, book coaches, review gyms |
| **Coach** | `role=coach` (self-register as coach / admin sets) | everything an athlete does + coach profile, PT plans, before/after, leads, class & event-session approvals |
| **Gym Owner** | `gyms.ownerId = user` (admin assigns) | manage own gym, membership leads, team, gym classes, gym events |
| **Gym Manager** | owner adds them to the gym **team** | edit the gym + its classes/events from mobile (NOT team management) |
| **Event Organizer** | `events.ownerId = user` OR manages the host gym | create/edit events, event sessions, confirm registrations |
| **Admin** | seeded / `role=admin` | full CRUD across every domain + moderation |

---

## 1. Athlete

### 1.1 Auth & Identity
- ⬜ Register (email+password+username+country) → OTP screen → enter dev OTP → lands in app. *(API, Mobile)*
- ⬜ Register with an existing email → `EMAIL_TAKEN` 409. *(API)*
- ⬜ Login valid → tokens + `/me` hydrates, tab bar greets DB name. *(API, Mobile)*
- ⬜ Login wrong password → `INVALID_CREDENTIALS`. *(API)*
- ⬜ Login before verifying → `EMAIL_NOT_VERIFIED` 403. *(API)*
- ⬜ Access token expires → silent refresh on 401 (single-flight). *(Mobile)*
- ⬜ Refresh reuse / rotation → reused refresh token detected & revoked. *(API)*
- ⬜ Logout → tokens cleared, NavigationGuard bounces to `/auth`. *(Mobile)*
- ⬜ Forgot password → OTP → reset → login with new password. *(API, Mobile)*

### 1.1b Profile completion (nudged, not forced)
- ⬜ After OTP verify (and on every app open while incomplete), user is **redirected once** to the completion flow — NOT hard-locked. *(Mobile)*
- ⬜ Onboarding steps: Physical (height/weight/age/gender) → Interests → Goals. *(Mobile)*
- ⬜ Finish → **persists to server** via `PATCH /api/me` (height/weight/age/gender/goal/interests/profileComplete=true), not just local. *(API, Mobile)*
- ⬜ **Later** (was "Skip") → enters the app WITHOUT completing; `profileComplete` stays false so the nudge persists. *(Mobile)*
- ⬜ A **Complete your profile** banner shows on Workout + Profile tabs while incomplete → tapping opens the completion flow. *(Mobile)*
- ⬜ Next app open while still incomplete → redirected once again to complete it (banner always available in between). *(Mobile)*
- ⬜ After completion → banner gone; re-login goes straight to tabs (guard reads `profileComplete` from `/me`). *(Mobile)*
- ⬜ Nutrition targets now derive from the **saved** weight+goal (e.g. 85kg build_muscle → ~2805 kcal / 187g protein), not the 75kg default. *(API, Mobile)*
- ⬜ Profile tab shows **My Profile** card (height/weight/age/goal) + interests; **Edit Profile** link. *(Mobile)*
- ⬜ Edit Profile screen: prefilled from server, edit any field + bio → Save → `PATCH /me` → profile reflects. *(API, Mobile)*
- ⬜ Interests round-trip: selected in onboarding/edit → stored in `users.interests` → shown on profile after reload. *(API, Mobile)*

### 1.2 Workout
- ⬜ Exercise library loads (104 exercises, 15 types) from API, not mock. *(Mobile)*
- ⬜ Prepare workout: pick type, add exercises, set config (reps / time-hold / distance; EMOM with optional weight; per-set note). *(Mobile)*
- ⬜ Start session → live workout → complete → summary (no "not found"). *(Mobile)*
- ⬜ Workout log persists to server; totalVolumeKg is a number (no string garbage). *(API, Mobile)*
- ⬜ Save template → shows "Saved" (disabled); saving the same content twice is blocked (dedup by signature). *(Mobile)*
- ⬜ Reuse saved template → prefilled prepare screen → start. *(Mobile)*
- ⬜ Pre-workout toggle set before "Begin", read-only badge in live workout. *(Mobile)*
- ⬜ Workout detail shows planned vs actual (incl. EMOM). *(Mobile)*
- ⬜ AI insights / weekly plan / recommendations render (server heuristic). *(Mobile)*

### 1.3 Nutrition
- ⬜ Targets auto-computed from weight/goal on first load. *(API, Mobile)*
- ⬜ Edit targets: pick goal (cut/maintain/bulk) → recommended prefill → edit → save. *(Mobile)*
- ⬜ Meal logger: search food (debounced), filter by meal type (chip row defaults to opened slot), add item → optimistic + persists. *(Mobile)*
- ⬜ Cross-language food search: Arabic query in EN UI (and vice-versa) returns results. *(API, Mobile)*
- ⬜ Logged item names follow language switch (snapshot + foodNames map). *(Mobile)*
- ⬜ Remove meal item → day totals recompute. *(Mobile)*
- ⬜ Macros/calories rounded (no `15.799999`). *(Mobile)*
- ⬜ InBody: add test (nutrition tab segment) → persists → history list. *(API, Mobile)*
- ⬜ "No food found" honest states: loading / error+Retry / empty (localized). *(Mobile)*

### 1.4 Discover (directories)
- ⬜ Discover tab shows segments **Gyms · Coaches · Events** (Restaurants hidden by flag). *(Mobile)*
- ⬜ Gym list: search, cards (logo/city/types/From-price/rating). *(Mobile)*
- ⬜ Coach list: cards (avatar/headline/specialty/price/rating). *(Mobile)*
- ⬜ Event list: cards (trophy/city+date/tags/type). *(Mobile)*
- ⬜ Empty + loading states localized. *(Mobile)*

### 1.5 Gyms (as member)
- ⬜ Gym profile: cover/logo, Directions (opens map), Info + Schedule tabs. *(Mobile)*
- ⬜ 💳 Join / Subscribe → **pending request** (no payment); button → "Requested". *(API, Mobile)*
- ⬜ My Gyms screen: Active / Pending badges. *(Mobile)*
- ⬜ After owner approves → membership becomes Active; profile button shows "Member". *(Mobile)*
- ⬜ Facilities grid (localized icon/title/description). *(Mobile)*
- ⬜ Coaches grid on gym → tap → coach profile; head coach shows green **Head Coach** badge. *(Mobile)*
- ⬜ Gym **Classes** section: Join → Pending → (coach approves) Enrolled; Full state when capacity reached. *(API, Mobile)*
- ⬜ Gym **Events** section: lists host-gym events → tap → event profile. *(Mobile)*
- ⬜ **Reviews**: write/edit own (star picker + comment), "You" tag, gym rating auto-updates, count shown. *(API, Mobile)*

### 1.6 Coaches (marketplace)
- ⬜ Coach profile: hero (avatar, verified check, gymName), Call + WhatsApp buttons. *(Mobile)*
- ⬜ Info tab: bio, certifications, PT **plans** cards; per-plan **I'm Interested** → lead to coach. *(API, Mobile)*
- ⬜ Results tab: before/after cards (2 images + arrow + target/duration/client). *(Mobile)*
- ⬜ 💳 Book a Session → interest lead (no payment). *(API, Mobile)*

### 1.7 Events / Tournaments
- ⬜ Event profile: type/category badges, date range, venue+Directions, registeredCount, tags, description. *(Mobile)*
- ⬜ 💳 Register → **pending** (Confirmed/Pending/Full states). *(API, Mobile)*
- ⬜ **Schedule** section = event sessions (classes) with Join flow (same as gym classes). *(API, Mobile)*
- ⬜ My Events: registrations with status. *(Mobile)*

### 1.8 i18n / RTL (athlete)
- ⬜ Switch EN→AR: whole app flips to RTL instantly, content refetched localized. *(Mobile)*
- ⬜ Every athlete screen has no hardcoded English left (spot-check). *(Mobile)*

---

## 2. Coach

Coach = athlete + the following. Login `khalid@nafas.app`.

### 2.1 Becoming / profile
- ⬜ Profile tab shows a **My Coaching** entry (only when `user.type==='coach'`). *(Mobile)*
- ⬜ Coach public profile reflects admin edits (headline/bio/specialty/certs/price/cover/featured/verification). *(Admin, Mobile)*

### 2.2 PT plans (self-service, mobile)
- ⬜ Coaching → **Plans** tab: add plan (name, includes[], duration, price {amount,currency}). *(Mobile)*
- ⬜ Edit plan / delete plan. *(API, Mobile)*
- ⬜ Plan appears on public coach profile with "I'm Interested". *(Mobile)*
- ⬜ Currency is per-plan (JOD default) — never hardcoded SAR. *(API)*

### 2.3 Before/After (self-service)
- ⬜ Coaching → **Results** tab: add transformation — pick before + after image (upload via `/api/uploads`), duration, target, client name. *(API, Mobile)*
- ⬜ Edit / delete transformation. *(Mobile)*
- ⬜ Shows on coach profile Results tab (3:4 images + arrow). *(Mobile)*

### 2.4 Leads inbox (interest, no payment)
- ⬜ Coaching → **Leads (n)** tab: incoming "I'm Interested" leads with client name + interested plan. *(API, Mobile)*
- ⬜ Call / WhatsApp the client. *(Mobile)*
- ⬜ Mark contacted / closed → status updates. *(API, Mobile)*

### 2.5 Class approval inbox
- ⬜ Coaching → **Classes (n)** tab: pending join requests for classes I coach (gym **and** event sessions both appear). *(API, Mobile)*
- ⬜ Approve → enrolled + 30-day expiry set; Reject → rejected. *(API, Mobile)*
- ⬜ Call the requester. *(Mobile)*
- ⬜ Enrolled count on the class increments after approve. *(API, Mobile)*

### 2.6 Coach-as-gym-manager
- ⬜ If added to a gym team, coach can manage that gym + its events (see §4). *(Mobile)*

---

## 3. Gym Owner

`gyms.ownerId = me`. (Demo: Khalid owns Body Master.)

### 3.1 Discovery of the role
- ⬜ Profile tab shows **My Gym** section when `ownedGyms().length>0`. *(Mobile)*
- ⬜ Gym Leads + Manage Gym entries visible. *(Mobile)*

### 3.2 Membership leads
- ⬜ Gym Leads screen: interested members across owned gyms + contact. *(API, Mobile)*
- ⬜ Approve → creates Active membership (idempotent); Reject. *(API, Mobile)*
- ⬜ Call / WhatsApp the member. *(Mobile)*

### 3.3 Team management (owner only)
- ⬜ Manage Gym → gym → **Team**: owner (badge) + managers list. *(API, Mobile)*
- ⬜ Add manager **by email** → appears as manager. *(API, Mobile)*
- ⬜ Add non-existent email → "No user found" error. *(Mobile)*
- ⬜ Remove manager. *(API, Mobile)*
- ⬜ A manager attempting team mgmt → **403** (owner-only). *(API)*

### 3.4 Gym self-edit
- ⬜ Manage Gym → edit description / phone / whatsapp / working hours → persists, visible in admin + public profile. *(API, Admin, Mobile)*
- ⬜ Whitelisted fields only (can't set rating/ownerId via manage endpoint). *(API)*

### 3.5 Gym classes (via admin today; owner sees on profile)
- ⬜ Class created (admin or event) shows in gym profile with Join. *(Admin, Mobile)*
- ⬜ Head coach assignment reflected as badge. *(Admin, Mobile)*

### 3.6 Gym events
- ⬜ Owner creates an event for the gym via **Manage Events** (host-gym chip). *(Mobile)*
- ⬜ Event shows in gym profile Events + global Discover. *(Mobile)*
- ⬜ Event registrations inbox (see §5). *(Mobile)*

---

## 4. Gym Manager (team member)

Owner added me to a gym team. (Demo: Sara manages Body Master.) Login `sara@nafas.app`.

- ⬜ Profile → My Gym section appears via `managed().length>0` (isOwner=false). *(Mobile)*
- ⬜ Manage Gym list shows the gym with **Manager** chip. *(Mobile)*
- ⬜ Edit gym description/phone/whatsapp/hours → persists (visible to owner + admin). *(API, Mobile)*
- ⬜ **Cannot** add/remove team members → team block hidden / 403. *(Mobile, API)*
- ⬜ Manage Events: can create/edit events **for that gym** (canManageGym). *(API, Mobile)*
- ⬜ Cannot manage a gym I'm not on the team of → 403. *(API)*

---

## 5. Event Organizer

`events.ownerId = me` OR I manage the host gym.

- ⬜ Profile → **Manage Events** + **Event Registrations** appear when `organizesEvents` (owned OR gym-managed). *(Mobile)*
- ⬜ Manage Events: create (name, type chips tournament/event/challenge, host-gym chips from managed gyms, venue, startsAt, capacity, description). *(API, Mobile)*
- ⬜ Standalone event (no gym) + gym-linked event both listed. *(Mobile)*
- ⬜ Edit / delete a managed event. *(API, Mobile)*
- ⬜ Create event attached to a gym I don't manage → **403**. *(API)*
- ⬜ Event sessions (classes) created (admin or …) show on event profile Schedule. *(Mobile)*
- ⬜ **Event Registrations** inbox: registrants + note + contact; Confirm → registeredCount recompute; Reject. *(API, Mobile)*
- ⬜ Non-manager updating a registration → 403. *(API)*

---

## 6. Admin

Login `admin@nafas.app`. Admin panel :5174. Verify EN/AR toggle flips chrome + RTL.

### 6.1 Identity & config
- ⬜ Users: list, change role, suspend/activate. *(Admin)*
- ⬜ Countries: CRUD (Jordan primary, KSA). *(Admin)*
- ⬜ Localization: manage label groups (measurement_type/set_type/body_target/meal_type). *(Admin)*

### 6.2 Workout / Nutrition
- ⬜ Exercises: full CRUD (name/desc/measurement/body-targets summing 100 + workout-type links) + EN/AR. *(Admin, API)*
- ⬜ Body-target sum ≠ 100 → Save disabled + server 422. *(Admin, API)*
- ⬜ Foods: CRUD, macros modal, meal-type chips, EN/AR (215 seeded). *(Admin)*

### 6.3 Gyms
- ⬜ Gyms: list + status toggle; sectioned modal (Basics EN/AR · Media logo+cover upload · Location MapPicker · Details · Subscriptions · Owner · Active · Weekly schedule editor). *(Admin)*
- ⬜ Gym profile page: quick actions (activate/deactivate/edit/delete), facilities view→edit→save, head-coach selector. *(Admin)*
- ⬜ **Classes** section: add/edit/delete (coach selector, day/time/duration/capacity, AR title). *(Admin, API)*
- ⬜ **Team** section: owner+managers, add-by-user, remove. *(Admin, API)*
- ⬜ **Reviews** section: list + moderation delete → rating recompute. *(Admin, API)*
- ⬜ Membership Requests tab: approve/reject → membership. *(Admin, API)*
- ⬜ Facilities catalog page: CRUD + logo + EN/AR. *(Admin)*

### 6.4 Coaches
- ⬜ Coaches: list + verify toggle + edit modal (headline/bio/specialty/certs/price/rating/cover/featured/verification/whatsapp/gym selector). *(Admin)*
- ⬜ Bookings tab. *(Admin)*
- ⬜ Coach profile page: verify/feature quick actions, certifications, recent bookings. *(Admin)*

### 6.5 Events
- ⬜ Events: list + active toggle; **Events | Registrations** tabs. *(Admin)*
- ⬜ Sectioned modal: Basics EN/AR · Media · Schedule (datetime, capacity, status) · Location MapPicker · Details (tags, **host-gym selector**, organizer) · **Sessions/Schedule** (event classes editor when editing). *(Admin, API)*
- ⬜ Registrations tab: confirm/reject → recompute. *(Admin, API)*

### 6.6 Restaurants (hidden but built)
- ⬜ Route/page exist; nav commented out. Re-enable flag `restaurants:true` + uncomment nav to test CRUD + reservations. *(Admin)*

---

## 7. Cross-cutting invariants

### 7.1 No payments before P8 💳
- ⬜ Every join/subscribe/book/register/interest is **pending / lead** only — no charge, no payment UI, no order record beyond a request row.

### 7.2 Multi-country / Money
- ⬜ No hardcoded `SAR` / `Riyadh` / `Asia-Riyadh`. Money always `{amount,currency}`; JOD is primary. *(API, Mobile, Admin)*
- ⬜ Country filter works on gyms/events lists. *(API)*

### 7.3 i18n / RTL everywhere
- ⬜ New screens use `t()`; AR flips RTL; content localized via `x-lang` header. *(Mobile, Admin)*
- ⬜ Cross-language search (gyms/foods/exercises) matches base OR any-locale translation. *(API)*

### 7.4 Authorization
- ⬜ Athlete hitting admin route → 403. *(API)*
- ⬜ Manager hitting team/owner-only endpoints → 403. *(API)*
- ⬜ Non-coach hitting `/coaches/me/*` → empty/403 as designed. *(API)*

### 7.5 Data integrity
- ⬜ pg numeric columns arrive as numbers (driver-level). *(API)*
- ⬜ Dynamic API responses are `no-store` (no 304 blanking lists). *(API)*
- ⬜ Unique constraints hold: one review/membership/class-enrollment/event-registration per user per entity (re-submit = upsert, not duplicate). *(API)*

---

## 8. Coverage matrix (fill during testing)

| Domain | Athlete | Coach | Gym Owner | Manager | Organizer | Admin |
|---|---|---|---|---|---|---|
| Auth | ⬜ | ⬜ | — | — | — | ⬜ |
| Workout | ⬜ | ⬜ | — | — | — | ⬜ |
| Nutrition | ⬜ | ⬜ | — | — | — | ⬜ |
| Gyms (member) | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ |
| Gym classes | ⬜ | ⬜ (approve) | ⬜ | ⬜ | — | ⬜ |
| Gym team | — | ⬜ | ⬜ | ⬜ | — | ⬜ |
| Gym reviews | ⬜ | ⬜ | ⬜ | — | — | ⬜ |
| Coaches | ⬜ | ⬜ | — | — | — | ⬜ |
| Events | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Event sessions | ⬜ | ⬜ (approve) | ⬜ | ⬜ | ⬜ | ⬜ |

---

## 9. Known gaps / not-yet-built (don't test as bugs)

- Restaurants: **hidden** (flag off) — built but parked for deeper coverage.
- Phase 3: Community/Social feed, Find-a-Partner — hidden.
- Real LLM AI Coach (current = server heuristic), realtime, push, web interactive map, barcode nutrition — deferred.
- Custom-exercise create is local-only (no user-exercise POST yet).
- Discover unified aggregation/search across all directories — not built.
- Multi-day nutrition history (today-only).
- Native tab labels hardcoded English (web tabs localized).
