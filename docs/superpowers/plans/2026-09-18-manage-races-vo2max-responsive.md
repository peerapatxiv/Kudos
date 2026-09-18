# Manageable Race/Pace/Time Data, VO2max, and Responsive Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the athlete edit race details and correct a completed workout's logged numbers
in-app (no more seed-script-only races or reset-and-relose-data), add a VO2max feature (manual
log + auto-estimate from race performance), and fix any real mobile/responsive issues found across
the app.

**Architecture:** Every task adds to the existing layered architecture
(`src/lib/training/queries.ts` reads, `src/lib/training/actions.ts` / writes, thin client
components for forms/dialogs) without introducing new patterns. One new table column
(`body_metrics.vo2max`) via a new migration; no other schema changes.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict, Supabase (`@supabase/ssr`),
Tailwind v4, Radix UI, Recharts, Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-18-manage-races-vo2max-responsive-design.md`

## Global Constraints

- Every Server Action returns `{ ok: boolean; error?: string }` (the existing
  `ActionResult` shape) and calls `revalidatePath` for every route that reads the data it writes.
- Every query function returns the existing `QueryResult<T>` discriminated union and lives in
  `src/lib/training/queries.ts` with `import "server-only"`.
- Unit tests only cover framework-free logic (this repo has no React component-testing library
  installed; do not add one).
- Every task must leave `npm run typecheck`, `npm run lint`, and `npm run test` green before its
  commit.
- Reuse existing Tailwind tokens/components (`bg-surface`, `border-border`, `text-muted`,
  `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Button`, `Input`, `Label`,
  `Dialog*`) — no new design tokens.
- Race `priority` is never editable — `getRaceByPriority` assumes exactly one race per priority
  and the `/races/a-race` and `/races/singapore` routes are hardcoded to specific priorities.
- `editCompletedWorkout` only ever touches a workout that is already `completed`; `modifyWorkout`
  (pre-completion editing) is untouched.

---

## Task 1: VO2max — migration and schema types

**Files:**
- Create: `supabase/migrations/0002_body_metrics_vo2max.sql`
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `src/lib/training/types.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `body_metrics.vo2max` column, `BodyMetric.vo2max: number | null` — consumed by Task 3
  and Task 4.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_body_metrics_vo2max.sql`:

```sql
-- Adds an optional manually-logged VO2max reading to body_metrics.
-- Never required — matches the existing "optional, never required" convention
-- for every other body_metrics field.
alter table public.body_metrics
  add column if not exists vo2max numeric(4, 1);
```

- [ ] **Step 2: Update the hand-typed Database types**

In `src/lib/supabase/database.types.ts`, change:

```ts
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight_kg: number | null;
          resting_hr: number | null;
          notes: string | null;
        };
```

to:

```ts
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight_kg: number | null;
          resting_hr: number | null;
          vo2max: number | null;
          notes: string | null;
        };
```

(The `Insert` type is `Partial<Row> & { user_id: string; date: string }`, so it already picks up
`vo2max` as optional — no further change needed there.)

- [ ] **Step 3: Update the `BodyMetric` domain type**

In `src/lib/training/types.ts`, change:

```ts
export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  resting_hr: number | null;
  notes: string | null;
}
```

to:

```ts
export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  resting_hr: number | null;
  vo2max: number | null;
  notes: string | null;
}
```

- [ ] **Step 4: Apply the migration locally (if using a local Supabase stack) and typecheck**

Run: `npm run typecheck`
Expected: no errors.

If you have a local Supabase instance running for this project, also run:
`supabase migration up` (or your project's usual migration-apply command) so the local database
matches the new type. If there's no local Supabase stack, this is fine — the migration will apply
the next time it's run against a real database (matching how `0001_init.sql` is applied).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_body_metrics_vo2max.sql src/lib/supabase/database.types.ts src/lib/training/types.ts
git commit -m "feat: add vo2max column to body_metrics"
```

---

## Task 2: VO2max — estimation function and unit tests

**Files:**
- Create: `src/lib/training/vo2max.ts`
- Test: `tests/vo2max.test.ts`

**Interfaces:**
- Consumes: nothing new (pure math).
- Produces: `estimateVo2max(distanceKm: number, timeSeconds: number): number | null` — consumed by
  Task 4.

- [ ] **Step 1: Write the failing tests**

