# Nafas — Feature Status Matrix

The important doc. The UI is ~90% built; the *function* behind it is not. Legend:

- ✅ **Works** — real behavior, persists where it should (device-local).
- 🟡 **Local-only / ephemeral** — works on screen but resets on reload or never saved.
- 🔴 **Dead** — button/screen exists, does nothing real (haptic + maybe an alert).
- 🧪 **Faked** — pretends to call a backend; accepts anything.

## Auth (`app/auth/`)

| Feature | Status | Reality |
|---|---|---|
| Email login | 🧪 | Accepts **any** email + any non-empty password. 900ms fake delay, derives a user from the email, routes to tabs. |
| Register (athlete) | 🧪 | Client validation only (email format, pw ≥8, match). Any valid-shaped input passes. |
| Register (coach) | 🧪 | Collects specialty/years/certs — **never used afterward**. No coach dashboard exists. |
| OTP verify | 🧪 | **Any 6 digits** work; UI literally says "any 6-digit code works in demo mode". |
| Forgot password | 🧪 | 3 steps, all accept anything, no email/reset backend. |
| Google / Apple login | 🧪 | No OAuth. Pre-fills a hardcoded user (Google→"Ahmed Rahman", Apple→"Ali Abdullah"). |

## Onboarding (`app/onboarding.tsx`)

| Feature | Status | Reality |
|---|---|---|
| Physical info, interests, goal | ✅ | Saved to `user` in context/AsyncStorage. Defaults pre-filled (175cm/75kg/25/male). |
| Nutrition targets from profile | 🟡 | Targets are computed (`getDefaultTargets`) on `setUser`, but onboarding copy implies more tailoring than happens. |

## Workouts

| Feature | Status | Reality |
|---|---|---|
| Build/configure workout (`prepare-workout`) | ✅ | Type, exercises (library + custom), sets (reps/hold/EMOM), rest. |
| Save as template | ✅ | Persists to `workoutTemplates`. |
| Custom exercises | ✅ | Persists to `customExercises`. |
| Live session (`live-workout`) | ✅ | Set-by-set logging, auto rest timer, hold/EMOM timers, add/remove mid-session, auto-save every 30s. |
| Workout logger (`workout-logger`) | ✅ | Simpler parallel logging path → `addWorkout`. (Overlaps live-workout; two systems.) |
| Summary + progress vs last (`workout-summary`, `workout-detail`) | ✅ | Compares against previous log of same name; per-exercise best-set deltas. |
| Saved workouts / history (`saved-workouts`) | ✅ | Templates + logs, view/delete. |
| **AI insight on workouts** | 🟡 | Real heuristic, **not** an LLM. Canned strings from completion %, volume, PRs. |
| Share workout card (`share-workout`) | 🔴 | Renders a nice card in 3 styles, but "Save to Gallery" and "Post to Community" are `Alert.alert` stubs. |

## Nutrition

| Feature | Status | Reality |
|---|---|---|
| Daily macro/calorie tracking (`(tabs)/nutrition`) | ✅ | Consumed vs target rings, per-meal breakdown. |
| Add food (`meal-logger`) | ✅ | Search static `foodDatabase`, add to a meal (`addMealItem`). |
| Targets | 🟡 | Computed from weight+goal; otherwise default 2400cal/164P/300C/60F. |
| Past days / history | 🔴 | Only "today" exists. No multi-day nutrition history. |
| Serving size / barcode / nutrient edit | 🔴 | Not present. |
| InBody body-composition (tab in `(tabs)/coach`) | ✅ | Manual entry of 8 metrics, history with deltas, persists to `inBodyTests`. No device integration. |

## AI Coach (`app/(tabs)/coach.tsx`)

| Feature | Status | Reality |
|---|---|---|
| Dashboard (greeting, quick stats, recent workouts, resume) | ✅ | Pulls from real local workout state. |
| Smart Insights / weekly activity | 🟡 | Computed from local data — genuine math, no AI. |
| AI Recommendations | 🟡 | Hardcoded suggestions keyed to `user.goal`. |
| AI Weekly Plan | 🟡 | `generateAIPlan()` switch over 4 goals → fixed canned plans. |
| **Any actual AI/LLM** | 🔴 | None anywhere in the app. |

