# Nafas - Smart Fitness Platform

## Overview

Nafas (نَفَس) is an AI-powered sports and fitness mobile application built with React Native (Expo) and an Express.js backend. It unifies community features, training tracking, nutrition logging, coaching, tournaments, and gym/restaurant discovery into one platform. The app supports two user types (Athletes and Coaches) and includes full Arabic/English internationalization.

The app currently relies heavily on mock data for all features, with a PostgreSQL database schema defined but minimally used. The backend server is lightweight, primarily serving as an API proxy and static asset host.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

- **Framework:** Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing:** File-based routing via `expo-router` with typed routes enabled. The app uses a tab-based layout (`app/(tabs)/`) with five main tabs: Communities, Discover (Events), AI Coach, Nutrition, and Profile
- **State Management:** React Context (`lib/app-context.tsx`) manages global app state including user profile, workouts, meals, theme, language, and liked posts. Data persists locally via `@react-native-async-storage/async-storage`
- **Server State:** `@tanstack/react-query` is set up for API communication via `lib/query-client.ts`, though most data currently comes from mock data files
- **Styling:** Plain React Native `StyleSheet` with a custom color system (`constants/colors.ts`) supporting dark/light themes. The primary brand color is `#00C896`
- **Fonts:** Rubik font family (400, 500, 600, 700 weights) loaded via `@expo-google-fonts/rubik`
- **Animations:** `react-native-reanimated` for entrance animations (FadeInDown, FadeInRight, etc.)
- **i18n:** `react-i18next` with Arabic and English translations defined inline in `lib/i18n.ts`
- **Haptics:** `expo-haptics` used extensively for tactile feedback on interactions

### Key Screens & Features

| Route | Purpose |
|-------|---------|
| `app/(tabs)/index.tsx` | Communities feed with posts |
| `app/(tabs)/events.tsx` | Discover tournaments, gyms, coaches, restaurants |
| `app/(tabs)/coach.tsx` | AI Coach with workout stats and history |
| `app/(tabs)/nutrition.tsx` | Nutrition tracking with macro rings and meal logging |
| `app/(tabs)/profile.tsx` | User profile with settings, theme toggle, language switch |
| `app/onboarding.tsx` | Multi-step onboarding (role, physical info, interests, goals) |
| `app/workout-logger.tsx` | Full workout logging with exercise selection and set tracking |
| `app/meal-logger.tsx` | Food search and meal item logging |
| `app/community/[id].tsx` | Community detail with feed, trending, coaches, tournaments tabs |
| `app/find-partner.tsx` | Find training partners nearby |
| `app/comments/[postId].tsx` | Post comments modal |
| `app/user-profile/[id].tsx` | Other user profiles |
| `app/coach-profile/[id].tsx` | Coach profiles |
| `app/gym-profile/[id].tsx` | Gym profiles with facilities and coaches |

### Backend (Express.js)

- **Runtime:** Node.js with Express 5, TypeScript compiled via `tsx` (dev) or `esbuild` (production)
- **Entry point:** `server/index.ts` — sets up CORS for Replit domains, JSON parsing, and route registration
- **Routes:** `server/routes.ts` — currently minimal, intended for `/api` prefixed routes
- **Storage:** `server/storage.ts` — implements `IStorage` interface with an in-memory `MemStorage` class. Has basic user CRUD operations
- **CORS:** Dynamically allows Replit dev/deployment domains and localhost origins for Expo web development

### Database

- **ORM:** Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- **Schema:** `shared/schema.ts` defines a `users` table with `id`, `username`, and `password` fields. Uses `drizzle-zod` for insert schema validation
- **Current state:** The schema is minimal. The app primarily uses mock data from `lib/mock-data.ts`. The database is set up for future expansion
- **Migrations:** Output to `./migrations` directory via `drizzle-kit push`

### Mock Data (`lib/mock-data.ts`)

Contains comprehensive mock datasets for: communities, users (with achievements, workout stats), posts (text/image/video/workout_share types with comments), coaches (with certifications, before/after transformations, courses, reviews), gyms (with facilities, subscriptions, coaches), tournaments, restaurants (with menus and macros), workout types, exercise library, food database, AI tips, ranks, sport interests, goals, and ready-to-train users. This is the primary data source for the app currently.

