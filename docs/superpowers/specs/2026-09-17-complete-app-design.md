# Complete the App — Design Spec

**Status:** Approved
**Context:** Phase 1 foundation (commit `8796f62`) shipped a fully-wired Supabase-backed
training PWA — see `README.md` for the full architecture and feature list. The
Supabase-removal-in-favor-of-localStorage plan (`2026-09-17-remove-supabase-localstorage-design.md`)
was evaluated and **rejected**: Supabase stays as the backend.

A follow-up audit (2026-09-17) confirmed the app is otherwise in solid shape — all 7 routes
read live Supabase data with loading/error/empty states, and `typecheck`/`lint`/`test` (27
tests) are all green. Five gaps were found; this spec scopes which ones to close now.

## In scope

1. **Password reset ("forgot password")** — `src/app/(auth)/login/auth-form.tsx` has
   sign-in/sign-up/magic-link but no way to recover a forgotten password. Add a
   `resetPasswordForEmail` flow: a "Forgot password?" link on the sign-in tab, and a
   `/auth/reset-password` page for setting a new password after clicking the emailed link.

2. **Offline write queue for workout completions** — `WorkoutLogger.handleComplete`
   (`src/components/workouts/workout-logger.tsx:40-53`) calls the `completeWorkout` server
   action directly; if the network is down, the call throws and the dialog just shows an
   error, losing the athlete's input. Queue the completion in `localStorage` when the network
   call fails, flush the queue automatically when the browser comes back online, and surface
   a small "N pending sync" indicator so it's never a silent loss.

3. **Edit-workout UI** — `modifyWorkout` (`src/lib/training/actions.ts:126-151`) is fully
   implemented (updates `distance_km` and `athlete_notes`, sets `status: "modified"`) but no
   UI calls it. Add an "Edit" affordance to the workout detail view (open before a workout is
   completed) that lets the athlete adjust the planned distance and note why, backed by the
   existing action — no new backend code needed.

4. **Body-metrics log** — the `body_metrics` table, RLS policies, and TypeScript types already
   exist (`supabase/migrations/0001_init.sql:131-143`, `src/lib/training/types.ts:102-109`) but
   have zero queries, actions, or UI. Add a same-page-as-daily-log form (weight in kg, resting
   HR, optional notes; one row per day, upsert by `(user_id, date)` exactly like `daily_logs`)
   and a weight-over-time / resting-HR-over-time chart on the Progress page. Entirely optional,
   never required, matching how `daily_logs` is already treated.

## Explicitly out of scope (for this plan)

- **True background push notifications** — requires a scheduled server-side sender and
  `push` event handling in `public/sw.js`; bigger infra lift (subscription storage, a cron/queue)
  than the other four items. Deferred; `NotificationSettings` (local/foreground prefs) is
  unchanged.
- **A native Expo app** — already explicitly out of scope per `README.md` §2.
- Anything not listed above (the rest of the audit came back clean — no stubs, no broken
  pages, no schema/query mismatches).

## Design decisions

- **No new database migration.** `body_metrics` (table + indexes + RLS) already exists in
  `0001_init.sql`; only application code (queries/actions/UI) is new.
- **Password reset reuses the existing PKCE callback route** (`src/app/auth/callback/route.ts`),
  which already reads a `redirectTo` query param and exchanges the code for a session — the
  reset flow passes `redirectTo=/auth/reset-password` through it rather than adding a second
  code-exchange route.
- **Offline queue detection is "the server action call threw"**, not a `navigator.onLine`
  check up front — a `fetch`/Server Action invocation while offline rejects, which is the
  actual signal `WorkoutLogger` needs to catch. `navigator.onLine` is used only to decide
  when to *retry* the queue (on the browser `online` event and once on mount).
- **Body-metrics UI mirrors `DailyLogForm` exactly** (same page, same upsert-by-date shape,
  same "optional, never required" framing) rather than inventing a new pattern.
- **Edit-workout is only offered before a workout is completed.** Editing a completed
  workout's planned distance would conflict with the already-displayed actual
  distance/pace/effort card; `resetWorkout` already exists as the escape hatch for a
  completed entry.

## Verification

Each task lands independently buildable and testable. Final acceptance for the whole plan:
`npm run typecheck && npm run lint && npm run test && npm run build` all green (matching the
pre-existing baseline), plus a manual pass in the running dev server for each of the four
features (see the plan's per-task manual-verification steps — this app has no component-level
test harness, matching the existing `tests/` convention of testing only framework-free logic).