Create `tests/vo2max.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimateVo2max } from "@/lib/training/vo2max";

describe("estimateVo2max", () => {
  it("returns null for non-positive distance", () => {
    expect(estimateVo2max(0, 2400)).toBeNull();
    expect(estimateVo2max(-5, 2400)).toBeNull();
  });

  it("returns null for non-positive time", () => {
    expect(estimateVo2max(10, 0)).toBeNull();
    expect(estimateVo2max(10, -100)).toBeNull();
  });

  it("estimates a plausible VDOT for a 20-minute 5K", () => {
    // A well-known reference effort: 5km in 20:00 is commonly cited as ~VDOT 50.
    const result = estimateVo2max(5, 1200);
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(45);
    expect(result as number).toBeLessThan(55);
  });

  it("gives a higher VDOT for a faster time at the same distance", () => {
    const slower = estimateVo2max(10, 2700);
    const faster = estimateVo2max(10, 2400);
    expect(slower).not.toBeNull();
    expect(faster).not.toBeNull();
    expect(faster as number).toBeGreaterThan(slower as number);
  });

  it("gives a higher VDOT for holding the same pace over a longer distance", () => {
    // Same 4:00/km pace, 5K (20:00) vs 10K (40:00) — sustaining it twice as long
    // implies a higher underlying aerobic capacity.
    const fiveK = estimateVo2max(5, 1200);
    const tenK = estimateVo2max(10, 2400);
    expect(fiveK).not.toBeNull();
    expect(tenK).not.toBeNull();
    expect(tenK as number).toBeGreaterThan(fiveK as number);
  });

  it("rounds to one decimal place", () => {
    const result = estimateVo2max(10, 2400) as number;
    expect(Math.round(result * 10) / 10).toBe(result);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/vo2max.test.ts`
Expected: FAIL — `Cannot find module '@/lib/training/vo2max'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/training/vo2max.ts`:

```ts
/**
 * Estimated VO2max (VDOT) from a single race performance, using the
 * Daniels-Gilbert formula (Daniels' Running Formula). Calibrated to genuine
 * race effort — pass in a completed race's actual distance and time, not an
 * easy training run.
 */
export function estimateVo2max(distanceKm: number, timeSeconds: number): number | null {
  if (distanceKm <= 0 || timeSeconds <= 0) return null;

  const velocityMetersPerMinute = (distanceKm * 1000) / (timeSeconds / 60);
  const vo2 =
    -4.6 + 0.182258 * velocityMetersPerMinute + 0.000104 * velocityMetersPerMinute ** 2;

  const minutes = timeSeconds / 60;
  const percentMax =
    0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);

  return Math.round((vo2 / percentMax) * 10) / 10;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/vo2max.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run test && npm run typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/training/vo2max.ts tests/vo2max.test.ts
git commit -m "feat: add VO2max estimation function"
```

---

## Task 3: VO2max — manual field on the body-metrics form

**Files:**
- Modify: `src/lib/training/actions.ts`
- Modify: `src/components/workouts/body-metrics-form.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `BodyMetricInput.vo2max` field, persisted by `upsertBodyMetric` — consumed by Task 4
  (the Progress page reads it back via the already-existing `getBodyMetrics`/`getBodyMetricByDate`,
  which `select("*")` and will include the new column automatically now that Task 1 typed it).

- [ ] **Step 1: Add `vo2max` to `BodyMetricInput` and `upsertBodyMetric`**

In `src/lib/training/actions.ts`, change:

```ts
export interface BodyMetricInput {
  date: string;
  weightKg?: number | null;
  restingHr?: number | null;
  notes?: string | null;
}

export async function upsertBodyMetric(input: BodyMetricInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      date: input.date,
      weight_kg: input.weightKg ?? null,
      resting_hr: input.restingHr ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/log");
  revalidatePath("/progress");
  return { ok: true };
}
```

to:

```ts
export interface BodyMetricInput {
  date: string;
  weightKg?: number | null;
  restingHr?: number | null;
  vo2max?: number | null;
  notes?: string | null;
}

