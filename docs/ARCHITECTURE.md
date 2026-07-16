# Nafas — Architecture

## Shape

Expo Router app (`app/`) + a thin Express server (`server/`) that exists only to
host the web build. **There is no API and no database.** The "app" is effectively
a client-only React Native program; all dynamic data is either static mock data
or device-local state.

```
┌─────────────────────────────────────────────┐
│  React Native app (Expo Router, app/)         │
│                                               │
│  app/_layout.tsx                              │
│   ErrorBoundary → QueryClient → Gesture →     │
│   Keyboard → AppProvider → NavigationGuard    │
│        │                                      │
│        ├── reads STATIC content ──► lib/mock-data.ts   (users, coaches, gyms,
│        │                                                 restaurants, posts,
│        │                                                 exercises, food, …)
│        │                                                                    
│        └── reads/writes USER state ─► lib/app-context.tsx ──► AsyncStorage   │
│                                        (profile, workouts, logs, templates,  │
│                                         nutrition, InBody, likes, theme, lang)│
└─────────────────────────────────────────────┘
                    │  (web build only)
                    ▼
        server/index.ts  (Express, :5000/PORT)
          • serves static-build/ + assets/ + landing page
          • registerRoutes() → EMPTY (no /api)
          • storage = MemStorage (in-memory, unused)
          • shared/schema.ts → Drizzle users table (unused)
```

## Routing (`app/`, file-based)

- `_layout.tsx` — providers + `NavigationGuard`. Guard rule: authenticated ≡ `user !== null && onboardingComplete`. Unauthenticated → `/auth`; authenticated-but-in-auth → `/(tabs)`.
- `(tabs)/` — 5 tabs. On devices with iOS liquid-glass, uses `NativeTabs`; otherwise a classic `Tabs` bar with a blur/solid background. Tabs: `index` (Communities), `events` (Discover), `coach` (AI Coach), `nutrition`, `profile`.
- Everything else is a stack screen registered in `_layout.tsx` with presentation modes (modal / fullScreenModal / card). Dynamic routes use `[id]` / `[postId]`.

## State — the one source of truth

**`lib/app-context.tsx`** is the whole state layer. It holds and persists (to
`AsyncStorage`, keys prefixed `nafas_`):

| Domain | Notes |
|---|---|
| `user: UserProfile` | profile incl. `type: 'athlete' \| 'coach'`, body metrics, goal, rank |
| `onboardingComplete` | gates navigation |
| `workouts` / `workoutLogs` | two overlapping workout records (legacy `Workout` + richer `WorkoutLog`) |
| `workoutTemplates` | reusable blueprints with `SetConfig` (reps / hold / emom) |
| `customExercises` | user-defined exercises on top of the static library |
| `activeSession` | in-progress live workout, auto-saved every 30s so it survives reload |
| `todayNutrition` | meals + macro targets; targets recomputed from weight+goal in `getDefaultTargets()` |
| `inBodyTests` | body-composition history |
| `likedPosts: Set` | the only "social" thing persisted; everything else social is ephemeral |
| `language`, `isDark` | i18n + theme |

Derived values: `streak` and `weeklyWorkouts` are computed from `workouts` +
`workoutLogs`. The provider blocks render (`if (!loaded) return null`) until
AsyncStorage hydration finishes.

> Note the two parallel workout types (`Workout` vs `WorkoutLog`) and two
> `WORKOUT_TYPES`/`workoutTypes` lists (one in context, one in mock-data). This
> is duplication to consolidate when the data model is formalized.

## Data — `lib/mock-data.ts`

~640 lines of static seed content: `communities`, `users` (4), `coaches` (3),
`gyms` (3), `posts` (6, with nested comments), `exerciseLibrary` (36),
`foodDatabase` (15), `tournaments` (3), `restaurants` (3), plus lookups
(`ranks`, `sportInterests`, `goals`, `readyToTrainUsers`, `aiTips`). Screens
filter these arrays by id/community to render detail pages.

The mock entities are **richer than the real authenticated user** — e.g. mock
users have `totalWorkouts`, `bestStreak`, `achievements`; the faked login user
does not. Don't treat mock shapes as a finished schema.

## Server — `server/`

- `index.ts`: CORS (Replit domains + any localhost), JSON body parsing, request logging, static hosting of `static-build/` (the Expo web export), an Expo manifest route for native OTA, and a templated landing page. Listens on `PORT || 5000`, host `0.0.0.0`.
- `routes.ts`: `registerRoutes()` just creates the HTTP server and returns it. **No endpoints.**
- `storage.ts`: `IStorage` + `MemStorage` (get/create user in a `Map`). Defined, exported, never called.
- Build scripts: `server:build` (esbuild bundle), `expo:static:build` (`scripts/build.js`). Intended prod path = export Expo web → serve via Express.

## Client → server seam (currently inert)

`lib/query-client.ts` provides a React Query `QueryClient` + `apiRequest()` +
`getApiUrl()`. `getApiUrl()` reads `EXPO_PUBLIC_DOMAIN` and **forces `https://`**.
Nothing calls these yet — React Query is mounted but no query/mutation exists.
This is the wiring point for a future backend.

## Platform notes

- **Web** is a first-class target (`react-native-web`) but degrades: the map (`react-native-maps`) renders a list fallback (`NativeMap.web.tsx` is an empty stub; `map.tsx` branches on `Platform.OS === 'web'`), and native tabs fall back to the classic bar.
- **Origin = Replit/Linux.** `node_modules` carries Linux native binaries; reinstall on macOS (see `CLAUDE.md` → Run it). The `expo:dev` script is hardwired to `$REPLIT_DEV_DOMAIN`.

## Build-out order if productionizing

1. **Backend + schema** — flesh out `shared/schema.ts` (Drizzle/Postgres), real routes in `server/routes.ts`, swap `MemStorage` for a DB.
2. **Real auth** — replace the mocked `auth/*` flows; today login accepts anything and OTP accepts any 6 digits.
3. **Wire the client** — use `lib/query-client.ts` for real reads/writes; migrate the social/marketplace screens off `mock-data.ts`; make likes/follows/comments/posts persist server-side.
4. **Payments** — the dead Book/Subscribe/Order/Register buttons need a gateway (e.g. a Saudi-friendly PSP) + order/booking models.
5. **Real AI** — replace canned insight generators with an LLM service.
