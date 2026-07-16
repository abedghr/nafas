# CLAUDE.md — Nafas Mobile

Agent guide for this repo. Read `docs/` for product/architecture/feature detail.

## What this is

**Nafas (نَفَس)** — a *multi-country fitness social super-app* for MENA,
**launching Jordan-first** (KSA next, more countries pluggable), Arabic + English.
One app bundles: workout tracking, nutrition/macro logging, a coach marketplace,
gym & healthy-restaurant directories, a community feed, tournaments/events, "find
a training partner", and an "AI Coach" tab. (The current prototype hardcodes
Riyadh/SAR — that's an artifact the real build replaces; see `docs/ROADMAP.md`.)

**Current reality: it's a high-fidelity prototype.** The UI is built out across
~30 screens, but there is **no real backend**. All content is mock data, all
auth is faked, all "buy/book/order/join" buttons are dead, and all user data
lives on-device. See `docs/FEATURES.md` for the works/mocked/dead breakdown —
read it before estimating any feature, because most things look done but aren't
wired to anything.

## Stack

- **Expo SDK 54** + **Expo Router 6** (file-based routing in `app/`), React Native 0.81, React 19.
- **State:** one React Context (`lib/app-context.tsx`) + `AsyncStorage`. No Redux, no server cache despite React Query being installed.
- **Server:** `server/` is an Express app (TS, run via `tsx`) that only serves the Expo web build + a landing page. It has **no API routes** (`server/routes.ts` is an empty stub) and **no database** (`server/storage.ts` is in-memory `MemStorage`). `shared/schema.ts` defines a Drizzle `users` table that is never used.
- **i18n:** `i18next` (`lib/i18n.ts`), EN + AR. Coverage is partial — many strings are still hardcoded English.
- **Fonts:** Rubik (Google). **Theme:** dark default, `constants/colors.ts`. Brand green `#00C896`, accent orange `#FF6B35`.
- Origin: built on **Replit**. `node_modules` and some scripts assume Linux.

## Run it

node_modules ships from Replit/Linux — on macOS you must reinstall first.

```bash
npm install                 # rebuilds native binaries (esbuild etc.) for this platform
PORT=5001 NODE_ENV=development npx tsx server/index.ts   # Express on :5001 (5000 = macOS AirPlay)
EXPO_PUBLIC_DOMAIN=localhost:5001 npx expo start --web --port 8081   # the app, on :8081
```

Open `http://localhost:8081`. **Login: any email + any non-empty password.** OTP:
any 6 digits. There is nothing to authenticate against.

Native (iOS/Android) needs a simulator/device + `npx expo start`. Web is enough
to see UI; note the map and native tab bar degrade on web by design.

Known launch gotchas (already patched / worth knowing):
- `server/index.ts` `listen()` must NOT pass `reusePort: true` — `ENOTSUP` on macOS.
- `getApiUrl()` in `lib/query-client.ts` forces `https://`, so API calls from local web fail. Irrelevant today (no API), but a trap when a backend lands.

## Architecture in one breath

`app/_layout.tsx` wires providers (ErrorBoundary → QueryClient → GestureHandler →
KeyboardProvider → **AppProvider**) and a `NavigationGuard` that bounces you to
`/auth` unless `user && onboardingComplete`. Five tabs live in `app/(tabs)/`
(Communities, Discover, AI Coach, Nutrition, Profile); everything else is a
stack screen. **Every screen reads from `lib/mock-data.ts` (static content) or
`useApp()` (the user's own workouts/nutrition/templates, which DO persist to
AsyncStorage).** Social actions (like/follow/comment/post) are session-only and
vanish on reload.

## Conventions

- Path alias `@/` → repo root (e.g. `@/lib/app-context`, `@/constants/colors`).
- Screens are self-contained: a default-export component + a `StyleSheet.create` block at the bottom. Match that — no shared component library exists beyond `components/` (ErrorBoundary, NativeMap, keyboard compat).
- Theme via `const theme = isDark ? Colors.dark : Colors.light` from `useApp()`. Don't hardcode hex outside `constants/colors.ts`.
- Haptics on most button presses (`expo-haptics`). Animations via `react-native-reanimated`.
- IDs generated with `expo-crypto` `randomUUID()`.
- Money: the prototype hardcodes `{ price, currency: 'SAR' }`. The real model is per-country `Money { amount, currency }` (JOD primary, SAR, …) — never hardcode a currency or geo. See `docs/ROADMAP.md` Phase 0.

## When you add a backend (the obvious next step)

There is no persistence layer to integrate with — you're building it from zero.
`server/routes.ts` + `server/storage.ts` + `shared/schema.ts` are the intended
seams (Express + Drizzle + Postgres), currently empty. The app talks to the
server through `lib/query-client.ts` (React Query is already provided but
unused). Don't trust the mock shapes as a schema spec — they're richer than the
faked auth user. See `docs/ARCHITECTURE.md`.