### Recent Changes (2026-02-20)

- Merged Communities + Social tabs into a single Communities tab with full social feed
- Replaced Social tab with Events/Discover tab (tournaments, gyms, coaches, restaurants)
- Added post types: text, image, video, workout_share with unique gradient workout share cards
- Built user profile screen (posts, workouts, achievements, rank badges, follow/unfollow)
- Built coach profile screen (certifications, before/after transformations, courses, reviews, book session)
- Built gym profile screen (facilities grid, coaches carousel, membership plans, contact)
- Built Find a Partner screen (ready status toggle, partner list, activity filter)
- Built comments modal (comment list, add comment, like comments)
- Redesigned workout logger with professional UI (type selection grid, table-style set tracking, rest timer, exercise picker modal, completion screen)
- Rebuilt AI Coach tab with three sub-tabs: Overview, Insights, InBody
- Added AI branding (sparkles icons, gradient AI badge) throughout the Coach section
- Built smart insights engine analyzing workout patterns, volume trends, muscle group balance
- Added AI-powered weekly plan generator based on user goals (build_muscle, lose_weight, improve_fitness, learn_skill)
- Added AI recommendations system (nutrition, sleep, training tips based on user goal)
- Built InBody test tracking with data entry modal (8 metrics) and progress visualization
- Added InBody test data persistence via AsyncStorage in app context
- Enhanced coach profiles with tabbed interface (About/Posts/Before-After/Reviews), achievements section, social posts feed, and visual transformation cards with before/after images
- Enhanced gym profiles with tabbed interface (Info/Posts/Events/Schedule), social posts feed, event cards with attendee counts, and weekly class schedule display
- Created restaurant profile screen with full menu display, macro badges (protein/carbs/fat/calories), contact info, tags, and order functionality
- Enhanced mock data with coach posts/achievements, gym posts/events/schedule, restaurant profiles with lat/lng coordinates, and location-enabled ready-to-train users
- Built Explore Map screen accessible from Discover tab header, showing gyms, restaurants, events, and training partners with color-coded markers and filter chips
- Used platform-specific file extensions (NativeMap.tsx / NativeMap.web.tsx) to handle react-native-maps web incompatibility

### Recent Changes (2026-02-22) — Advanced Workout System

- Extended app context with WorkoutTemplate, WorkoutLog, CustomExercise, ActiveSession types and AsyncStorage persistence (4 new storage keys)
- Expanded exercise library from 24 to 36 exercises with muscleGroup and defaultSetType fields, added MUSCLE_GROUPS constant
- Redesigned AI Coach tab Overview as Workout Dashboard with Prepare Workout CTA, Saved Workouts button, quick stats, recent workouts, and Resume Workout banner
- Built Prepare Workout screen (`app/prepare-workout.tsx`) with workout name input, exercise picker (search + muscle group filters), custom exercise creation, 3 set types (REPS/HOLD/EMOM), template loading, and Start Workout flow
- Built Live Workout screen (`app/live-workout.tsx`) with global elapsed timer, set tracking by type, floating rest timer, inline editing, finish confirmation with stats calculation, auto-save every 30 seconds
- Built Workout Summary screen (`app/workout-summary.tsx`) with hero section, stats grid, comparison with previous same-name workout, AI insight card, and action buttons (Save Template, Share, Done)
- Built Saved Workouts Library (`app/saved-workouts.tsx`) with Templates and History tabs, including search and delete functionality
- Built Workout Detail page (`app/workout-detail/[id].tsx`) with full exercise breakdown, planned vs actual values, AI insight, comparison, and Use as Template/Share/Delete actions
- Built Share Workout screen (`app/share-workout.tsx`) with Strava-style card preview in 3 styles (Dark/Gradient/Light), top lift highlight, volume comparison, and share actions

### Recent Changes (2026-02-23) — Workout UX Improvements

