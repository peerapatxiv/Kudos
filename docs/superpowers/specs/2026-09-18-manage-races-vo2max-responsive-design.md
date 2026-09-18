# Manageable Race/Pace/Time Data, VO2max, and Responsive Polish — Design Spec

**Status:** Approved
**Context:** The previous plan (`2026-09-17-complete-app-design.md`) closed password reset, the
offline write queue, edit-workout, and body metrics. A follow-up audit for this spec found the
remaining gap in "manageability": races are seed-script-only with no edit UI, a *completed*
workout's logged distance/time/pace/effort can only be corrected by resetting it (losing all
data) and re-logging from scratch, and there is no VO2max feature at all. Separately, the app's
responsive scaffolding (`Sidebar`/`BottomNav`/`MobileHeaderBar`, swipeable calendar, `Recharts`
`ResponsiveContainer` everywhere) is already solid — this spec adds a scoped audit pass rather
than assuming specific breakage.

## In scope

1. **Editable races** — `src/lib/training/actions.ts` has no race-writing action at all; races
   only change via `scripts/seed.ts`. Add an `updateRace` action and an `EditRaceDialog` reachable
   from the A-race and secondary-race pages, so name/date/distance/goal time/goal pace/notes can
   be corrected without re-seeding.

2. **Editable logged workouts** — `modifyWorkout` only ever touches `distance_km`/`athlete_notes`
   and is only offered before completion (`EditWorkoutDialog`, gated on `!workout.completed` in
   `workout-detail-content.tsx:127`). Add a second action, `editCompletedWorkout`, and extend
   `EditWorkoutDialog` to branch on completion state so a completed workout's actual
   distance/time/effort/notes can be corrected in place — `resetWorkout` remains the escape hatch
   for "start over," this is for "fix a typo."

3. **VO2max** — two independent, additive pieces:
   - **Manual log**: an optional `vo2max` field alongside weight/resting HR on `BodyMetricsForm`
     (for anyone reading an estimate off a watch), charted on Progress exactly like weight/HR.
   - **Auto-estimate**: a pure `estimateVo2max(distanceKm, timeSeconds)` function implementing the
     Daniels–Gilbert VDOT formula, applied to the athlete's best completed race-effort workout
     (`workout_type === "race"`, `completed`, has actual distance + time) and shown as a small
     stat on Progress — no watch required.

4. **Responsive/UX audit pass** — walk every route (`Dashboard`, `Calendar`, `Plan`, `Log`,
   `Progress`, `Races` + its two sub-pages, `Settings`, `More`) at 320px, 375px, and 768px in dev
   tools and fix whatever is actually found (overflow, cramped stat tiles, dialog width, touch
   target size, chart legend wrap). No changes are pre-committed here beyond fixing what's found —
   this is a verification task, not a redesign.

## Explicitly out of scope

- **Changing race `priority`** — `getRaceByPriority("a_race"|"secondary")` uses `.maybeSingle()`
  and the app's routing (`/races/a-race`, `/races/singapore`) is hardcoded to one race per
  priority. Editing priority, or adding/deleting races, would let two races collide on the same
  priority and break those pages. Only the non-priority fields are editable.
- **Any new database migration for races** — no schema change needed; `updateRace` writes to
  existing columns.
- **Merging manual VO2max entries with the auto-estimate into one series** — they're shown as two
  separate, clearly-labeled things (a logged trend vs. a computed estimate) rather than one
  ambiguous line. Simpler to build, simpler to read.
- **A full visual redesign** — no new design tokens, colors, or components; the audit pass reuses
  `bg-surface`/`border-border`/`text-muted`/`Card`/`Button`/etc. exactly as they exist today.

## Design decisions

- **`updateRace` mirrors the existing action shape**: `Promise<ActionResult>`, ownership-scoped by
  `.eq("id", input.raceId).eq("user_id", user.id)`, `revalidatePath` for every route that reads a
  race (`/races`, `/races/a-race`, `/races/singapore`, `/dashboard`, `/calendar`). Lives in
  `src/lib/training/actions.ts` next to the other write actions — no new `races-actions.ts` file,
  matching how `body_metrics`/`daily_logs`/`profiles` all share that one file today.
- **`EditRaceDialog` is a client "island"** mounted next to each race page's header (the pages
  themselves are server components). Distance stays a plain number input; goal time reuses
  `parseDurationToSeconds`/`formatDuration` from `src/lib/training/pace.ts` (already used by the
  pace calculator) instead of inventing a new time-input format.
- **`editCompletedWorkout` is a separate action from `modifyWorkout`**, not an overload, because
  the two operate on disjoint fields (`distance_km`/`athlete_notes` + `status: "modified"` vs.
  `actual_*` fields with `status` left as `"completed"`) — keeping them separate avoids a
  conditional-shape input and matches the existing one-action-per-intent pattern
  (`completeWorkout`/`skipWorkout`/`resetWorkout`/`modifyWorkout` are already four separate
  actions rather than one polymorphic one). `EditWorkoutDialog` picks the field set and the action
  to call based on `workout.completed`, and the edit (pencil) button in
  `workout-detail-content.tsx` moves to being shown in *both* the completed and not-completed
  button rows, not just the latter.
- **VO2max manual field**: new nullable `vo2max numeric(4,1)` column on `body_metrics` via a new
  migration (`0002_body_metrics_vo2max.sql`) — additive, no backfill needed, matches how that
  table already treats every field as optional. `BodyMetricsForm`'s stat grid goes from
  `grid-cols-2` to `grid-cols-2 sm:grid-cols-3` to fit the third field without cramming three
  inputs into two narrow mobile columns.
- **VO2max auto-estimate uses the athlete's single best completed race effort**, not a trend —
  Daniels' formula is calibrated to genuine race effort, and this app only has real race data for
  events the athlete has actually raced through it (workouts with `workout_type: "race"`). Picking
  "best" (highest resulting VDOT) rather than "most recent" avoids a slow tune-up race dragging
  the number down. If no qualifying workout exists yet, the stat simply doesn't render (same
  "optional, never required" convention as body metrics).
- **The VDOT formula** (Daniels & Gilbert):
  `velocity = distanceKm * 1000 / (timeSeconds / 60)` (m/min);
  `vo2 = -4.60 + 0.182258·v + 0.000104·v²`;
  `pctMax = 0.8 + 0.1894393·e^(-0.012778·t) + 0.2989558·e^(-0.1932605·t)` where `t = timeSeconds / 60`;
  `VDOT = vo2 / pctMax`. Implemented as one pure, unit-tested function in a new
  `src/lib/training/vo2max.ts`, matching the existing `tests/`-covers-framework-free-logic
  convention (`pace.test.ts`, `dates.test.ts`).
- **Responsive audit has no pre-written fix list.** The plan's audit task runs `npm run dev`,
  checks each route against a fixed viewport checklist, and fixes only what's actually broken —
  consistent with "don't propose unrelated refactoring" and avoiding speculative changes to code
  that already works.

## Verification

Each task lands independently buildable and testable, matching the existing convention:
`npm run typecheck && npm run lint && npm run test` green after every task, `npm run build` at the
end. `estimateVo2max` gets unit tests (framework-free). Race editing, completed-workout editing,
and the VO2max UI get manual browser verification (this app has no component-test harness). The
responsive audit's "verification" *is* its manual pass across the viewport checklist above.
