# Remove Supabase, use browser localStorage — design spec

Date: 2026-09-17
Author: Claude Sonnet 5 (with Peerapat P.)

## Context

Phase 1 shipped with Supabase (Postgres, Auth, RLS) as the persistence and
auth layer. No Supabase project was ever created (`.env.local` never
existed), and the athlete wants a single-user, fully local app instead: no
backend, no login, no network dependency. This spec replaces Supabase with
browser `localStorage` as the sole data store.

## Goals

- Remove all Supabase dependencies, code, and config from the app.
- Remove authentication entirely — the app opens straight to the dashboard.
- Persist all app data (races, training weeks, workouts, workout intervals,
  daily logs, body metrics, profile/settings) in the browser's
  `localStorage`, seeded on first load from the existing canonical
  `src/lib/training/plan-data.ts`.
- Preserve the existing domain layer (`src/lib/training/pace.ts`,
  `dates.ts`, `phases.ts`, `aggregate.ts`, `pace-zones.ts`, `types.ts`) and
  its unit tests unchanged — none of it depends on Supabase.
- Keep the app's page structure, routes, and UI components as similar as
  possible to minimize churn; the change is in how data is loaded/saved,
  not what the screens look like.

## Non-goals

- No multi-device sync, no cloud backup, no real auth. This is explicitly a
  single-browser, single-user app now.
- No IndexedDB, no service-worker-driven mutation queue. The existing plan
  data is small (82 days, a handful of entities per day) and fits
  comfortably in `localStorage`'s ~5MB quota; this is not solved with a
  heavier storage API.
- No change to the visual design system, routing structure, or PWA shell
  (`manifest.ts`, `public/sw.js`) beyond removing the auth-gate assumption
  from the service worker's cached routes.

## Architecture

### Storage layer: `src/lib/storage/`

A new module replaces `src/lib/supabase/*`, `src/lib/auth/*`, and the
Supabase-backed parts of `src/lib/training/queries.ts` / `actions.ts`:

- `store.ts` — reads/writes a single JSON document under localStorage key
  `cockpit:v1`, shaped as:
  ```ts
  interface CockpitData {
    version: 1;
    profile: Profile;
    races: Race[];
    trainingWeeks: TrainingWeek[];
    workouts: Workout[]; // each with embedded `intervals: WorkoutInterval[]`
    dailyLogs: DailyLog[];
    bodyMetrics: BodyMetric[];
  }
  ```
  Workout intervals are embedded on their parent workout rather than a
  separate top-level array — there is no cross-entity query need that
  justifies keeping them split the way Postgres normalization required.
- `seed.ts` — pure function building the initial `CockpitData` from
  `plan-data.ts`. Called by `store.ts` exactly once, the first time no
  `cockpit:v1` key exists.
- `use-cockpit-store.ts` — a React hook (`useCockpitStore()`) that loads
  the document on mount, exposes it as state, and exposes mutation
  functions (`completeWorkout`, `saveDailyLog`, `updateProfile`,
  `logBodyMetric`, `resetPlan`) that mutate localStorage and update state
  together. This is the one seam every page/component uses — no direct
  `localStorage` access outside this module.
- A `CockpitProvider` (React Context) wraps the authenticated app shell so
  the store is loaded once and shared, not re-read per page.

### Rendering pattern

`localStorage` isn't available during SSR, so every page currently under
`(app)/*` that reads training data becomes (or already is) a Client
Component consuming `useCockpitContext()`. Pages render a lightweight
loading state until the store finishes its initial-mount read (this also
sidesteps any SSR/hydration mismatch — the server renders the loading
state, the client fills in real data after mount). Purely static pages
(e.g. `/login` — being deleted) are unaffected.

Server Actions (`"use server"` functions in `actions.ts`) go away for
these mutations — there's no server-side data to act on. Mutations become
plain client-side functions returned by `useCockpitStore()`.

### Auth removal

- Delete: `src/app/(auth)/login/`, `src/app/auth/callback/`,
  `src/middleware.ts`, `src/lib/auth/actions.ts`.
- `src/app/layout.tsx` / `(app)/layout.tsx` collapse into a single
  authenticated-by-default shell — no route protection needed.
- The root `/` page redirects straight to `/dashboard` instead of to
  `/login`.

### Deletions

- `supabase/` (migrations directory)
- `src/lib/supabase/` (client.ts, server.ts, middleware.ts, env.ts,
  database.types.ts)
- `src/lib/auth/`
- `scripts/seed.ts` (no remote DB to seed against)
- `@supabase/ssr`, `@supabase/supabase-js` from `package.json`
- Supabase env vars from `.env.example` (the file itself is removed
  entirely unless a future setting needs it — none is anticipated)
- Supabase-specific sections of `README.md` (§4 Supabase setup, §5
  migrations, part of §6 seed instructions, §7 authentication) rewritten
  to describe the localStorage model instead

### What's kept as-is

- `src/lib/training/{pace,dates,phases,aggregate,pace-zones,types,plan-data}.ts`
  — untouched, framework-free, already unit-tested.
- `scripts/validate-plan.ts` / `npm run validate:plan` — untouched, only
  validates `plan-data.ts` structure.
- UI components (`components/dashboard/*`, `components/workouts/*`,
  `components/calendar/*`, `components/races/*`, `components/progress/*`,
  `components/settings/*`) keep their existing props/shapes as much as
  possible; they're rewired to the new hook rather than rewritten.
- PWA shell, theming, notification-preference localStorage usage (already
  local) are unaffected.

## Data flow example (workout completion)

1. User opens `/dashboard` → `CockpitProvider` has already loaded
   `cockpit:v1` (or seeded it if absent) into context.
2. `TodayWorkoutCard` reads today's workout from context.
3. User taps "Mark Complete" in `WorkoutLogger` → calls
   `completeWorkout(workoutId, { distanceKm, durationSeconds })` from the
   hook.
4. The hook updates the in-memory `CockpitData`, writes the full document
   back to `localStorage`, and triggers a React re-render — no network
   round trip, no loading spinner beyond the initial mount.

## Error handling

`localStorage` can throw (quota exceeded, private-browsing restrictions in
some browsers, disabled storage). `store.ts` wraps reads/writes in
try/catch; on failure, `useCockpitStore()` surfaces an explicit error
state ("Local storage isn't available in this browser") reusing the
existing `ErrorState` component — mirroring how the app already handles
"Supabase not configured" today, just for a different failure mode.

## Testing

- New `tests/storage.test.ts`: seed-on-empty produces valid `CockpitData`
  matching `plan-data.ts`; write-then-read round-trips; `resetPlan()`
  restores the seed; corrupt/missing localStorage falls back to
  re-seeding rather than crashing.
- Existing `pace.test.ts`, `dates.test.ts`, `aggregate.test.ts`,
  `plan-data.test.ts` are unaffected and keep passing.
- Manual verification: run the app in a browser, confirm dashboard loads
  seeded data with no `.env.local`, complete a workout, reload the page,
  confirm the completion persisted.

## Migration/rollout notes

This is a greenfield swap — no real users, no existing Supabase project,
so there's no data migration path to design. The `docs/superpowers/`
plan/spec docs describing the Supabase-based Phase 1 are historical; this
spec supersedes their persistence-layer sections.