export async function upsertBodyMetric(input: BodyMetricInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      date: input.date,
      weight_kg: input.weightKg ?? null,
      resting_hr: input.restingHr ?? null,
      vo2max: input.vo2max ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/log");
  revalidatePath("/progress");
  return { ok: true };
}
```

- [ ] **Step 2: Add the VO2max input to `BodyMetricsForm`**

In `src/components/workouts/body-metrics-form.tsx`, change:

```tsx
export function BodyMetricsForm({ date, initial }: { date: string; initial: BodyMetric | null }) {
  const [weight, setWeight] = useState(initial?.weight_kg != null ? String(initial.weight_kg) : "");
  const [restingHr, setRestingHr] = useState(initial?.resting_hr != null ? String(initial.resting_hr) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedWeight = weight.trim();
      const weightKg = trimmedWeight === "" ? null : Number(trimmedWeight);
      if (weightKg !== null && Number.isNaN(weightKg)) {
        setError("Enter a valid weight, or leave it blank.");
        return;
      }

      const trimmedHr = restingHr.trim();
      const restingHrValue = trimmedHr === "" ? null : Number(trimmedHr);
      if (restingHrValue !== null && Number.isNaN(restingHrValue)) {
        setError("Enter a valid resting HR, or leave it blank.");
        return;
      }

      const result = await upsertBodyMetric({
        date,
        weightKg,
        restingHr: restingHrValue,
        notes: notes || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save body metrics.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }
```

to:

```tsx
export function BodyMetricsForm({ date, initial }: { date: string; initial: BodyMetric | null }) {
  const [weight, setWeight] = useState(initial?.weight_kg != null ? String(initial.weight_kg) : "");
  const [restingHr, setRestingHr] = useState(initial?.resting_hr != null ? String(initial.resting_hr) : "");
  const [vo2max, setVo2max] = useState(initial?.vo2max != null ? String(initial.vo2max) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedWeight = weight.trim();
      const weightKg = trimmedWeight === "" ? null : Number(trimmedWeight);
      if (weightKg !== null && Number.isNaN(weightKg)) {
        setError("Enter a valid weight, or leave it blank.");
        return;
      }

      const trimmedHr = restingHr.trim();
      const restingHrValue = trimmedHr === "" ? null : Number(trimmedHr);
      if (restingHrValue !== null && Number.isNaN(restingHrValue)) {
        setError("Enter a valid resting HR, or leave it blank.");
        return;
      }

      const trimmedVo2max = vo2max.trim();
      const vo2maxValue = trimmedVo2max === "" ? null : Number(trimmedVo2max);
      if (vo2maxValue !== null && Number.isNaN(vo2maxValue)) {
        setError("Enter a valid VO2max, or leave it blank.");
        return;
      }

      const result = await upsertBodyMetric({
        date,
        weightKg,
        restingHr: restingHrValue,
        vo2max: vo2maxValue,
        notes: notes || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save body metrics.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }
```

- [ ] **Step 3: Add the third field to the form's grid**

Change:

```tsx
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="weight-kg">Weight (kg)</Label>
            <Input
              id="weight-kg"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="68.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resting-hr">Resting HR</Label>
            <Input
              id="resting-hr"
              inputMode="numeric"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="52"
            />
          </div>
        </div>
```

to:

```tsx
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="weight-kg">Weight (kg)</Label>
            <Input
              id="weight-kg"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="68.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resting-hr">Resting HR</Label>
            <Input
              id="resting-hr"
              inputMode="numeric"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="52"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vo2max">VO2max</Label>
            <Input
              id="vo2max"
              inputMode="decimal"
              value={vo2max}
              onChange={(e) => setVo2max(e.target.value)}
              placeholder="52.0"
            />
          </div>
        </div>
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open `/log`, fill in a VO2max value alongside weight/resting HR, click "Save".
Expected: button shows "Saved" briefly; reloading the page shows the value pre-filled; at a narrow
width (< 640px) the three fields wrap to two columns without any of them looking cramped, and at
640px+ they sit in one row of three.

- [ ] **Step 6: Commit**

```bash
git add src/lib/training/actions.ts src/components/workouts/body-metrics-form.tsx
git commit -m "feat: add manual VO2max field to body metrics"
```

---

## Task 4: VO2max — chart and auto-estimate on the Progress page

**Files:**
- Modify: `src/components/progress/progress-charts.tsx`
- Modify: `src/app/(app)/progress/page.tsx`

**Interfaces:**
- Consumes: `estimateVo2max` from `@/lib/training/vo2max` (Task 2), `getBodyMetrics` (already
  wired into the Progress page).
- Produces: `Vo2MaxChart`, `Vo2MaxPoint` — consumed only by the Progress page in this task.

- [ ] **Step 1: Add the `Vo2MaxChart` component**

In `src/components/progress/progress-charts.tsx`, add at the end of the file (after
`RestingHrChart`):

```tsx

export interface Vo2MaxPoint {
  date: string;
  label: string;
  vo2max: number;
}

export function Vo2MaxChart({ data }: { data: Vo2MaxPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>VO2max</CardTitle>
        <CardDescription>Logged VO2max over time.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "VO2max"]} />
            <Line type="monotone" dataKey="vo2max" stroke="var(--recovery)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Wire the chart and the auto-estimate into the Progress page**

In `src/app/(app)/progress/page.tsx`, change the import block:

```tsx
import { getAllWorkouts, getBodyMetrics, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CompletionChart,
  LongRunChart,
  PaceChart,
  RestingHrChart,
  WeeklyMileageChart,
  WeightChart,
  type LongRunPoint,
  type PacePoint,
  type RestingHrPoint,
  type WeeklyMileagePoint,
  type WeightPoint,
} from "@/components/progress/progress-charts";
import { summarizeWeek, completionBreakdown } from "@/lib/training/aggregate";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
```

to:

```tsx
import { getAllWorkouts, getBodyMetrics, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  CompletionChart,
  LongRunChart,
  PaceChart,
  RestingHrChart,
  Vo2MaxChart,
  WeeklyMileageChart,
  WeightChart,
  type LongRunPoint,
  type PacePoint,
  type RestingHrPoint,
  type Vo2MaxPoint,
  type WeeklyMileagePoint,
  type WeightPoint,
} from "@/components/progress/progress-charts";
import { summarizeWeek, completionBreakdown } from "@/lib/training/aggregate";
import { estimateVo2max } from "@/lib/training/vo2max";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
```

Change:

```tsx
  const bodyMetrics = bodyMetricsResult.status === "ok" ? bodyMetricsResult.data : [];
  const weightPoints: WeightPoint[] = bodyMetrics
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), weightKg: m.weight_kg! }));
  const restingHrPoints: RestingHrPoint[] = bodyMetrics
    .filter((m) => m.resting_hr != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), restingHr: m.resting_hr! }));
