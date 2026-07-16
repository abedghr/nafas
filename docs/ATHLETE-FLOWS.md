# Athlete User — Complete Flows & Cases

Status of every flow available to an **athlete** account (`role: "athlete"`), from
account creation to deletion. This is the closed scope: everything an athlete can
do is real (server-backed), verified, and bilingual (EN/AR). Coach-only surfaces
are explicitly out of scope and gated off (see §9).

**Verification:** 37 automated API tests (`scripts`/scratchpad `test-athlete.mjs`)
cover the full flow end-to-end — all passing — plus visual checks of Profile,
Nutrition, Meal-logger, and Edit-Profile. Last run: 37 passed / 0 failed.

Legend: ✅ working & verified · 🔶 works, minor known gap · ⛔ intentionally not available to athletes.

---

## 1. Authentication

### 1.1 Register (athlete) ✅
- Screen: `app/auth/register.tsx` → `app/auth/index.tsx` (welcome).
- Collects: name, email, password, confirm-password, country. Username is auto-generated from the name. Role defaults to **athlete** (the "I'm a coach" toggle flips it to coach — coach path is out of scope).
- `POST /api/auth/register` → creates user (`status: active`, `emailVerifiedAt: null`, `profileComplete: false`), sends a 6-digit OTP.
- **Dev note:** with no SMTP configured the OTP is printed to the server log (`[mailer:dev] verify OTP for <email>: <code>`), not emailed.
- Edge cases: duplicate email → 409; weak/short password → 422.

### 1.2 Verify email (OTP) ✅
- Screen: `app/auth/verify-otp.tsx`. 6-digit entry, 60-second resend timer.
- `POST /api/auth/otp/verify` → returns `{ accessToken, refreshToken, user }` and sets `emailVerifiedAt`.
- Routes to `/onboarding` when `profileComplete === false`, else to the tabs.
- Edge cases: wrong code, expired code (10-min TTL), 5-attempt lockout, resend within 60s blocked.

### 1.3 Login ✅
- Screen: `app/auth/login.tsx`.
- `POST /api/auth/login` → tokens. Wrong password → 401. Unverified email → server signals `EMAIL_NOT_VERIFIED`; the app re-sends OTP and routes to verify. Suspended account → blocked.

### 1.4 Forgot / reset password ✅
- Screen: `app/auth/forgot-password.tsx`.
- `POST /api/auth/password/forgot` (sends reset OTP) → `POST /api/auth/password/reset` (code + new password).

### 1.5 Session & token refresh ✅
- Access + refresh JWTs stored in AsyncStorage. `apiFetch` transparently refreshes on 401 (single-flight) via `POST /api/auth/refresh` (rotating refresh tokens, reuse-detection).
- On boot the app calls `GET /api/me` and treats the server as the source of truth for the user profile.

### 1.6 Logout ✅ (now revokes server-side)
- `POST /api/auth/logout` revokes the refresh token **before** local tokens are cleared, then all local state/AsyncStorage is wiped. A revoked refresh token can no longer be exchanged (verified: 401 on reuse).

### 1.7 Auto-logout on expired/invalid session ✅
- `apiFetch` (`src/lib/api.ts`) fires a global `onAuthExpired` hook when an authed request `401`s and the refresh token is also dead (refresh returns nothing, or a freshly-refreshed token is still rejected). `app-context` registers a handler that clears local state and routes to `/auth`.
- A valid access token that merely expired is transparently refreshed and the request retried — no logout. Only a genuinely unrecoverable session (access **and** refresh dead/invalid) logs the user out.
- A burst of parallel 401s is debounced to a single logout (3s window), so the user isn't bounced repeatedly.

---

## 2. Onboarding / Complete signup ✅
- Screen: `app/onboarding.tsx` — 3 steps: (1) height/weight/age/gender, (2) sport interests, (3) goal.
- `PATCH /api/me` with the collected data + `profileComplete: true`.
- Gate: `NavigationGuard` in `app/_layout.tsx` soft-nudges an authenticated user with `profileComplete === false` to `/onboarding` once per launch; `CompleteProfileBanner` keeps prompting on the profile screen until complete.
- "Later"/Skip is allowed — profile stays incomplete, banner persists.

