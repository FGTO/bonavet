# BoNavet

A family hub for a wall-mounted tablet. Each family member gets a column with their **Events**, synced from Google Calendar, and their **Tasks** (homework and other things due by a date). A side strip controls smart-home **Devices**. Parents manage everything from a signed-in **Admin** on their phone or laptop.

The words used here (Household, Family Member, Tag, Screen…) are defined in [GLOSSARY.md](GLOSSARY.md). Architectural decisions are in [docs/adr/](docs/adr/).

> **Status:** v1 starter. The Dashboard runs fully on built-in demo data. The Admin, Google sign-in and calendar sync are built, but only switch on once you've completed [Set up the services](#set-up-the-services). Devices are demo-only until a Home Assistant provider is added (ADR 0003).

---

## Contents

1. [Run it locally (demo mode)](#1-run-it-locally-demo-mode)
2. [How it works](#2-how-it-works)
3. [Set up the services](#set-up-the-services)
   - [3.1 Neon (database)](#31-neon-database)
   - [3.2 Google Cloud (sign-in + Calendar)](#32-google-cloud-sign-in--calendar)
   - [3.3 Local environment file](#33-local-environment-file)
   - [3.4 Create the tables and your Household](#34-create-the-tables-and-your-household)
   - [3.5 First sign-in and setup](#35-first-sign-in-and-setup)
   - [3.6 Deploy to Vercel](#36-deploy-to-vercel)
   - [3.7 Mount the tablet](#37-mount-the-tablet)
4. [Day-to-day use](#4-day-to-day-use)
5. [Project structure](#5-project-structure)
6. [Scripts](#6-scripts)
7. [Troubleshooting](#7-troubleshooting)
8. [Roadmap](#8-roadmap)

---

## 1. Run it locally (demo mode)

You need **Node.js 20.9 or newer** (`node -v`) and **pnpm** (`npm install -g pnpm`).

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no database configured, BoNavet shows a demo family. You can tick Tasks and toggle Devices; the changes live in memory until the server restarts.

To try it on your iPad, make sure the iPad and your computer are on the same Wi-Fi and open the **Network** address that `pnpm dev` prints (e.g. `http://192.168.1.20:3000`).

---

## 2. How it works

```
Google Calendar ──(sync every ≤5 min)──▶ Neon Postgres ◀── Admin (Parents, Google sign-in)
                                              │
                                              ▼
                     Screen (wall tablet) ── polls /api/dashboard every 60 s
```

- **Events** come from Google Calendars that a Parent connects in the Admin. A **Tag** at the start of the title assigns an Event to a Family Member: `[Ella] Soccer training`. Several Tags put the Event in several columns: `[Ella][Oscar] Dentist`. Events with no recognised Tag (including typos like `[Elal]`) appear in the navy **Hela familjen** band, so nothing silently disappears.
- **Tasks** are created by Parents in the Admin. Anyone can tick them off on the wall. Done Tasks stay visible until their due date has passed; unfinished overdue Tasks get a coral marker.
- **Screens** are tablets paired with a one-time code from the Admin. They never sign in; a long-lived cookie identifies them, and a Parent can revoke it.
- **Calendar freshness:** whenever a Screen polls and a Calendar is more than 5 minutes old, the server re-syncs it in the background. A daily scheduled job is a safety net (see ADR 0004 for why it's not every 5 minutes).
- **Offline:** if the Wi-Fi or server is down, the Screen keeps the last data and shows "Ingen kontakt – visar senast kända läget".
- **Quiet Hours:** 22:00–06:30 the Screen dims to a clock; a touch wakes it for 2 minutes.

---

## Set up the services

Do these in order, about 30–45 minutes the first time. You'll create three free accounts: **Neon** (database), **Google Cloud** (sign-in and calendar access) and **Vercel** (hosting). Write down every value you copy; you'll paste them into `.env.local` (step 3.3) and later into Vercel (step 3.6).

> Service dashboards change their wording now and then. If a button name below doesn't match exactly, look for the closest equivalent. The concepts stay the same.

### 3.1 Neon (database)

Neon hosts a standard PostgreSQL database. Nothing in BoNavet is Neon-specific, so you can move later (ADR 0004).

1. Go to <https://neon.com> → **Sign up** (signing up with GitHub or Google is fine).
2. Create a project:
   - **Project name:** `bonavet`
   - **Postgres version:** the default (newest) is fine.
   - **Region:** pick one in Europe, e.g. **AWS Europe Central 1 (Frankfurt)**. Choose a region close to where you'll deploy Vercel (step 3.6). Data stays in the EU.
3. Once the project is created, click **Connect** in the top bar. The **Connect to your branch** dialog opens.
4. Leave the branch, database (`neondb`) and role as they are, and leave **Connection pooling** switched **on**.
5. Copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:xxxxxxxx@ep-something-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   The `-pooler` part of the hostname shows pooling is on. This is your **`DATABASE_URL`**. Treat it like a password.

### 3.2 Google Cloud (sign-in + Calendar)

This gives Parents "Sign in with Google" and lets BoNavet *read* their calendars.

**a) Create a project**

1. Go to <https://console.cloud.google.com> and sign in with your normal Google account.
2. Top bar → project picker → **New project** → name it `BoNavet` → **Create**. Make sure it's selected in the project picker afterwards.

**b) Turn on the Google Calendar API**

3. Menu (☰) → **APIs & Services** → **Library**.
4. Search for **Google Calendar API** → open it → **Enable**.

**c) Configure the Google Auth Platform (the consent screen)**

5. Menu (☰) → **Google Auth Platform** (if you don't see it, use **APIs & Services → OAuth consent screen**; it leads to the same place). If prompted with **Get started**, fill in:
   - **App name:** `BoNavet`
   - **User support email:** your email
   - **Audience:** **External**
   - **Contact information:** your email
   - Agree to the policy → **Create**.
6. **Data Access** → **Add or remove scopes** → filter for `calendar.readonly` and tick **…/auth/calendar.readonly** ("See and download any calendar you can access using your Google Calendar"). Also make sure `openid`, `…/auth/userinfo.email` and `…/auth/userinfo.profile` are ticked → **Update** → **Save**.
7. **Audience**: this step matters.
   - New apps start in **Testing**. In Testing, Google **expires the calendar permission after 7 days**, so the sync would stop every week.
   - Click **Publish app** and confirm, so the status becomes **In production**. You do **not** need to submit for verification for family use.
   - Because Calendar access is a "sensitive" scope and the app is unverified, Google shows a **"Google hasn't verified this app"** warning on first sign-in. Each Parent clicks **Advanced → Go to BoNavet (unsafe)** once. It's your own app, so that's expected. Unverified apps are capped at 100 users, which is plenty for a family. (Verification only becomes necessary when BoNavet is offered to other households; see the [Roadmap](#8-roadmap).)
   - If you'd rather stay in Testing, add each Parent under **Test users**, but expect to sign in again every 7 days to keep the sync alive.

**d) Create the OAuth client**

8. **Clients** → **Create client**.
   - **Application type:** **Web application**
   - **Name:** `BoNavet web`
   - **Authorised JavaScript origins:** `http://localhost:3000`
   - **Authorised redirect URIs:** `http://localhost:3000/api/auth/callback/google`
   - → **Create**.
9. A dialog shows the **Client ID** and **Client secret**. Copy both now: Google only shows the full secret once. These are your **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`**.
   (You'll add your Vercel address to this client in step 3.6.)

### 3.3 Local environment file

1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```
2. Generate two secrets:
   ```bash
   openssl rand -base64 32   # → BETTER_AUTH_SECRET
   openssl rand -hex 32      # → CRON_SECRET
   ```
3. Fill in `.env.local`:
   ```bash
   DATABASE_URL=postgresql://…-pooler…/neondb?sslmode=require
   BETTER_AUTH_SECRET=<first secret>
   BETTER_AUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=<from 3.2>
   GOOGLE_CLIENT_SECRET=<from 3.2>
   CRON_SECRET=<second secret>
   ```
   `.env.local` is git-ignored, so it never gets committed.

As soon as `DATABASE_URL` is set, the demo data goes away and the app uses your database.

### 3.4 Create the tables and your Household

1. Create the tables in Neon:
   ```bash
   pnpm db:migrate
   ```
   This applies the SQL in [drizzle/](drizzle/). You can check the result in Neon → **Tables**.
2. Create your Household and yourself as its first Parent. Use the **same Google address** you'll sign in with:
   ```bash
   pnpm db:seed -- --household "Familjen Andersson" --name Anna --email anna@gmail.com
   ```
   Only email addresses registered as a Parent can sign in, so this step is what lets you in.

### 3.5 First sign-in and setup

1. `pnpm dev` → open <http://localhost:3000/admin> → **Logga in med Google**.
2. Pick your account. Click through the "unverified app" warning (3.2 step 7), and **tick the calendar permission** on the consent screen.
3. In the Admin:
   - **Familjen:** add every Family Member with a colour and a **Tag** (defaults to their name). Mark other Parents as *Förälder* with their Google address so they can sign in too. Use the arrows to set the column order.
   - **Kalendrar:** click **Visa på tavlan** for each Google Calendar the Dashboard should read. Events appear within seconds.
   - **Att göra:** add Tasks with a person and a due date.
4. Open <http://localhost:3000>. Signed-in Parents can preview the Dashboard in their own browser without pairing it.

### 3.6 Deploy to Vercel

Vercel builds and hosts the app. The free **Hobby** plan is for non-commercial use; move to **Pro** when BoNavet becomes a paid service.

1. Put the code on GitHub (Vercel deploys from a Git repository):
   ```bash
   # create an empty private repo named "bonavet" on github.com first, then:
   git remote add origin git@github.com:<you>/bonavet.git
   git push -u origin main
   ```
2. Go to <https://vercel.com> → sign up with GitHub → **Add New… → Project** → **Import** your `bonavet` repo.
3. On the configuration screen, Vercel detects **Next.js**. Open **Environment Variables** and add every variable from your `.env.local`, **except** set:
   - `BETTER_AUTH_URL` = `https://<your-project>.vercel.app`. If you don't know the address yet, deploy first, then set it and redeploy.
   Mark `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` and `CRON_SECRET` as **Secret**.
4. Click **Deploy**. When it finishes, note the address, e.g. `https://bonavet-xyz.vercel.app`.
5. If `BETTER_AUTH_URL` was a placeholder: **Settings → Environment Variables** → fix it → **Deployments** → ⋯ on the latest → **Redeploy**. Environment-variable changes only apply to new deployments.
6. Back in **Google Cloud → Google Auth Platform → Clients → BoNavet web**, add:
   - **Authorised JavaScript origins:** `https://bonavet-xyz.vercel.app`
   - **Authorised redirect URIs:** `https://bonavet-xyz.vercel.app/api/auth/callback/google`
   → **Save** (it can take a few minutes to take effect).
7. Optional but recommended: **Settings → Functions → Function Region**, pick the same region as your Neon database (e.g. Frankfurt, `fra1`) to keep it fast.
8. The daily safety-net sync is configured in [vercel.json](vercel.json). You can see it under **Settings → Cron Jobs**. Vercel sends `CRON_SECRET` automatically. (On Hobby, Vercel runs it once a day at a random minute within the hour.)
9. Sign in at `https://bonavet-xyz.vercel.app/admin` to check everything works.

From now on, every `git push` to `main` deploys automatically.

### 3.7 Mount the tablet

Do these steps **in this order**. iPadOS keeps home-screen apps' cookies separate from Safari's, so pairing must happen *inside* the home-screen app.

1. On the iPad, open Safari → your Vercel address.
2. **Share** → **Add to Home Screen** → **Add**.
3. Close Safari and open **BoNavet** from the home screen. It shows **Koppla skärmen** (pair the screen).
4. On your phone or laptop: Admin → **Skärmar** → name it (e.g. "Köket") → **Skapa kopplingskod**.
5. Type the 6-character code on the iPad within 10 minutes → **Koppla**. The Dashboard appears.
6. Keep it on and locked to BoNavet:
   - **Settings → Display & Brightness → Auto-Lock → Never.**
   - **Settings → Accessibility → Guided Access → On** and set a passcode. Then open BoNavet and **triple-click** the top (or Home) button → **Start**.
   - Keep it plugged in. Optionally use **Settings → Battery → Battery Health → Optimised/80 % limit** if your model offers it.

To remove a lost or replaced tablet: Admin → **Skärmar** → **Koppla bort**.

---

## 4. Day-to-day use

| I want to… | Do this |
|---|---|
| Put an Event in Ella's column | Create it in Google Calendar as `[Ella] Fotboll`. |
| Put it in two columns | `[Ella][Oscar] Tandläkare` |
| Show it for the whole family | No Tag: `Mormor hälsar på` |
| Add homework | Admin → **Att göra** → add with a due date |
| Let another parent in | Admin → **Familjen** → tick *Förälder* + their Google address |
| Rename a Tag | Admin → **Familjen** → change Tag. Update existing Calendar titles to match. |
| Force a calendar refresh | Admin → **Kalendrar** → **Synka nu** |

---

## 5. Project structure

```
src/
├── domain/            Pure logic, no framework. Start here.
│   ├── types.ts         Domain types (match GLOSSARY.md)
│   ├── tags.ts          [Tag] parsing and Event → Family Member assignment
│   ├── agenda.ts        Snapshot → columns/days/Tasks for the Dashboard
│   ├── quiet-hours.ts   Quiet Hours check
│   └── time.ts          Time-zone-safe day helpers
├── devices/           Device provider boundary + demo provider (ADR 0003)
├── i18n/              Swedish dictionary (sv.ts) and t(); add en.ts later
├── server/            Server-only code
│   ├── db/              Drizzle schema + client
│   ├── auth.ts          Better Auth (Google, Parent allow-list)
│   ├── parent.ts        "Who is the signed-in Parent?"
│   ├── screens.ts       Pairing codes and Screen tokens
│   ├── dashboard.ts     Builds the snapshot for a viewer
│   ├── calendar/        Google Calendar client + sync
│   └── demo/            Demo family used when no database is set
├── components/
│   ├── dashboard/       The wall Dashboard (client components)
│   ├── admin/           Admin UI bits
│   └── ui/styles.ts     DESIGN.md button/input/card classes
└── app/               Next.js routes
    ├── page.tsx         Dashboard
    ├── pair/            Screen pairing
    ├── admin/           Admin pages + Server Actions
    └── api/             dashboard, tasks, devices, screens/pair, cron, auth
```

Design tokens live in [src/app/globals.css](src/app/globals.css) and follow [DESIGN.md](DESIGN.md). Family Member pastels are the one deliberate addition to the palette.

**Learning Next.js?** This project uses Next.js 16 with **Cache Components**, which changes some things you may read in older tutorials (`middleware` is now `proxy`, request-time data must sit inside `<Suspense>`, and so on). The version-matched docs ship inside the package: `node_modules/next/dist/docs/`. [AGENTS.md](AGENTS.md) explains this for AI assistants too.

---

## 6. Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server on port 3000 |
| `pnpm build` / `pnpm start` | Production build / run it |
| `pnpm test` | Unit tests (Tag matching, agenda, Quiet Hours) |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm db:generate` | Create a new migration after editing `src/server/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Browse the database in Drizzle Studio |
| `pnpm db:seed -- --household … --name … --email …` | Create a Household and its first Parent |

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Admin says "Admin är inte aktiverat ännu" | One of `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` is missing. Restart `pnpm dev` after editing `.env.local`. |
| Google says `redirect_uri_mismatch` | The redirect URI in the Google client must match exactly: `<BETTER_AUTH_URL>/api/auth/callback/google`, with no trailing slash and the right `http`/`https`. |
| "Kontot … är inte förälder i något hushåll" | That Google address isn't a Parent. Add it in Admin → Familjen (or with `pnpm db:seed`). |
| Calendars page asks you to sign in again for calendar access | You didn't tick the calendar permission. Sign out, sign in, and tick it. |
| Sync stopped after about a week | The Google app is still in **Testing** (3.2 step 7). Publish it, then sign out and back in. |
| A sync error shows under a Calendar | Usually an expired or revoked Google permission: sign out and back in. The Screen keeps the last known Events meanwhile. |
| The tablet keeps asking for a pairing code | It was paired in Safari instead of the home-screen app, or the Screen was revoked. Pair again from inside the home-screen app. |
| An Event shows under "Hela familjen" instead of a column | The Tag doesn't match a Family Member's Tag (it's shown in the title so you can spot the typo). |
| Demo Devices reset | Expected: demo state is in memory. Real Devices come with the Home Assistant provider. |

---

## 8. Roadmap

Planned, not built. Each item fits an existing boundary:

- **Home Assistant provider:** implement `DeviceProvider` in `src/devices/`, select with `DEVICE_PROVIDER=home-assistant`. Reaching the home from the cloud needs Home Assistant Cloud (Nabu Casa) or a tunnel (ADR 0002).
- **Tasks from the teacher's emails:** read a Parent's Gmail (new OAuth scope) and turn homework into Tasks.
- **More calendar providers:** iCloud/Outlook alongside Google (`calendar.provider` column already exists).
- **Settings:** per-Household Quiet Hours and time zone in the Admin.
- **Paid service for other households:** sign-up, billing, Google OAuth **verification** (required beyond 100 users for the sensitive Calendar scope), and the Vercel Pro plan. The data model is already Household-scoped (ADR 0001).