```

to:

```tsx
  const bodyMetrics = bodyMetricsResult.status === "ok" ? bodyMetricsResult.data : [];
  const weightPoints: WeightPoint[] = bodyMetrics
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), weightKg: m.weight_kg! }));
  const restingHrPoints: RestingHrPoint[] = bodyMetrics
    .filter((m) => m.resting_hr != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), restingHr: m.resting_hr! }));
  const vo2maxPoints: Vo2MaxPoint[] = bodyMetrics
    .filter((m) => m.vo2max != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), vo2max: m.vo2max! }));

  const raceEfforts = workouts.filter(
    (w) => w.workout_type === "race" && w.completed && w.actual_distance_km != null && w.actual_time_seconds != null,
  );
  const vo2maxEstimates = raceEfforts
    .map((w) => ({ workout: w, estimate: estimateVo2max(w.actual_distance_km!, w.actual_time_seconds!) }))
    .filter((e): e is { workout: (typeof workouts)[number]; estimate: number } => e.estimate !== null);
  const bestVo2maxEstimate =
    vo2maxEstimates.length > 0
      ? vo2maxEstimates.reduce((best, e) => (e.estimate > best.estimate ? e : best))
      : null;
```

Change:

```tsx
      {weightPoints.length > 0 && <WeightChart data={weightPoints} />}

      {restingHrPoints.length > 0 && <RestingHrChart data={restingHrPoints} />}
    </div>
  );
}
```

to:

```tsx
      {weightPoints.length > 0 && <WeightChart data={weightPoints} />}

      {restingHrPoints.length > 0 && <RestingHrChart data={restingHrPoints} />}

      {bestVo2maxEstimate && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estimated VO2max</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{bestVo2maxEstimate.estimate}</p>
            <p className="text-xs text-muted">
              From {bestVo2maxEstimate.workout.title} ·{" "}
              {format(new Date(`${bestVo2maxEstimate.workout.date}T00:00:00`), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      )}

      {vo2maxPoints.length > 0 && <Vo2MaxChart data={vo2maxPoints} />}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`. First, log a VO2max value on `/log` (Task 3), then open `/progress` — expect a
"VO2max" chart with one point. Second, if any workout in the seeded plan has `workout_type: "race"`
and is completed with actual distance/time (log one via the workout logger if none exist yet, on a
race-type workout), expect an "Estimated VO2max" card to appear above the chart showing a number
plus the source race's title and date.

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/progress-charts.tsx "src/app/(app)/progress/page.tsx"
git commit -m "feat: add VO2max chart and auto-estimate to the progress page"
```

---

## Task 5: Race editing — `updateRace` server action

**Files:**
- Modify: `src/lib/training/actions.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient()` (already imported in this file).
- Produces: `UpdateRaceInput`, `updateRace(input: UpdateRaceInput): Promise<ActionResult>` —
  consumed by Task 6.

- [ ] **Step 1: Add `UpdateRaceInput` and `updateRace` at the end of `src/lib/training/actions.ts`**

```ts

export interface UpdateRaceInput {
  raceId: string;
  name: string;
  date: string;
  distanceKm: number;
  goalTimeSeconds?: number | null;
  goalPaceSecondsPerKm?: number | null;
  notes?: string | null;
}

export async function updateRace(input: UpdateRaceInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("races")
    .update({
      name: input.name,
      date: input.date,
      distance_km: input.distanceKm,
      goal_time_seconds: input.goalTimeSeconds ?? null,
      goal_pace_seconds_per_km: input.goalPaceSecondsPerKm ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.raceId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/races");
  revalidatePath("/races/a-race");
  revalidatePath("/races/singapore");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (`.update()` on `races` type-checks against `Database["public"]["Tables"]["races"]["Update"]`, which is already `Partial<Row>`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/training/actions.ts
git commit -m "feat: add updateRace server action"
```

---

## Task 6: Race editing — `EditRaceDialog` wired into the A-race and secondary-race pages

**Files:**
- Create: `src/components/races/edit-race-dialog.tsx`
- Modify: `src/app/(app)/races/a-race/page.tsx`
- Modify: `src/app/(app)/races/singapore/page.tsx`

**Interfaces:**
- Consumes: `updateRace` from `@/lib/training/actions` (Task 5), `formatDuration` /
  `parseDurationToSeconds` / `secondsToPaceText` / `paceTextToSeconds` from
  `@/lib/training/pace` (already exist), `Race` type from `@/lib/training/types` (already exists).
- Produces: `<EditRaceDialog race={race} />` — a self-contained trigger button + dialog (unlike
  `EditWorkoutDialog`, which is externally controlled, this component owns its own `open` state
  since the race pages are server components with no existing client-side state to hook into).

- [ ] **Step 1: Create the dialog**

Create `src/components/races/edit-race-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRace } from "@/lib/training/actions";
import { formatDuration, parseDurationToSeconds, paceTextToSeconds, secondsToPaceText } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";
import { PencilLine } from "lucide-react";

export function EditRaceDialog({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(race.name);
  const [date, setDate] = useState(race.date);
  const [distance, setDistance] = useState(String(race.distance_km));
  const [goalTime, setGoalTime] = useState(
    race.goal_time_seconds != null ? formatDuration(race.goal_time_seconds) : "",
  );
  const [goalPace, setGoalPace] = useState(
    race.goal_pace_seconds_per_km != null ? secondsToPaceText(race.goal_pace_seconds_per_km) : "",
  );
  const [notes, setNotes] = useState(race.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Race name can't be blank.");
        return;
      }

      const distanceKm = Number(distance);
      if (Number.isNaN(distanceKm) || distanceKm <= 0) {
        setError("Enter a distance greater than 0.");
        return;
      }

      const trimmedGoalTime = goalTime.trim();
      const goalTimeSeconds = trimmedGoalTime === "" ? null : parseDurationToSeconds(trimmedGoalTime);
      if (trimmedGoalTime !== "" && goalTimeSeconds === null) {
        setError("Enter goal time as mm:ss or h:mm:ss.");
        return;
      }

      const trimmedGoalPace = goalPace.trim();
      const goalPaceSecondsPerKm = trimmedGoalPace === "" ? null : paceTextToSeconds(trimmedGoalPace);
      if (trimmedGoalPace !== "" && goalPaceSecondsPerKm === null) {
        setError("Enter goal pace as m:ss.");
        return;
      }

      const result = await updateRace({
        raceId: race.id,
        name: trimmedName,
        date,
        distanceKm,
        goalTimeSeconds,
        goalPaceSecondsPerKm,
        notes: notes || null,
      });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="Edit race">
        <PencilLine className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit race</DialogTitle>
            <DialogDescription>{race.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="race-name">Name</Label>
              <Input id="race-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="race-date">Date</Label>
                <Input id="race-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="race-distance">Distance (km)</Label>
                <Input
                  id="race-distance"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="race-goal-time">Goal time (h:mm:ss)</Label>
                <Input
                  id="race-goal-time"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  placeholder="1:45:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="race-goal-pace">Goal pace (m:ss/km)</Label>
                <Input
                  id="race-goal-pace"
                  value={goalPace}
                  onChange={(e) => setGoalPace(e.target.value)}
                  placeholder="4:58"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="race-notes">Race plan notes</Label>
              <textarea
                id="race-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="Pacing plan, fueling notes, etc."
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSave} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Wire it into the A-race page**

In `src/app/(app)/races/a-race/page.tsx`, change:

```tsx
import { getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import { format } from "date-fns";
import { Flag } from "lucide-react";
```

to:

```tsx
import { getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import { format } from "date-fns";
import { Flag } from "lucide-react";
```

Change:

```tsx
      <div className="flex items-center gap-2">
        <Badge variant="a-race">A-RACE</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
      </div>
```

to:

```tsx
      <div className="flex items-center gap-2">
        <Badge variant="a-race">A-RACE</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
        <div className="ml-auto">
          <EditRaceDialog race={race} />
        </div>
      </div>
```

- [ ] **Step 3: Wire it into the secondary-race page**

In `src/app/(app)/races/singapore/page.tsx`, change:

```tsx
import { getAllWorkouts, getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecoveryBridge } from "@/components/races/recovery-bridge";
import { daysUntil, daysBetween } from "@/lib/training/dates";
import { format } from "date-fns";
import { Flag, CheckCircle2 } from "lucide-react";
```

to:

```tsx
import { getAllWorkouts, getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecoveryBridge } from "@/components/races/recovery-bridge";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { daysUntil, daysBetween } from "@/lib/training/dates";
import { format } from "date-fns";
import { Flag, CheckCircle2 } from "lucide-react";
```

Change:

```tsx
      <div className="flex items-center gap-2">
        <Badge variant="secondary">RACE of THE YEAR</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
      </div>
```

to:

```tsx
      <div className="flex items-center gap-2">
        <Badge variant="secondary">RACE of THE YEAR</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
        <div className="ml-auto">
          <EditRaceDialog race={race} />
        </div>
      </div>
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open `/races/a-race`, click the pencil icon, change the goal time (e.g. to
`1:44:30`), save. Expected: dialog closes, the "Goal" stat tile on the page now shows the new time
and the derived "Goal pace" tile updates if you also changed goal pace. Repeat on
`/races/singapore`.

- [ ] **Step 6: Commit**

```bash
git add src/components/races/edit-race-dialog.tsx "src/app/(app)/races/a-race/page.tsx" "src/app/(app)/races/singapore/page.tsx"
git commit -m "feat: add race-editing dialog to the A-race and secondary-race pages"
```

---

## Task 7: Completed-workout editing — `editCompletedWorkout` server action

**Files:**
- Modify: `src/lib/training/actions.ts`

**Interfaces:**
- Consumes: `paceFromDistanceAndTime` from `@/lib/training/pace` (already imported in this file).
- Produces: `EditCompletedWorkoutInput`, `editCompletedWorkout(input): Promise<ActionResult>` —
  consumed by Task 8.

- [ ] **Step 1: Add `EditCompletedWorkoutInput` and `editCompletedWorkout` at the end of `src/lib/training/actions.ts`**

```ts

export interface EditCompletedWorkoutInput {
  workoutId: string;
  actualDistanceKm?: number | null;
  actualTimeSeconds?: number | null;
  perceivedEffort?: number | null;
  athleteNotes?: string | null;
}

/** Corrects a completed workout's logged numbers in place, without touching its "completed" status. */
export async function editCompletedWorkout(input: EditCompletedWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const actualPace =
    input.actualDistanceKm && input.actualTimeSeconds
      ? paceFromDistanceAndTime(input.actualDistanceKm, input.actualTimeSeconds)
      : null;

  const { error } = await supabase
    .from("workouts")
    .update({
      actual_distance_km: input.actualDistanceKm ?? null,
      actual_time_seconds: input.actualTimeSeconds ?? null,
      actual_pace_seconds_per_km: actualPace ? Math.round(actualPace) : null,
      perceived_effort: input.perceivedEffort ?? null,
      athlete_notes: input.athleteNotes ?? null,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id)
    .eq("completed", true);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/log");
  revalidatePath("/plan");
  revalidatePath("/progress");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/training/actions.ts
git commit -m "feat: add editCompletedWorkout server action"
```

---

## Task 8: Completed-workout editing — extend `EditWorkoutDialog` and its trigger button

**Files:**
- Modify: `src/components/workouts/edit-workout-dialog.tsx`
- Modify: `src/components/workouts/workout-detail-content.tsx`

**Interfaces:**
- Consumes: `editCompletedWorkout` from `@/lib/training/actions` (Task 7), `formatDuration` /
  `parseDurationToSeconds` / `paceFromDistanceAndTime` / `secondsToPaceText` from
  `@/lib/training/pace` (already exist).
- Produces: nothing new for later tasks — this is the last piece of the completed-workout-editing
  feature.

- [ ] **Step 1: Rewrite `EditWorkoutDialog` to branch on `workout.completed`**

Replace the full contents of `src/components/workouts/edit-workout-dialog.tsx` with:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editCompletedWorkout, modifyWorkout } from "@/lib/training/actions";
import { formatDuration, paceFromDistanceAndTime, parseDurationToSeconds, secondsToPaceText } from "@/lib/training/pace";
import type { Workout } from "@/lib/training/types";

export function EditWorkoutDialog({
  workout,
  open,
  onOpenChange,
}: {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [distance, setDistance] = useState(workout.distance_km != null ? String(workout.distance_km) : "");
  const [notes, setNotes] = useState(workout.athlete_notes ?? "");
  const [actualDistance, setActualDistance] = useState(
    workout.actual_distance_km != null ? String(workout.actual_distance_km) : "",
  );
  const [actualDuration, setActualDuration] = useState(
    workout.actual_time_seconds != null ? formatDuration(workout.actual_time_seconds) : "",
  );
  const [effort, setEffort] = useState(workout.perceived_effort != null ? String(workout.perceived_effort) : "5");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actualDistanceKm = Number(actualDistance);
  const actualDurationSeconds = parseDurationToSeconds(actualDuration);
  const actualPace =
    actualDistanceKm > 0 && actualDurationSeconds
      ? paceFromDistanceAndTime(actualDistanceKm, actualDurationSeconds)
      : null;

  function handleSaveCompleted() {
    setError(null);
    startTransition(async () => {
      const trimmedDistance = actualDistance.trim();
      const distanceKm = trimmedDistance === "" ? null : Number(trimmedDistance);
      if (distanceKm !== null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
        setError("Enter a distance greater than 0, or leave it blank.");
        return;
      }

      const trimmedDuration = actualDuration.trim();
      const timeSeconds = trimmedDuration === "" ? null : parseDurationToSeconds(trimmedDuration);
      if (trimmedDuration !== "" && timeSeconds === null) {
        setError("Enter time as mm:ss or h:mm:ss.");
        return;
      }

      const result = await editCompletedWorkout({
        workoutId: workout.id,
        actualDistanceKm: distanceKm,
        actualTimeSeconds: timeSeconds,
        perceivedEffort: Number(effort),
        athleteNotes: notes || null,
      });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else onOpenChange(false);
    });
  }

  function handleSavePlanned() {
    setError(null);
    startTransition(async () => {
      const trimmed = distance.trim();
      const distanceKm = trimmed === "" ? null : Number(trimmed);
      if (distanceKm !== null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
        setError("Enter a distance greater than 0, or leave it blank.");
        return;
      }
      const result = await modifyWorkout({ workoutId: workout.id, distanceKm, notes: notes || null });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit workout</DialogTitle>
          <DialogDescription>{workout.title}</DialogDescription>
        </DialogHeader>

        {workout.completed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-actual-distance">Distance (km)</Label>
                <Input
                  id="edit-actual-distance"
                  inputMode="decimal"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-actual-duration">Time (mm:ss)</Label>
                <Input
                  id="edit-actual-duration"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(e.target.value)}
                  placeholder="48:20"
                />
              </div>
            </div>

            {actualPace && (
              <p className="text-xs text-muted">
                Average pace: <span className="font-semibold text-foreground">{secondsToPaceText(actualPace)}/km</span>
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-effort">Perceived effort (1–10)</Label>
              <Input
                id="edit-effort"
                type="range"
                min={1}
                max={10}
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
              <p className="text-right text-xs tabular-nums text-muted">{effort}/10</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-completed-notes">Notes</Label>
              <textarea
                id="edit-completed-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="How did it feel?"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSaveCompleted} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-distance">Distance (km)</Label>
              <Input
                id="edit-distance"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder={workout.distance_km ? String(workout.distance_km) : "10"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Why the change? (optional)</Label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="Shortened for tired legs, moved up a day, etc."
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSavePlanned} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Show the edit button on completed workouts too**

In `src/components/workouts/workout-detail-content.tsx`, change:

```tsx
      {!workout.is_rest_day && (
        <div className="flex gap-2 pt-1">
          {!workout.completed ? (
            <>
              <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="Edit workout">
                <PencilLine className="h-4 w-4" />
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setLoggerOpen(true)}>
                <PlayCircle className="h-4 w-4" />
                Log this workout
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1" onClick={() => resetWorkout(workout.id)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      )}
```

to:

```tsx
      {!workout.is_rest_day && (
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="Edit workout">
            <PencilLine className="h-4 w-4" />
          </Button>
          {!workout.completed ? (
            <Button variant="primary" className="flex-1" onClick={() => setLoggerOpen(true)}>
              <PlayCircle className="h-4 w-4" />
              Log this workout
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={() => resetWorkout(workout.id)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      )}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open a completed workout's detail view, click the pencil icon. Expected: the
dialog shows distance/time/effort/notes pre-filled with the logged values (not the "why the
change?" planned-workout form). Change the distance, save. Expected: dialog closes, the
"Completed" summary block on the detail view shows the corrected distance and a recalculated pace,
and the workout is still shown as completed (not reset to planned).

- [ ] **Step 5: Commit**

```bash
git add src/components/workouts/edit-workout-dialog.tsx src/components/workouts/workout-detail-content.tsx
git commit -m "feat: allow editing a completed workout's logged numbers"
```

---

## Task 9: Responsive/UX audit pass, README update, and final verification

**Files:**
- Modify: any file where the audit below finds a real issue (most likely candidates, given the
  existing responsive scaffolding, are listed per-route below — but only change what's actually
  broken).
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — this is the last task.

- [ ] **Step 1: Run the dev server and open Chrome/Firefox dev tools' device toolbar**

Run: `npm run dev`, open `http://localhost:3000` in a browser, open dev tools, and switch to a
responsive/device-toolbar view.

- [ ] **Step 2: Audit each route at 320px, 375px, and 768px wide**

For each of the following routes, resize to each width and check the four criteria below. Log in
a scratch note (not committed) which routes/widths fail which criteria, then fix them in Step 3.

Routes: `/dashboard`, `/calendar` (check both Month and Week views), `/plan`, `/log`, `/progress`,
`/races`, `/races/a-race`, `/races/singapore`, `/settings`, `/more`.

Criteria:
1. **No horizontal scrollbar on the page body** at any of the three widths.
2. **No text or number is truncated/overlapping** in stat tiles, chart legends, or card headers.
3. **Every tappable control (buttons, calendar day cells, nav items) is at least ~36px in its
   smallest dimension** — comfortable for a touch target.
4. **Dialogs (workout detail, edit dialogs, workout logger) fit within the viewport** without
   needing to scroll the dialog's backdrop, only its content if it's long.

- [ ] **Step 3: Fix whatever the audit in Step 2 actually found**

There is no pre-written diff for this step — apply the smallest fix that satisfies the failed
criterion, using only existing Tailwind tokens/utility classes (no new colors, no new components).
Common, low-risk fix patterns if something does fail:
- A stat-tile grid that's cramped at 320px: add a smaller breakpoint variant, e.g.
  `grid-cols-2 sm:grid-cols-3` instead of a bare `grid-cols-3`.
- A long label/title that overlaps its neighbor: add `truncate` or `min-w-0` to the flex/grid item
  containing it.
- A touch target under ~36px: adjust the `Button` `size` prop or padding on the specific element,
  not the shared `Button` component (unless the audit finds the *default* icon-button size itself
  is undersized everywhere, in which case fix `src/components/ui/button.tsx` once).

After each fix, re-check that specific route/width against the criterion you fixed.

- [ ] **Step 4: Update the README's "Known follow-ups" section**

In `README.md`, find the "Known follow-ups" section (added by the previous plan) and add a note
about what this plan closed. Read the current section first with `grep -n "Known follow-ups" -A 15 README.md`
to see its exact current text, then edit it to append (after the existing "Closed:" paragraph, or
create one if none exists):

```markdown
Also closed: race editing (name/date/distance/goal time/goal pace/notes, from `/races/a-race` and
`/races/singapore`), editing a completed workout's logged distance/time/effort/notes in place, and
VO2max (a manual log field on the body-metrics form plus an auto-estimate computed from the
athlete's best completed race effort, both on the Progress page).
```

- [ ] **Step 5: Run full verification suite**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four pass cleanly (test count: the existing count plus the 6 new tests in
`tests/vo2max.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: responsive audit fixes and update README for race/workout editing and VO2max"
```

If Step 3 found nothing to fix, commit just the README change:

```bash
git add README.md
git commit -m "docs: update README for race/workout editing and VO2max"
```

---

## Self-Review Notes

- **Spec coverage:** all four in-scope items from
  `docs/superpowers/specs/2026-09-18-manage-races-vo2max-responsive-design.md` map to tasks —
  editable races (Tasks 5–6), editable logged workouts (Tasks 7–8), VO2max manual + auto-estimate
  (Tasks 1–4), responsive audit (Task 9). All four "explicitly out of scope" items (race priority
  changes, a races migration, merging VO2max sources into one series, a visual redesign) are
  untouched by every task above.
- **No migration needed for races** — `updateRace` only writes to columns that already exist in
  `supabase/migrations/0001_init.sql:23-35`.
- **Type consistency:** `BodyMetric.vo2max` (Task 1) flows into `BodyMetricInput.vo2max` (Task 3)
  and `Vo2MaxPoint.vo2max` (Task 4) with the same name and `number | null` shape throughout.
  `UpdateRaceInput` (Task 5) field names (`raceId`, `goalTimeSeconds`, `goalPaceSecondsPerKm`)
  match what `EditRaceDialog` (Task 6) calls `updateRace` with. `EditCompletedWorkoutInput`
  (Task 7) field names match what the completed branch of `EditWorkoutDialog` (Task 8) calls
  `editCompletedWorkout` with, and mirror the existing `CompleteWorkoutInput` shape exactly so the
  two dialogs (`WorkoutLogger` and `EditWorkoutDialog`) stay consistent for the athlete.
- **`estimateVo2max`'s signature (`distanceKm: number, timeSeconds: number`) is identical to
  `paceFromDistanceAndTime`'s**, an existing convention in `src/lib/training/pace.ts` — no new
  argument-order convention introduced.