---

## 3. Profile (view) ✅
- Screen: `app/(tabs)/profile.tsx`.
- Shows: avatar (initial), name, `@username`, **user-type badge ("Athlete", green, barbell icon)**, rank badge, **bio** (when set), lifetime stats (workouts / volume / streak), physical stats (height/weight/age/goal), interest tags.
- Settings: dark-mode toggle, language toggle (EN/AR), edit profile, logout, **delete account**.
- The dead "Achievements" row was removed (no feature behind it).

---

## 4. Edit profile & account ✅
- Screen: `app/edit-profile.tsx`, two sections:
  - **Account:** full name, **username** (with `@`, availability enforced server-side), **email**.
  - **Body stats:** height, weight, age, gender, goal, interests, bio.
- All persist via `PATCH /api/me` → server is source of truth; local state re-hydrated from the response.
- Edge cases (verified): username taken → 409 + inline alert; email already in use → 409 + inline alert; username < 3 chars or invalid email → client-side guard before submit.
- Inputs are hoisted components (no per-keystroke focus loss).
- 🔶 **Email change** currently applies directly while authenticated (prototype). Re-verification (reset `emailVerifiedAt` + new OTP) is the productionization step — noted in code with a `ponytail:` marker.
- 🔶 **Avatar upload** is not wired (server accepts `avatarUrl`; no picker yet). Avatar shows the name initial.

---

## 5. Workout ✅

### 5.1 Prepare a workout
- Screen: `app/prepare-workout.tsx`. Must pick a **training type** before adding exercises or starting (gated with a prompt). Add exercises, **drag to reorder** (long-press handle), load from a saved template. Start uses `router.replace` so Back can't return to the "new workout" page mid-session.

### 5.2 Live session
- Screen: `app/live-workout.tsx`. Session persists server-side (`PUT/GET/DELETE /api/active-session`) so it survives reload.
- Per-set inline logging (reps/kg, hold, EMOM), one-tap ✓ done / ✕ skip. **Skip asks for confirmation.** Responsive 2-line set row on narrow screens.
- **Per-set notes: multi-line**, expandable editor with a done affordance; collapsed preview shows up to 3 lines.
- Rest timer (−15/+15, skip, progress bar), reorder exercises via the exercise menu.

### 5.3 Summary & save
- Screen: `app/workout-summary.tsx`. `POST /api/workout-logs` saves the completed log. "Save as template" is hidden when unchanged / already saved. Templates de-duplicate by canonical content and auto-suffix same-name (`Pull Day` → `Pull Day 2`).

### 5.4 History & detail ✅ (notes fix)
- History list + `app/workout-detail/[id].tsx`. Shows stats, per-exercise sets (planned vs actual, status), **per-set notes now rendered** (italic, under each set — this was the reported bug, fixed & verified), AI insight, and progress-vs-last-time comparison (`GET /api/workout-logs/{id}/progress`).
- Use as template, share, delete (`DELETE /api/workout-logs/{id}`).

---

## 6. Nutrition ✅

### 6.1 Daily intake & macros ✅
- Screen: `app/(tabs)/nutrition.tsx`. Calorie ring vs target, protein/carbs/fat bars.
- Macro colors are centralized in `constants/colors.ts` (`Colors.macro`). Calorie-% guarded against divide-by-zero.

### 6.2 Food search ✅
- Screen: `app/meal-logger.tsx`. `GET /api/foods` — **239 foods** (Levantine/Jordanian dishes + an athlete-staples set: whey/casein/mass-gainer, protein bars, rice cakes, oats, sweet potato, salmon, egg whites, creatine, BCAA, electrolytes, chicken-&-rice bowl, dates, banana, …).
- Search is **cross-locale** (an Arabic query finds Arabic-named foods even in an EN UI, verified) and filterable by meal-type tag (breakfast/lunch/dinner/snack/drink/dessert/pre_workout/post_workout).

