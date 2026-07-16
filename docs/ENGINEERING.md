# Nafas — Engineering Standards & Data Modeling

Principal-level decisions for how the backend is built. Applies to every module.

## Data modeling — normalize vs denormalize

Two deliberate shapes, chosen per access pattern:

**Relational (normalized)** — reference data that is *queried, filtered, joined, and analyzed*:
- `countries`, `users`, `coach_profiles`
- workout **library**: `workout_types`, `exercises`, `exercise_workout_types` (M:N), `exercise_body_targets` (weighted, one row per muscle)
- Why: we filter exercises by type/muscle, curate in admin, and will compute per-muscle volume analytics by joining `exercise_body_targets`. A normalized library makes those queries indexable and correct.

**Document (denormalized jsonb)** — user-owned records that are *written and read as a whole unit*:
- `workout_templates.exercises`, `workout_logs.exercises`, `active_sessions.data`
- Why: a log is an **immutable snapshot** of what happened (sets, planned vs actual, notes); a template/session is edited/loaded atomically. We never query "all sets where reps>10" — we fetch the whole document by `(userId, date)`. jsonb avoids a 3-table join (`log → log_exercises → log_sets`) on every read/write with zero analytical loss (aggregates like `totalVolumeKg`, `totalSets` are stored as **columns** for querying; detail stays in jsonb).
- Snapshot, not reference: a log stores the exercise `name`/`muscleGroup` inline so renaming/deleting a library exercise never corrupts history.

Rule of thumb used: **normalize what you query across rows; embed what you read as one object.**

## Indexing

Indexes exist for every hot path (FKs + filter/sort columns):
- `users.email`, `users.username` (unique) · `refresh_tokens.tokenHash` (every refresh), `.userId` (revoke-all) · `otp_codes (email, purpose)`
- `workout_logs (userId, date)` (history list), `(userId, name)` (progress-vs-previous)
- `exercises.name` (search/sort), `.userId` · `exercise_workout_types.workoutTypeId` (exercises-by-type reverse lookup) · `exercise_body_targets.exerciseId`
- `workout_templates.userId`
- *(Postgres seq-scans tiny tables by choice; these matter once tables grow — they're in place now so there's no retrofit.)*

## Integrity

- **Unique:** `exercise_body_targets (exerciseId, bodyTarget)` — no duplicate muscle rows.
- **FK on delete:** user-owned rows `cascade` (logs, templates, sessions, coach_profile, refresh_tokens, custom exercises); `users.countryId` `set null` (deleting a country never deletes users).
- **Business invariant:** body-target percentages must sum to 100 — enforced server-side (`_assertTargetsSum` → 422) and in the admin form.

## Numbers

Postgres `NUMERIC` returns a **string** by default → `+` concatenates. Fixed once at the driver (`pg.types.setTypeParser(1700, parseFloat)` in `core/db.ts`) so the whole API returns real numbers. Don't rely on per-call coercion.

## Pagination

- **Unbounded per-user lists are paginated** with `{ data, meta:{page,perPage,total} }`: `workout-logs`, all admin lists (`users`, `countries`, `exercises`). `perPage` capped (≤100).
- **Bounded reference lists** (`exercises` library ~100s, `countries`, `workout-types`) return the full set but with **server-side filters** (`search`, `typeId`) and a hard `LIMIT` guard (500) — never filtered in JS.

## Query practices

- **No N+1:** related data is batch-loaded with `inArray(...)` then **grouped into a `Map` (O(n))**, not `.filter` per row (O(n·m)). See `hydrateExercises`.
- **Filters in SQL, not JS:** e.g. exercises-by-type uses an `inArray` subquery over the indexed junction, not an in-memory `Set`.
- **Single-flight refresh** on the client (`src/lib/api.ts`) so concurrent 401s trigger one token refresh, not a stampede.

## Internationalization (i18n)

Two translation shapes by data type:
- **Content** (per-row text — exercise/workout-type name+description): base column = **English (canonical default + fallback)**; `*_translations(entityId, locale, name, description)` holds other locales. Resolution = LEFT JOIN on `req.locale` + `COALESCE(translation, base)`. Adding a language = insert rows, no schema change.
- **System labels** (fixed enums — measurement_type, set_type, body_target): single `labels(grp, key, locale, value)` table, unique(grp,key,locale). `GET /labels` → bundle `{grp:{key:value}}` with en fallback. Admin-managed (Localization page).
- **`languages(code, name, isActive, isDefault)`** registry; supported = active. **Locale via `x-lang` header** (→ `Accept-Language` → default `en`) set by `middleware/locale.ts` into `req.locale`. Mobile sends app language; admin sends a TopBar EN/AR toggle.
- Admin edits English + Arabic side-by-side per content field; Localization page manages all label translations across languages.
- **Mobile UI strings:** react-i18next (`lib/i18n.ts` + `lib/i18n-extra.ts` for the batch-localized screens). `setLanguage` (app-context) persists the lang, calls `i18n.changeLanguage`, applies **RTL/LTR direction app-wide** (`applyDirection`: web `document.dir`, native `I18nManager.forceRTL`), and re-fetches localized content. All Phase-1 screens use `t()` (auth, workout tab, prepare/logger, live/summary/detail/saved/share, nutrition/profile/onboarding, tab-bar labels, workout-type selector). `fallbackLng:'en'`. New screens MUST use `t()` from day one.

## Deferred / recommended (not yet needed, tracked)

- Server-side `streak` / `weekly` aggregation (currently derived client-side from loaded logs) — move to a `GET /workout/stats` when history pagination means the client no longer holds all logs.
- Per-muscle volume analytics: parse `workout_logs.exercises` jsonb × `exercise_body_targets` server-side.
- `pg_trgm` index on `exercises.name` if fuzzy search is needed as the library grows.
- Rate-limiting middleware on auth endpoints (OTP resend already throttled in-service).
- Response caching for the static library (ETag / short TTL).
- Client history pagination (app currently loads page 1 / 30 logs into context).
