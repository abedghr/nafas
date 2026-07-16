# Deploy Nafas live (free) — Render + Neon + PWA

Zero cost. No Apple/Google developer accounts. One Render service serves both the
API and the mobile app (as an installable PWA).

Legend: 🧑 = you do it in a browser · 💻 = a terminal command · 🤖 = I can do it for you.

---

## Step 1 — Put the code on GitHub  (💻, one time)

The repo has no commits yet. From the project folder:

```bash
cd nafas-mobile
git init
git add .
git commit -m "Nafas — initial"
```

🧑 On github.com → **New repository** → name `nafas` → **Private** → *do NOT* add a
README/.gitignore (repo already has them) → **Create**.

Then (replace `<you>`):

```bash
git remote add origin https://github.com/<you>/nafas.git
git branch -M main
git push -u origin main
```

Secrets are safe: `.env`, `.env.prod` are git-ignored.

---

## Step 2 — Database on Neon  (🧑)

1. Go to **neon.tech** → sign up (GitHub login is fine).
2. **New Project** → name `nafas`, pick the region closest to you → **Create**.
3. On the project dashboard, copy the **Connection string** (looks like
   `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
4. Keep it — this is your `DATABASE_URL`.

---

## Step 3 — Seed the database  (💻 or 🤖, one time)

Run once from your machine, pointed at Neon (creates tables + demo data):

```bash
export DATABASE_URL="postgresql://...neon...?sslmode=require"
npm run db:push          # create all tables
npm run db:seed          # countries + admin user
npm run seed:i18n
npm run seed:workout
npm run seed:exercises:ar
npm run seed:nutrition
npm run seed:gyms
npm run seed:coaches
npm run seed:events
```

(🤖 give me the Neon URL and I run all of this for you.)

Seeded logins afterward: `admin@nafas.app / admin12345`, and the coaches
`khalid@nafas.app / fatima@… / omar@… / pass1234`. (The clean test personas from
`docs/TEST-USERS.md` are optional — I can re-apply them to Neon on request.)

---

## Step 4 — Deploy on Render  (🧑)

1. **render.com** → sign up **with GitHub** → authorize access to the `nafas` repo.
2. **New → Blueprint** → select the `nafas` repo → Render reads `render.yaml` and
   proposes a service named **nafas**.
3. It will prompt for the secret env vars (marked `sync:false`):
   - **DATABASE_URL** → paste the Neon string.
   - SMTP_* → leave blank for now (see Step 6).
4. **Confirm the service name is `nafas`** so the public URL is
   `https://nafas.onrender.com`. If that name is taken, note the real URL Render
   gives you and **edit the `EXPO_PUBLIC_API_URL` env var to match it**.
5. **Apply / Create** → Render builds the Docker image (≈5–10 min: installs deps,
   builds the web app, bundles the server).
6. When it goes **Live**, open `https://nafas.onrender.com` → the app loads.

> Free tier sleeps after 15 min idle → the first request after idle takes ~40s
> (cold start). Normal.

---

## Step 5 — Install on your iPhone (PWA)  (🧑)

1. Open **`https://nafas.onrender.com`** in **Safari** (must be Safari on iOS).
2. Tap **Share** (□↑) → **Add to Home Screen** → name it *Nafas* → **Add**.
3. Launch it from the home-screen icon — full-screen, no browser bars, like an app.

(Android: same in Chrome → menu → *Install app* / *Add to Home screen*.)

---

## Step 6 — OTP email (needed for real signups)

New users verify with a 6-digit code emailed to them. Without email, the code is
only printed in Render's logs. Two choices:

- **A. Demo mode (no email):** I add an `AUTH_DEV_OTP` env — when set, a fixed code
  (or any code) verifies, so anyone can sign up without receiving mail. Best for a
  first shared demo. *(ask me to enable)*
- **B. Real email (free):** create a free SMTP sender — **Brevo** (300/day) or a
  **Gmail app-password** — and set `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS`
  in Render → the service re-deploys → real verification emails.

---

## Step 7 — Updating the app later  (💻)

`render.yaml` has `autoDeploy: true`, so:

```bash
git add . && git commit -m "change" && git push
```

Render rebuilds + redeploys automatically. Reinstalling the PWA is not needed —
the home-screen icon always loads the latest.

---

## Gotchas
- **Uploads** (gym/event images) live on the container disk → wiped on each
  redeploy on free tier. Fine for a demo; wire Cloudinary (free) for persistence.
- **`EXPO_PUBLIC_API_URL` must equal the live URL** — it is baked into the web
  build. If you change the service name/domain, update that env and redeploy.
- Push notifications and the native map don't work in a PWA (everything else does).