### 6.3 Log food with servings ✅ (new)
- Tapping a food opens a **serving selector sheet**: a ½-step quantity stepper with **live-computed macros/calories** and an "Add to Log" button.
- `POST /api/nutrition/days/:date/items` with `quantity`. Server stores base macros × `quantity` and recomputes day totals. Client totals now multiply by quantity too (was a latent under-count once quantity > 1).

### 6.4 Edit the log ✅ (new)
- Each logged item shows `×N` when quantity ≠ 1 and a **remove (✕) control** → `DELETE /api/nutrition/days/:date/items` → totals update.

### 6.5 Targets ✅
- Screen: `app/nutrition-targets.tsx`. Pick a goal (cut/maintain/bulk) → `GET /api/nutrition/targets/recommend` prefills macros (tied to profile weight/goal) → editable → `POST /api/nutrition/targets`. **Save shows a confirmation** ("Targets updated") before closing.

### 6.6 InBody ✅
- Component: `components/InBodySection.tsx` (InBody tab). Add/list body-composition tests (`/api/inbody`), latest results, deltas, trend insight.

---

## 7. Delete account ✅ (new, was missing)
- Entry: Profile → "Delete Account" (subtle, below logout) → destructive confirm alert.
- `DELETE /api/me` → removes the user and all owned data (workout logs/templates/active session, nutrition days/targets/InBody, refresh tokens, coach profile) via FK cascade; the non-cascading `workout_types` rows are cleared explicitly first.
- After deletion: local session cleared → routed to `/auth`; login with the old credentials fails (verified).

---

## 8. Internationalization & RTL ✅
- All athlete-facing strings added in this work exist in EN + AR (`lib/i18n.ts`, `lib/i18n-extra.ts`): profile type badge, delete-account, account/username/email/body-stats + validation messages, nutrition servings/remove/targets-updated.
- Nutrition units (`kcal`, `g`) and macro labels are i18n'd (previously hardcoded in a couple of spots).

---

## 9. Athlete-only gating ⛔ (what athletes cannot do)
- Athletes never see coach surfaces: the "My Coaching" section renders only when `user.type === 'coach'`. Gym-owner / event-organizer sections appear only when the API reports ownership (an athlete owns none).
- Server enforces `requireRole('coach')` on `POST /api/coach-profile`; admin routes require `admin`.
- The tab bar (Workout, Nutrition, Profile + flagged Communities/Discover) is identical for all users by design; role-specific tools live behind the gated profile links.
- 🔶 Coach-only stack screens (`coaching`, `manage-*`, `gym-leads`) have no per-route role guard yet — an athlete deep-linking gets empty data (APIs return nothing for non-owners). Hardening these is part of the coach scope, next.

---

## 10. Endpoint inventory (athlete)

| Area | Endpoint | Used by |
|---|---|---|
| Auth | `POST /auth/register` · `/auth/otp/verify` · `/auth/otp/request` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/password/forgot` · `/auth/password/reset` | auth screens |
| Identity | `GET /me` · `PATCH /me` (name, username, **email**, bio, body stats, goal, interests, profileComplete) · **`DELETE /me`** · `GET /users/username-available` | onboarding, profile, edit |
| Workout | `GET/POST /workout-logs` · `GET /workout-logs/{id}` · `GET /workout-logs/{id}/progress` · `DELETE /workout-logs/{id}` · templates · `GET/PUT/DELETE /active-session` | workout flow |
| Nutrition | `GET /foods` · `GET/POST /nutrition/days/:date/items` · `DELETE …/items` · `GET/POST /nutrition/targets` · `GET /nutrition/targets/recommend` · `GET/POST /inbody` | nutrition flow |

New this cycle: `DELETE /api/me`, `email` on `PATCH /api/me`.

---

## 11. Known limitations / next
- Avatar upload (server-ready, no picker).
- Email change re-verification (prototype applies directly).
- Per-route role guards on coach screens (coach scope).
- Payments remain deferred to Phase 8 — no athlete flow charges money.
- Coach flow (registration extras → `POST /coach-profile`, verification, marketplace) is the next scope after athlete closure.
