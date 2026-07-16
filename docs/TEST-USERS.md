# Test Users — Nafas

Self-documenting login personas for manual testing. The **email says what the
account is for**. Password is `pass1234` for all except admin.

| Email | Password | Role | Use it to test |
|---|---|---|---|
| `athlete@nafas.app` | `pass1234` | athlete | **Pure athlete flow** — workout, nutrition, profile, edit account, delete account. No management sections. |
| `gym.manager@nafas.app` | `pass1234` | athlete | **Athlete who manages a gym** — same athlete flow **plus** Manage Gym / Manage Events (data-driven; she's a *manager* on the "Body Master Sweifieh" team). |
| `gym.owner@nafas.app` | `pass1234` | athlete | **Gym owner** (athlete role) — owns a gym → Manage Gym, team management, gym leads, event registrations. |
| `coach@nafas.app` | `pass1234` | coach | **Pure coach** — coach profile, PT plans, leads, transformations. Shows in the Discover → Coaches marketplace. |
| `coach.owner@nafas.app` | `pass1234` | coach | **Coach + gym owner + event organizer** — the "everything" business account (owns a gym, organizes 2 events, has a coach profile). |
| `admin@nafas.app` | `admin12345` | admin | **Admin panel** (`admin/` web app) — users, countries, exercises, foods, gyms, coaches, events. |

Also present (not renamed): `omar@nafas.app` (`pass1234`, coach — extra marketplace listing), and `abed.ghandour7298@gmail.com` (the project owner's real account — leave it).

## Why an "athlete" sees Manage Gym / Events
Gym owner / manager / event organizer are **capabilities tied to ownership data,
not to the athlete↔coach role** — any user can own or manage a gym. So a plain
athlete (`athlete@nafas.app`) sees none of it, while an athlete who happens to
manage a gym (`gym.manager@nafas.app`) does. That's by design, not a bug.

## Notes
- All personas are email-verified and `profileComplete = true`, so login goes
  straight to the app (no OTP / onboarding gate).
- Dev login: any Wi-Fi works — the app derives the API host from the Metro
  dev-server host automatically (see `lib/query-client.ts`). No IP to set.
- To reset any password to `pass1234`:
  `bcryptjs.hashSync('pass1234', 10)` → `update users set password_hash='<hash>' where email='...';`