- Renamed "Prepare Workout" → "Start Workout" on dashboard CTA, header changed to "New Workout"
- Renamed "Saved Workouts" → "My Workouts" across dashboard and library screen
- Added workout type categorization with 11 preset types (Push Day, Pull Day, Leg Day, Upper Body, Lower Body, Full Body, Cardio, HIIT, Strength, Mobility, Custom)
- Added WORKOUT_TYPES constant and WorkoutType type to app-context, added workoutType field to WorkoutTemplate, WorkoutLog, and ActiveSession interfaces
- Built type selector grid in New Workout screen with per-type icons
- Built "Load from My Workouts" template picker modal — users can search and select a saved workout to auto-populate name, type, exercises, sets, and reps, then customize before starting
- Workout type now persists through the full flow: New Workout → Live Workout → Summary → Saved Workouts
- Workout type badges display on template and history cards in My Workouts screen
- Fixed Resume Workout banner to navigate to correct /live-workout route

### Recent Changes (2026-02-26) — Set Type Simplification & EMOM/HOLD Redesign

- Simplified set types from 6 to 3: REPS, HOLD, EMOM (removed INTERVAL, AMRAP, FOR_TIME)
- Updated SetConfig interface: removed `repsPerRound`, `everyMinutes`, `totalMinutes`, `timeCap`, `exercises` fields; added `repsPerInterval`, `intervalSeconds`, `totalIntervals`
- EMOM redesign in prepare-workout: configurable reps per interval, interval duration (30s/45s/60s/90s/120s/180s, default 60s), total intervals count, with summary preview
- EMOM live workout: 10-second preparation countdown with haptic feedback, per-interval countdown timer, interval progress indicator ("Interval 1/10"), overall progress bar, skip interval and finish early buttons
- HOLD live workout: 10-second preparation countdown before hold timer starts, progress bar during hold, finish early option
- Workout name only required when "Custom" type is selected — other types auto-use the type name (e.g., "Push Day")
- Replaced workout name/type form with type-first chip grid selector for quicker workout setup
- Updated workout-detail screen to display EMOM data (repsPerInterval × totalIntervals)

### Build & Deployment

- **Dev workflow:** Two processes run simultaneously — `expo:dev` (Expo Metro bundler) and `server:dev` (Express API server)
- **Production build:** `scripts/build.js` handles static web export from Expo, `server:build` bundles the server with esbuild
- **The Express server** serves the static Expo web build in production and proxies to Metro bundler in development
- **Port:** Server runs on port 5000
- **Metro config (`metro.config.js`):** Excludes `.local/` and `tmp/` directories from Metro's file watcher via `resolver.blockList`. This prevents Metro from crashing when Replit's internal workflow-log files are created/deleted inside those directories (ENOENT crash).

### Path Aliases

- `@/*` maps to project root
- `@shared/*` maps to `./shared/*`

## External Dependencies

### Core Runtime
- **Expo SDK 54** — Mobile app framework
- **React 19.1** — UI library
- **React Native 0.81** — Native platform bridge
- **Express 5** — Backend HTTP server

### Database & ORM
- **PostgreSQL** — Database (via `DATABASE_URL` environment variable)
- **Drizzle ORM** — SQL query builder and schema management
- **pg** — PostgreSQL client for Node.js

### Key Libraries
- **expo-router** — File-based navigation
- **@tanstack/react-query** — Async state management
- **react-i18next / i18next** — Internationalization
- **react-native-reanimated** — Animations
- **react-native-gesture-handler** — Touch gestures
- **react-native-maps** — Map views (for gym/location features)
- **expo-linear-gradient** — Gradient backgrounds
- **expo-haptics** — Haptic feedback
- **expo-image-picker** — Image selection
- **expo-location** — Location services
- **@react-native-async-storage/async-storage** — Local persistence
- **zod** — Schema validation (via drizzle-zod)
- **http-proxy-middleware** — Dev server proxying to Metro bundler
- **patch-package** — Applies patches to node_modules on install

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `REPLIT_DEV_DOMAIN` — Used for Expo development server configuration
- `EXPO_PUBLIC_DOMAIN` — Public API domain for client-side requests