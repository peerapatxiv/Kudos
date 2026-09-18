# Cockpit — Running Training Companion

A personal training cockpit for **Peerapat P.**, built around a two-race block:

- **A-race:** Amazing Thailand Marathon Half — Nov 28, 2026 — 21.1 km — goal **1:35:00** (4:30/km)
- **Secondary:** BYD Singapore Marathon (full) — Dec 6, 2026 — 42.2 km — deliberately a **recovery-pace
  effort**, only 8 days after the half. No 3:30 marathon target is stored or displayed anywhere in the app.

It's a single responsive Next.js PWA rather than two separate web/native apps — the whole product surface
(dashboard, calendar, workout logging, race pages, progress charts) is one polished, installable web app that
behaves like a native app on a phone and holds up on desktop. See "Why one app, not two" below.

## 1. Project overview

The plan (Sep 16 – Dec 6, 2026, 82 days) is fully modeled in Supabase: races, training weeks/phases, daily
workouts, and interval structures. The UI never hard-codes training content — every screen reads live from
Supabase, with loading/error/empty states throughout. `src/lib/training/plan-data.ts` is the single
canonical transcription of the supplied plan; it's used only to seed the database (on sign-up and via
`npm run seed`), never imported directly by any page.

## 2. Architecture

```
src/
  app/
    (auth)/login/          sign in / sign up / magic link
    auth/callback/         Supabase auth code exchange (magic link, email confirm)
    (app)/                 authenticated shell (Sidebar + BottomNav)
      dashboard/           today's workout, race countdowns, weekly summary
      plan/                the six training phases
      calendar/            month/week calendar, day detail dialog
      log/                 workout log + daily subjective log
      races/               races list, A-race page, Singapore page
      progress/            charts
      settings/            profile, theme, notifications
    manifest.ts            PWA manifest (app/manifest.webmanifest)
  components/
    ui/                    small primitives (button, card, dialog, tabs, ...)
    layout/                Sidebar, BottomNav, mobile header, theme toggle
    dashboard/, calendar/, workouts/, races/, pace/, progress/, settings/
  lib/
    supabase/              browser/server/middleware Supabase clients + hand-typed Database
    training/               domain layer: types, pace math, date math, phases, aggregation,
                             Supabase queries (reads) and Server Actions (writes)
    auth/actions.ts        sign-up/sign-in/magic-link/password-reset/sign-out + per-user plan seeding
    offline/workout-queue.ts  localStorage-backed queue for workout completions made offline
  middleware.ts             refreshes the Supabase session cookie, guards authenticated routes
supabase/migrations/0001_init.sql   full schema, indexes, RLS policies
scripts/seed.ts             repeatable CLI seed script (service-role key)
scripts/validate-plan.ts    validates plan-data.ts against the supplied spec
tests/                      Vitest unit tests
```

Business logic (pace math, date/timezone math, phase boundaries, weekly aggregation) lives in
`src/lib/training/*` as framework-free functions, unit-tested independently of any UI or network call.

### Why one app, not two

The spec allows either an Expo+Next.js pair or a single polished responsive PWA when maintaining two apps
would add complexity without benefit. A running log's UI (cards, calendar, forms, charts) doesn't need native
APIs beyond what a PWA already gets on modern iOS/Android (install to home screen, offline shell, browser
notifications) — so this repo ships one Next.js codebase, one design system, and one data layer, and spends
the saved effort on UI polish and real Supabase wiring instead of on cross-platform plumbing.

## 3. Tech stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (CSS-first `@theme`, light/dark tokens)
- Supabase: Postgres, Auth, Row Level Security, `@supabase/ssr` for cookie-based sessions
- Radix UI primitives (Dialog, Tabs, Select, Switch, Progress, Label) + `class-variance-authority`
- Recharts for progress charts
- `date-fns` + hand-rolled fixed-offset Asia/Bangkok date math (see §10)
- Vitest for unit tests
- A hand-written `public/sw.js` service worker for the read-only offline app shell (no external PWA library)