> Note: the tab is labeled "AI Coach" but is a **personal training assistant**, not the coach *marketplace*. It has no listings, courses, or booking.

## Community / Social

| Feature | Status | Reality |
|---|---|---|
| Feed with sport filters (`(tabs)/index`) | ✅ | Renders static `posts` filtered by community. |
| Like / unlike | 🟡 | Toggles; `likedPosts` Set persists to AsyncStorage, but the *count* is mock and there's no server. |
| Comments (`comments/[postId]`) | 🟡 | View/add/like comments — **session-only**, lost on reload. |
| Save post | 🟡 | Local `useState`, ephemeral. |
| Share post | 🔴 | Haptic only. |
| Create post (FAB) | 🔴 | Haptic only, no composer. |
| Community detail (`community/[id]`) | ✅/🔴 | Feed/Trending/Coaches/Tournaments tabs render; "Trending challenges" are hardcoded; coach/tournament cards are read-only. |
| User profile (`user-profile/[id]`) | ✅/🟡 | Stats/posts/achievements from mock. Follow toggles (ephemeral). "Message" 🔴 haptic only. "Recent workouts" hardcoded, not from logs. |

## Discovery / Marketplace

| Feature | Status | Reality |
|---|---|---|
| Discover tab (`(tabs)/events`) | ✅ | Browse tournaments/gyms/coaches/restaurants from mock; navigates to detail pages. |
| Coach profile (`coach-profile/[id]`) | ✅ display | About/Posts/Before-After/Reviews. **"Book Session — N SAR" 🔴 dead.** Courses listed, no enroll. |
| Gym profile (`gym-profile/[id]`) | ✅ display | Info/Posts/Events/Schedule, membership plans. **"Subscribe"/"Join Now" 🔴 dead.** Phone call ✅ (`Linking`). |
| Restaurant profile (`restaurant-profile/[id]`) | ✅ display | Menu with macros + SAR prices. **"Order Now" 🔴 dead.** Phone call ✅. |
| Tournament register | 🔴 | Shows count; "Register" haptic only. |
| Map (`map.tsx`, `NativeMap`) | ✅ mobile / 🟡 web | Real `react-native-maps` on device with gym/restaurant/event/partner pins; **web = list fallback** (native map stub is empty by design). |

## Find a Partner (`app/find-partner.tsx`)

| Feature | Status | Reality |
|---|---|---|
| "Ready to train" toggle + activity/location | 🟡 | Local state, never synced; location captured but unused. |
| Nearby partners list (`readyToTrainUsers`) | ✅ display | Static mock with Ready/Scheduled status. |
| "Train Together" | 🔴 | Fake confirm alert, no request system. |

## Profile & System

| Feature | Status | Reality |
|---|---|---|
| Profile display, rank, stats, interests | ✅ | From context + mock lookups. |
| Dark/light theme toggle | ✅ | Persists. |
| Language EN/AR toggle | ✅/🟡 | Works via i18next, but **many strings hardcoded English** — coverage incomplete; RTL not audited. |
| Logout | ✅ | Clears context + AsyncStorage (no server call). |
| Edit profile / Achievements buttons | 🔴 | Empty `onPress`. |

## Cross-cutting gaps (the real backlog)

- **No backend / no persistence beyond device.** Reinstall the app = data gone; nothing is shared between users.
- **No real auth.** Anyone is anyone.
- **No payments.** Every monetization button is dead — this is the biggest gap vs. the product's commercial intent.
- **Social is a mirage.** Likes/follows/comments/posts don't reach anyone else.
- **"AI" is canned.** Opportunity for a real differentiator.
- **i18n half-done.** Arabic-first market, English strings leaking.
- **Coach role is a dead end** post-signup.
- **Duplicate workout models** (`Workout` vs `WorkoutLog`) to reconcile.