## 4. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page. **Never** prefix this with `NEXT_PUBLIC_` or import it from
     any file reachable by the browser bundle — it's only read by `scripts/seed.ts`, a standalone Node script.
3. Run the migration (§5) and sign up in the app once (§7) — or seed directly via the CLI script (§6).

## 5. Database migrations

Schema, indexes, constraints, and RLS policies all live in `supabase/migrations/0001_init.sql` — no table
was created by hand through the dashboard.

```bash
# with the Supabase CLI, linked to your project
supabase link --project-ref your-project-ref
supabase db push

# or, for local development against the Supabase CLI's local Postgres:
supabase start
supabase migration up
```

Tables: `profiles`, `races`, `training_weeks`, `workouts`, `workout_intervals`, `daily_logs`, `body_metrics`.
Every user-owned table has an RLS policy restricting `select/insert/update/delete` to `auth.uid() = user_id`
(and `workout_intervals`, which has no `user_id` of its own, checks ownership through its parent workout).
`body_metrics` is fully optional and never required for normal app usage.

## 6. Seed instructions

The full plan seeds itself automatically the first time an athlete signs up or clicks a magic link (see
`seedPlanForUser` in `src/lib/auth/actions.ts`) — no manual step needed for the primary flow.

To (re-)seed an existing account from the command line (useful after editing `plan-data.ts`, or to reset):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_EMAIL=you@example.com npm run seed
```

This clears and re-inserts that user's races/training_weeks/workouts/workout_intervals — idempotent and
repeatable. Before seeding, validate the source data against the supplied spec:

```bash
npm run validate:plan
```

This prints a pass/fail report (all 82 workout dates present, no duplicates, race dates/distances/paces
correct, the 8-day recovery bridge present, Nov 28 marked A-race / Nov 22 tune-up / Dec 6 secondary, etc.).

## 7. Authentication

Supabase Auth, email/password and magic link, via `src/lib/auth/actions.ts` (Server Actions) and
`src/middleware.ts` (session refresh + route protection — every route except `/login` and `/auth/*` requires
a signed-in user). A brand-new sign-up seeds the full training plan for that user immediately.

## 8. Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase values
npm run dev
```

Without Supabase env vars configured, every page renders a clear "Supabase is not configured" state instead
of crashing or showing fake data — useful for confirming the build works before wiring a real project.

## 9. Testing, type checking, linting

```bash
npm run test        # Vitest — pace math, date/timezone math, aggregation, plan-data integrity (27 tests)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build         # production build (also type-checks)
```

Covered explicitly: `21.1 km @ 4:30/km ≈ 1:35:00`, `Nov 28 → Dec 6 = 8 days`, `Sep 17 → Nov 28 = 72 days`,
`Sep 17 → Dec 6 = 80 days`, `10 km in 48:20 → 4:50/km`, Asia/Bangkok date handling across UTC day
boundaries, weekly mileage/completion aggregation, and every one of the 82 supplied workout dates.

## 10. Date/timezone handling

The plan runs on **Asia/Bangkok**, which is a fixed UTC+7 offset with no DST — so `src/lib/training/dates.ts`
anchors every plan date to `T00:00:00+07:00` and does all day-count math in raw epoch milliseconds. This
avoids any dependency on the *host* runtime's timezone (a Vercel server in `UTC`, a browser in `America/Los_Angeles`,
etc. all compute the same calendar day and the same countdown). Countdowns (`daysUntil`) are always computed
from the current instant — never a hard-coded number — so "72 days" and "80 days" on the dashboard are live.

## 11. Production deployment

Any Next.js host works (Vercel is the path of least resistance):

1. Push this repo, import it into Vercel.
2. Set the three `NEXT_PUBLIC_*`/`SUPABASE_SERVICE_ROLE_KEY` env vars from §4 in the project settings
   (the service-role key only needs to exist if you plan to run `scripts/seed.ts` from CI/locally against
   prod — it is never read by the deployed app itself).
3. Run the migration against the production Supabase project (§5).
4. Deploy. Sign up once in the deployed app to seed your plan, or run `npm run seed` against prod.

## 12. PWA / mobile

- `src/app/manifest.ts` — installable manifest (standalone display, brand icons in `public/icons/`).
- `public/sw.js` — caches the app shell (`/dashboard`, `/calendar`, `/plan`, `/log`) so previously visited
  pages stay viewable offline; a small "Offline" badge (`ConnectionStatus`) appears when `navigator.onLine`
  is false. Workout completions made offline are queued to `localStorage`
  (`src/lib/offline/workout-queue.ts`) rather than dropped — the logging dialog saves normally, and
  `<OfflineQueueSync />` automatically flushes the queue and syncs each entry to Supabase once the
  connection returns, showing a small pending-count badge while items are waiting.
- Bottom tab bar (Home/Plan/Calendar/Log/More) on mobile widths, a fixed sidebar (Dashboard/Training
  Plan/Calendar/Workout Log/Races/Progress/Settings) from `md:` up.
- Marking a workout complete from the dashboard's "Start Workout" button is 2 taps (open the logger, tap
  "Mark Complete" with distance/time pre-filled where possible).
- The calendar supports touch swipe between weeks/months in addition to the arrow buttons.
- Browser notification preferences live in Settings (`NotificationSettings`) — permission request plus
  toggles for morning workout, race countdown, rest day, and completion reminders, persisted to
  `localStorage`. These are foreground/local notifications; wiring true background push (service worker
  `push` events driven by a scheduled server job) is a documented extension point, not implemented here, since
  it requires a push backend beyond what "if practical" in the spec calls for.

## 13. Data-integrity notes (what was preserved vs. clarified)

- Every one of the 82 supplied days (2026-09-16 → 2026-12-06) is present exactly once — verified by
  `npm run validate:plan` and `tests/plan-data.test.ts`.
- Formatting typos in the source (e.g. `5:30/kmq`) are corrected to `5:30/km`; no workout content changed.
- Where the plan gave a range or left a structure unspecified ("8-10x400m", "Speed — cutback week", "Short
  reps @ half pace", "3-4x100m strides"), no interval count/distance was invented — those workouts store the
  given text in `notes` and have no `workout_intervals` rows. Structured interval rows exist only where the
  plan gave both an exact rep count and per-rep distance (e.g. `8×400m`, `5×1km`, `3×3km`).
- The `workouts` table has both `target_pace_min_sec_per_km` (text, preserves the plan's exact wording,
  including ranges like `5:15-5:45/km`) and `pace_min_sec_per_km` (integer seconds/km, the primary/working
  pace, for charts and pace-zone matching) — see the comment at the top of `plan-data.ts`.
- The Singapore Marathon race row has `goal_time_seconds: null` and `goal_pace_seconds_per_km: null` by
  design — a 3:30 target is never stored or displayed; only the suggested 4:50-5:00/km starting pace,
  labeled as guidance, appears in its `notes` and on the Singapore race page.

## 14. Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run validate:plan` | Validate `plan-data.ts` against the supplied spec |
| `npm run seed` | Seed/reset the training plan for one athlete account |

## 15. Known follow-ups (documented, not silently skipped)

- True background push notifications (requires a scheduled server-side sender) — local/foreground
  notification preferences are implemented and documented as such in Settings.
- A dedicated native Expo app — deliberately out of scope in favor of one polished PWA (see §2).

Closed: offline writes (queued via `localStorage` in `src/lib/offline/workout-queue.ts` and flushed by
`OfflineQueueSync` on reconnect), password reset (`/auth/reset-password`), an edit-workout UI wired to
the existing `modifyWorkout` action, and an optional body-metrics log (weight/resting HR) with charts on
the Progress page.

Also closed: race editing (name/date/distance/goal time/goal pace/notes, from `/races/a-race` and
`/races/singapore`), editing a completed workout's logged distance/time/effort/notes in place, and
VO2max (a manual log field on the body-metrics form plus an auto-estimate computed from the
athlete's best completed race effort, both on the Progress page).
