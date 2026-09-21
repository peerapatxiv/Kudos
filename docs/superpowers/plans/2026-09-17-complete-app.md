# Complete the App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four remaining gaps in the Cockpit training PWA — password reset, an offline
write queue for workout completions, an edit-workout UI, and a body-metrics log — so the app
matches everything scoped for it.

**Architecture:** Every task adds to the existing layered architecture (`src/lib/training/queries.ts`
reads, `src/lib/training/actions.ts` / `src/lib/auth/actions.ts` writes, thin client components
for forms/dialogs) without introducing new patterns. No new database migration — `body_metrics`
already exists in `supabase/migrations/0001_init.sql`.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict, Supabase (`@supabase/ssr`),
Tailwind v4, Radix UI, Recharts, Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-17-complete-app-design.md`

## Global Constraints

- No new Supabase migration — `body_metrics` (table, indexes, RLS) already exists in `supabase/migrations/0001_init.sql:131-143`.
- Every Server Action returns `{ ok: boolean; error?: string }` (the existing `ActionResult`/`AuthResult` shape) and calls `revalidatePath` for every route that reads the data it writes.
- Every query function returns the existing `QueryResult<T>` discriminated union (`{status:"unconfigured"}|{status:"error",message}|{status:"ok",data}`) and lives in `src/lib/training/queries.ts` with `import "server-only"`.
- Unit tests only cover framework-free logic (matching the existing `tests/` convention — this repo has no React component-testing library installed; do not add one).
- Every task must leave `npm run typecheck`, `npm run lint`, and `npm run test` green before its commit.
- Reuse existing Tailwind tokens/components (`bg-surface`, `border-border`, `text-muted`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Button`, `Input`, `Label`, `Dialog*`) — no new design tokens.

---

## Task 1: Password reset — server actions

**Files:**
- Modify: `src/lib/auth/actions.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient()` from `@/lib/supabase/server` (already imported in this file), `AuthResult` (already defined in this file).
- Produces: `sendPasswordReset(email: string, redirectTo: string): Promise<AuthResult>`, `updatePassword(newPassword: string): Promise<AuthResult>` — both used by Task 2 and Task 3.

- [ ] **Step 1: Add `sendPasswordReset` and `updatePassword` to `src/lib/auth/actions.ts`**

Add this at the end of the file (after `seedPlanForUser`):

```ts
export async function sendPasswordReset(email: string, redirectTo: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Check your inbox for a password reset link." };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one from the sign-in page." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };

  redirect("/dashboard");
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (both functions type-check against the existing `AuthResult` interface; `redirect` is already imported at the top of the file).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/actions.ts
git commit -m "feat: add password reset server actions"
```

---

## Task 2: Password reset — reset-password page

**Files:**
- Create: `src/app/auth/reset-password/reset-password-form.tsx`
- Create: `src/app/auth/reset-password/page.tsx`

**Interfaces:**
- Consumes: `updatePassword` from `@/lib/auth/actions` (Task 1), `getCurrentUser` from `@/lib/training/queries` (already exists), `Card`/`CardContent`, `Input`, `Label`, `Button` (existing UI primitives).
- Produces: the `/auth/reset-password` route, landed on after Task 1's `sendPasswordReset` email link is clicked (wired in Task 3).

- [ ] **Step 1: Create the client form**

Create `src/app/auth/reset-password/reset-password-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/lib/auth/actions";
import { AlertCircle } from "lucide-react";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const result = await updatePassword(password);
      if (!result) return; // redirect() throws internally on success
      if (!result.ok) setError(result.error ?? "Something went wrong.");
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/auth/reset-password/page.tsx`:

```tsx
import { getCurrentUser } from "@/lib/training/queries";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-a-race text-lg font-bold text-a-race-foreground">
            C
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted">Choose a new password for your Cockpit account.</p>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-center text-sm text-danger">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/reset-password
git commit -m "feat: add reset-password page"
```

---

## Task 3: Password reset — wire "Forgot password?" into the sign-in form

**Files:**
- Modify: `src/app/(auth)/login/auth-form.tsx`

**Interfaces:**
- Consumes: `sendPasswordReset` from `@/lib/auth/actions` (Task 1).
- Produces: a `"reset"` value added to the form's local `Mode` type — no other task depends on this.

- [ ] **Step 1: Import `sendPasswordReset` and extend the `Mode` type**

In `src/app/(auth)/login/auth-form.tsx`, change:

```ts
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "@/lib/auth/actions";
```

to:

```ts
import { sendMagicLink, sendPasswordReset, signInWithPassword, signUpWithPassword } from "@/lib/auth/actions";
```

and change:

```ts
type Mode = "sign-in" | "sign-up" | "magic-link";
```

to:

```ts
type Mode = "sign-in" | "sign-up" | "magic-link" | "reset";
```

- [ ] **Step 2: Handle the "reset" branch in `handleSubmit`**

Replace:

```ts
      const result =
        mode === "sign-in"
          ? await signInWithPassword(email, password)
          : mode === "sign-up"
            ? await signUpWithPassword(email, password)
            : await sendMagicLink(email, `${window.location.origin}/auth/callback`);
```

with:

```ts
      const result =
        mode === "sign-in"
          ? await signInWithPassword(email, password)
          : mode === "sign-up"
            ? await signUpWithPassword(email, password)
            : mode === "magic-link"
              ? await sendMagicLink(email, `${window.location.origin}/auth/callback`)
              : await sendPasswordReset(
                  email,
                  `${window.location.origin}/auth/callback?redirectTo=/auth/reset-password`,
                );
```

- [ ] **Step 3: Hide the password field in "reset" mode and add the "Forgot password?" / "Back to sign in" links**

Replace:

```tsx
            {mode !== "magic-link" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
```

with:

```tsx
            {mode !== "magic-link" && mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === "sign-in" && (
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
              >
                Forgot password?
              </button>
            )}

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
              >
                Back to sign in
              </button>
            )}
```

- [ ] **Step 4: Update the submit button label for "reset" mode**

Replace:

```tsx
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Send magic link"}
            </Button>
```

with:

```tsx
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : mode === "magic-link"
                      ? "Send magic link"
                      : "Send reset link"}
            </Button>
```

- [ ] **Step 5: Typecheck, lint, and manually verify**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

Run: `npm run dev`, open `/login`, click "Forgot password?" — the password field disappears, a "Back to sign in" link appears, and the submit button reads "Send reset link". Submitting a real email (with the Supabase project connected) shows the "Check your inbox…" message.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/login/auth-form.tsx"
git commit -m "feat: wire forgot-password into the sign-in form"
```

---

## Task 4: Offline queue — queue module and unit tests

**Files:**
- Create: `src/lib/offline/workout-queue.ts`
- Test: `tests/workout-queue.test.ts`

**Interfaces:**
- Consumes: nothing new (pure `localStorage` + `window.dispatchEvent`).
- Produces: `enqueueCompletion(input)`, `dequeueCompletion(workoutId)`, `getQueue(): QueuedCompletion[]`, `queueSize(): number`, and the `QueuedCompletion` type — all consumed by Task 5 and Task 6. Also fires a `"cockpit:queue-changed"` `window` event on every write, consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `tests/workout-queue.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { dequeueCompletion, enqueueCompletion, getQueue, queueSize } from "@/lib/offline/workout-queue";

afterEach(() => {
  localStorage.clear();
});

describe("workout completion offline queue", () => {
  it("starts empty", () => {
    expect(getQueue()).toEqual([]);
    expect(queueSize()).toBe(0);
  });

  it("enqueues a completion with a timestamp", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    expect(typeof queue[0].queuedAt).toBe("string");
  });

  it("replaces an existing queued completion for the same workout instead of duplicating it", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 12, actualTimeSeconds: 3600 });
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].actualDistanceKm).toBe(12);
  });

  it("dequeues by workoutId", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w2", actualDistanceKm: 5, actualTimeSeconds: 1500 });
    dequeueCompletion("w1");
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].workoutId).toBe("w2");
  });

  it("reports queue size", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w2", actualDistanceKm: 5, actualTimeSeconds: 1500 });
    expect(queueSize()).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/workout-queue.test.ts`
Expected: FAIL — `Cannot find module '@/lib/offline/workout-queue'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/offline/workout-queue.ts`:

```ts
"use client";

import type { CompleteWorkoutInput } from "@/lib/training/actions";

const QUEUE_KEY = "cockpit:pending-workout-completions";
const QUEUE_CHANGED_EVENT = "cockpit:queue-changed";

export interface QueuedCompletion extends CompleteWorkoutInput {
  queuedAt: string;
}

export function getQueue(): QueuedCompletion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedCompletion[]) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedCompletion[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function enqueueCompletion(input: CompleteWorkoutInput): void {
  const queue = getQueue().filter((item) => item.workoutId !== input.workoutId);
  queue.push({ ...input, queuedAt: new Date().toISOString() });
  setQueue(queue);
}

export function dequeueCompletion(workoutId: string): void {
  setQueue(getQueue().filter((item) => item.workoutId !== workoutId));
}

export function queueSize(): number {
  return getQueue().length;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/workout-queue.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run test && npm run typecheck`
Expected: all pass (31 tests total: the existing 27 plus these 5 minus none removed — confirm the printed total).

- [ ] **Step 6: Commit**

```bash
git add src/lib/offline/workout-queue.ts tests/workout-queue.test.ts
git commit -m "feat: add offline workout-completion queue"
```

---

## Task 5: Offline queue — sync component

**Files:**
- Create: `src/components/layout/offline-queue-sync.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `getQueue`, `dequeueCompletion`, `queueSize` from `@/lib/offline/workout-queue` (Task 4), `completeWorkout` from `@/lib/training/actions` (already exists).
- Produces: `<OfflineQueueSync />`, mounted once app-wide in Task 5 Step 2. No other task depends on this component's internals.

- [ ] **Step 1: Create the sync component**

Create `src/components/layout/offline-queue-sync.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { completeWorkout, type CompleteWorkoutInput } from "@/lib/training/actions";
import { dequeueCompletion, getQueue, queueSize } from "@/lib/offline/workout-queue";

/** Flushes queued offline workout completions once app-wide, and shows a small pending badge. */
export function OfflineQueueSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    function refreshCount() {
      setPending(queueSize());
    }

    async function flush() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queue = getQueue();
      if (queue.length === 0) return;

      setSyncing(true);
      for (const item of queue) {
        const input: CompleteWorkoutInput = {
          workoutId: item.workoutId,
          actualDistanceKm: item.actualDistanceKm,
          actualTimeSeconds: item.actualTimeSeconds,
          perceivedEffort: item.perceivedEffort,
          athleteNotes: item.athleteNotes,
        };
        try {
          const result = await completeWorkout(input);
          if (result.ok) dequeueCompletion(item.workoutId);
        } catch {
          break; // still unreachable — stop and retry next time we come online
        }
      }
      setSyncing(false);
      refreshCount();
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage on mount
    refreshCount();
    window.addEventListener("cockpit:queue-changed", refreshCount);
    window.addEventListener("online", flush);
    flush();

    return () => {
      window.removeEventListener("cockpit:queue-changed", refreshCount);
      window.removeEventListener("online", flush);
    };
  }, []);

  if (pending === 0) return null;

  return (
    <span
      className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full border border-warning/30 bg-surface px-3 py-1.5 text-xs font-medium text-warning shadow-md md:bottom-4"
      title={`${pending} workout${pending === 1 ? "" : "s"} waiting to sync`}
    >
      <UploadCloud className="h-3.5 w-3.5" />
      {syncing ? "Syncing…" : `${pending} pending sync`}
    </span>
  );
}
```

- [ ] **Step 2: Mount it in the app shell**

In `src/app/(app)/layout.tsx`, change:

```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeaderBar } from "@/components/layout/mobile-header-bar";
import { getProfile } from "@/lib/training/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar displayName={profile?.display_name ?? null} />
      <div className="md:pl-64">
        <MobileHeaderBar />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

to:

```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeaderBar } from "@/components/layout/mobile-header-bar";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { getProfile } from "@/lib/training/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar displayName={profile?.display_name ?? null} />
      <div className="md:pl-64">
        <MobileHeaderBar />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomNav />
      <OfflineQueueSync />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors. (`CompleteWorkoutInput` must be exported as a named type from `src/lib/training/actions.ts` — it already is, per the `export interface CompleteWorkoutInput` at the top of that file.)

- [ ] **Step 4: Commit**

```bash
git add "src/components/layout/offline-queue-sync.tsx" "src/app/(app)/layout.tsx"
git commit -m "feat: sync queued offline workout completions on reconnect"
```

---

## Task 6: Offline queue — wire `WorkoutLogger` to enqueue on failure

**Files:**
- Modify: `src/components/workouts/workout-logger.tsx`

**Interfaces:**
- Consumes: `enqueueCompletion` from `@/lib/offline/workout-queue` (Task 4).
- Produces: nothing new for later tasks — this is the last piece of the offline-queue feature.

- [ ] **Step 1: Import `enqueueCompletion` and add a `queuedOffline` state flag**

In `src/components/workouts/workout-logger.tsx`, change:

```tsx
import { completeWorkout, skipWorkout } from "@/lib/training/actions";
```

to:

```tsx
import { completeWorkout, skipWorkout } from "@/lib/training/actions";
import { enqueueCompletion } from "@/lib/offline/workout-queue";
```

and change:

```tsx
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

to:

```tsx
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 2: Reset `queuedOffline` alongside the other reset state**

Change:

```tsx
  function reset() {
    setDone(false);
    setError(null);
  }
```

to:

```tsx
  function reset() {
    setDone(false);
    setQueuedOffline(false);
    setError(null);
  }
```

- [ ] **Step 3: Catch the network failure in `handleComplete` and enqueue it**

Change:

```tsx
  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeWorkout({
        workoutId: workout.id,
        actualDistanceKm: distanceKm > 0 ? distanceKm : null,
        actualTimeSeconds: durationSeconds,
        perceivedEffort: Number(effort),
        athleteNotes: notes || null,
      });
      if (!result.ok) setError(result.error ?? "Could not save this workout.");
      else setDone(true);
    });
  }
```

to:

```tsx
  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const input = {
        workoutId: workout.id,
        actualDistanceKm: distanceKm > 0 ? distanceKm : null,
        actualTimeSeconds: durationSeconds,
        perceivedEffort: Number(effort),
        athleteNotes: notes || null,
      };
      try {
        const result = await completeWorkout(input);
        if (!result.ok) {
          setError(result.error ?? "Could not save this workout.");
          return;
        }
        setDone(true);
      } catch {
        enqueueCompletion(input);
        setQueuedOffline(true);
        setDone(true);
      }
    });
  }
```

- [ ] **Step 4: Show a distinct message when the completion was queued offline**

Change:

```tsx
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper className="h-7 w-7" />
            </div>
            <DialogTitle>Workout Complete</DialogTitle>
            <p className="text-sm text-muted">
              {distanceKm > 0 ? `${distanceKm} km` : workout.title}
              {durationSeconds ? ` in ${duration}` : ""}
              {pace ? ` · ${secondsToPaceText(pace)}/km avg` : ""}
            </p>
            <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-2 w-full">
              Done
            </Button>
          </div>
        ) : (
```

to:

```tsx
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper className="h-7 w-7" />
            </div>
            <DialogTitle>{queuedOffline ? "Saved Offline" : "Workout Complete"}</DialogTitle>
            <p className="text-sm text-muted">
              {queuedOffline
                ? "You're offline — this will sync automatically once you're back online."
                : `${distanceKm > 0 ? `${distanceKm} km` : workout.title}${durationSeconds ? ` in ${duration}` : ""}${pace ? ` · ${secondsToPaceText(pace)}/km avg` : ""}`}
            </p>
            <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-2 w-full">
              Done
            </Button>
          </div>
        ) : (
```

- [ ] **Step 5: Typecheck, lint, run full test suite**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`, open a workout, open dev tools → Network → set to "Offline", fill in distance/time, click "Mark Complete". Expected: dialog shows "Saved Offline" with the sync message, and within a few seconds of setting Network back to "Online" the "N pending sync" badge (bottom-right) appears then disappears, and the workout shows as completed after a page refresh.

- [ ] **Step 7: Commit**

```bash
git add src/components/workouts/workout-logger.tsx
git commit -m "feat: queue workout completions made while offline"
```

---

## Task 7: Edit-workout UI

**Files:**
- Create: `src/components/workouts/edit-workout-dialog.tsx`
- Modify: `src/components/workouts/workout-detail-content.tsx`

**Interfaces:**
- Consumes: `modifyWorkout` from `@/lib/training/actions` (already exists), `Workout` type from `@/lib/training/types` (already exists), `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` (existing UI primitives).
- Produces: `<EditWorkoutDialog workout open onOpenChange>`, consumed only by `workout-detail-content.tsx` in this same task.

- [ ] **Step 1: Create the edit dialog**

Create `src/components/workouts/edit-workout-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modifyWorkout } from "@/lib/training/actions";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
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
            <Button variant="primary" className="flex-1" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire an "Edit" button into the workout detail view**

In `src/components/workouts/workout-detail-content.tsx`, change:

```tsx
import { WorkoutLogger } from "@/components/workouts/workout-logger";
```

to:

```tsx
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { EditWorkoutDialog } from "@/components/workouts/edit-workout-dialog";
```

Change:

```tsx
  const [loggerOpen, setLoggerOpen] = useState(false);
```

to:

```tsx
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
```

Change the action row:

```tsx
      {!workout.is_rest_day && (
        <div className="flex gap-2 pt-1">
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

      {!workout.is_rest_day && <WorkoutLogger workout={workout} open={loggerOpen} onOpenChange={setLoggerOpen} />}
```

to:

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

      {!workout.is_rest_day && (
        <>
          <WorkoutLogger workout={workout} open={loggerOpen} onOpenChange={setLoggerOpen} />
          <EditWorkoutDialog workout={workout} open={editOpen} onOpenChange={setEditOpen} />
        </>
      )}
```

(`PencilLine` is already imported at the top of this file for the "Modified" status badge — no new icon import needed.)

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open an upcoming (not-yet-completed) workout's detail view, click the pencil icon, change the distance, save. Expected: dialog closes, the workout now shows a "Modified" badge and the new distance.

- [ ] **Step 5: Commit**

```bash
git add src/components/workouts/edit-workout-dialog.tsx src/components/workouts/workout-detail-content.tsx
git commit -m "feat: add edit-workout UI"
```

---

## Task 8: Body metrics — queries and action

**Files:**
- Modify: `src/lib/training/queries.ts`
- Modify: `src/lib/training/actions.ts`

**Interfaces:**
- Consumes: `BodyMetric` type from `./types` (already exists, `src/lib/training/types.ts:102-109`), the `body_metrics` table (already exists in `supabase/migrations/0001_init.sql:131-143`).
- Produces: `getBodyMetrics(): Promise<QueryResult<BodyMetric[]>>`, `getBodyMetricByDate(date: string): Promise<BodyMetric | null>`, `upsertBodyMetric(input: BodyMetricInput): Promise<ActionResult>` — all consumed by Task 9 and Task 10.

- [ ] **Step 1: Add the queries**

In `src/lib/training/queries.ts`, change:

```ts
import type { DailyLog, Race, TrainingWeek, Workout, WorkoutInterval, WorkoutWithIntervals } from "./types";
```

to:

```ts
import type { BodyMetric, DailyLog, Race, TrainingWeek, Workout, WorkoutInterval, WorkoutWithIntervals } from "./types";
```

Add at the end of the file (after `getDailyLog`):

```ts

export async function getBodyMetricByDate(date: string): Promise<BodyMetric | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.from("body_metrics").select("*").eq("date", date).maybeSingle();
  return data as BodyMetric | null;
}

export async function getBodyMetrics(): Promise<QueryResult<BodyMetric[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase.from("body_metrics").select("*").order("date", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as BodyMetric[] };
}
```

- [ ] **Step 2: Add the action**

In `src/lib/training/actions.ts`, add at the end of the file (after `updateProfile`):

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

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors (the `body_metrics` table and its `Row`/`Insert`/`Update` shapes already exist in `src/lib/supabase/database.types.ts:163-178`, so `.from("body_metrics")` type-checks with no further changes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/training/queries.ts src/lib/training/actions.ts
git commit -m "feat: add body-metrics queries and upsert action"
```

---

## Task 9: Body metrics — form on the Log page

**Files:**
- Create: `src/components/workouts/body-metrics-form.tsx`
- Modify: `src/app/(app)/log/page.tsx`

**Interfaces:**
- Consumes: `upsertBodyMetric` from `@/lib/training/actions` (Task 8), `getBodyMetricByDate` from `@/lib/training/queries` (Task 8), `BodyMetric` type from `@/lib/training/types` (already exists).
- Produces: `<BodyMetricsForm date initial>`, consumed only by the Log page in this task.

- [ ] **Step 1: Create the form**

Create `src/components/workouts/body-metrics-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { upsertBodyMetric } from "@/lib/training/actions";
import type { BodyMetric } from "@/lib/training/types";
import { CheckCircle2 } from "lucide-react";

export function BodyMetricsForm({ date, initial }: { date: string; initial: BodyMetric | null }) {
  const [weight, setWeight] = useState(initial?.weight_kg != null ? String(initial.weight_kg) : "");
  const [restingHr, setRestingHr] = useState(initial?.resting_hr != null ? String(initial.resting_hr) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await upsertBodyMetric({
        date,
        weightKg: weight.trim() === "" ? null : Number(weight),
        restingHr: restingHr.trim() === "" ? null : Number(restingHr),
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body metrics</CardTitle>
        <CardDescription>Optional — never required to use the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Label htmlFor="resting-hr">Max HR</Label>
            <Input
              id="resting-hr"
              inputMode="numeric"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="52"
            />
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything else worth noting?"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
        />

        <Button variant="outline" className="w-full" onClick={handleSave} disabled={pending}>
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" /> Saved
            </>
          ) : pending ? (
            "Saving…"
          ) : (
            "Save"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Wire it into the Log page**

In `src/app/(app)/log/page.tsx`, change:

```tsx
import { getAllWorkouts, getDailyLog } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LogList } from "@/components/workouts/log-list";
import { DailyLogForm } from "@/components/workouts/daily-log-form";
import { todayIso } from "@/lib/training/dates";
import { NotebookPen } from "lucide-react";

export default async function LogPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const today = todayIso();
  const [workoutsResult, dailyLog] = await Promise.all([getAllWorkouts(), getDailyLog(today)]);
```

to:

```tsx
import { getAllWorkouts, getBodyMetricByDate, getDailyLog } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LogList } from "@/components/workouts/log-list";
import { DailyLogForm } from "@/components/workouts/daily-log-form";
import { BodyMetricsForm } from "@/components/workouts/body-metrics-form";
import { todayIso } from "@/lib/training/dates";
import { NotebookPen } from "lucide-react";

export default async function LogPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const today = todayIso();
  const [workoutsResult, dailyLog, bodyMetric] = await Promise.all([
    getAllWorkouts(),
    getDailyLog(today),
    getBodyMetricByDate(today),
  ]);
```

Change:

```tsx
      <DailyLogForm date={today} initial={dailyLog} />

      <LogList workouts={sorted} />
```

to:

```tsx
      <DailyLogForm date={today} initial={dailyLog} />

      <BodyMetricsForm date={today} initial={bodyMetric} />

      <LogList workouts={sorted} />
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open `/log`, fill in weight and Max HR, click "Save". Expected: button shows "Saved" briefly; reloading the page shows the values pre-filled.

- [ ] **Step 5: Commit**

```bash
git add "src/components/workouts/body-metrics-form.tsx" "src/app/(app)/log/page.tsx"
git commit -m "feat: add body-metrics form to the log page"
```

---

## Task 10: Body metrics — charts on the Progress page

**Files:**
- Modify: `src/components/progress/progress-charts.tsx`
- Modify: `src/app/(app)/progress/page.tsx`

**Interfaces:**
- Consumes: `getBodyMetrics` from `@/lib/training/queries` (Task 8), `AXIS_STYLE`/`TOOLTIP_STYLE` (already defined in `progress-charts.tsx`).
- Produces: `WeightChart`, `RestingHrChart`, `WeightPoint`, `RestingHrPoint` — consumed only by the Progress page in this task.

- [ ] **Step 1: Add the two chart components**

In `src/components/progress/progress-charts.tsx`, add at the end of the file (after `CompletionChart`):

```tsx

export interface WeightPoint {
  date: string;
  label: string;
  weightKg: number;
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Body Weight</CardTitle>
        <CardDescription>Logged weight over time.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="kg" domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Weight"]} />
            <Line type="monotone" dataKey="weightKg" stroke="var(--tempo)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export interface RestingHrPoint {
  date: string;
  label: string;
  restingHr: number;
}

export function RestingHrChart({ data }: { data: RestingHrPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resting Heart Rate</CardTitle>
        <CardDescription>Logged Max HR over time.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="bpm" domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} bpm`, "Max HR"]} />
            <Line type="monotone" dataKey="restingHr" stroke="var(--interval)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Wire the charts into the Progress page**

In `src/app/(app)/progress/page.tsx`, change:

```tsx
import { getAllWorkouts, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CompletionChart,
  LongRunChart,
  PaceChart,
  WeeklyMileageChart,
  type LongRunPoint,
  type PacePoint,
  type WeeklyMileagePoint,
} from "@/components/progress/progress-charts";
import { summarizeWeek, completionBreakdown } from "@/lib/training/aggregate";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

export default async function ProgressPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [weeksResult, workoutsResult] = await Promise.all([getTrainingWeeks(), getAllWorkouts()]);
```

to:

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

export default async function ProgressPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [weeksResult, workoutsResult, bodyMetricsResult] = await Promise.all([
    getTrainingWeeks(),
    getAllWorkouts(),
    getBodyMetrics(),
  ]);
```

Change:

```tsx
  const breakdown = completionBreakdown(workouts);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Progress</h1>
        <p className="text-sm text-muted">
          Training trends only — not medical or physiological advice.
        </p>
      </div>

      <WeeklyMileageChart data={mileage} />

      {pacePoints.length > 0 ? (
        <PaceChart data={pacePoints} />
      ) : (
        <EmptyState title="No logged paces yet" description="Complete a workout with distance and time to see pace trends." />
      )}

      {longRuns.length > 0 && <LongRunChart data={longRuns} />}

      <CompletionChart completed={breakdown.completed} skipped={breakdown.skipped} planned={breakdown.planned} />
    </div>
  );
}
```

to:

```tsx
  const breakdown = completionBreakdown(workouts);

  const bodyMetrics = bodyMetricsResult.status === "ok" ? bodyMetricsResult.data : [];
  const weightPoints: WeightPoint[] = bodyMetrics
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), weightKg: m.weight_kg! }));
  const restingHrPoints: RestingHrPoint[] = bodyMetrics
    .filter((m) => m.resting_hr != null)
    .map((m) => ({ date: m.date, label: format(new Date(`${m.date}T00:00:00`), "MMM d"), restingHr: m.resting_hr! }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Progress</h1>
        <p className="text-sm text-muted">
          Training trends only — not medical or physiological advice.
        </p>
      </div>

      <WeeklyMileageChart data={mileage} />

      {pacePoints.length > 0 ? (
        <PaceChart data={pacePoints} />
      ) : (
        <EmptyState title="No logged paces yet" description="Complete a workout with distance and time to see pace trends." />
      )}

      {longRuns.length > 0 && <LongRunChart data={longRuns} />}

      <CompletionChart completed={breakdown.completed} skipped={breakdown.skipped} planned={breakdown.planned} />

      {weightPoints.length > 0 && <WeightChart data={weightPoints} />}

      {restingHrPoints.length > 0 && <RestingHrChart data={restingHrPoints} />}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, log a body-metrics entry on `/log` (Task 9), then open `/progress`. Expected: "Body Weight" chart appears with one data point (and "Resting Heart Rate" too, if that field was filled in).

- [ ] **Step 5: Commit**

```bash
git add "src/components/progress/progress-charts.tsx" "src/app/(app)/progress/page.tsx"
git commit -m "feat: add body-metrics charts to the progress page"
```

---

## Task 11: Update README and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing — documentation only.
- Produces: nothing — this is the last task.

- [ ] **Step 1: Update §15 "Known follow-ups" in `README.md`**

Change:

```markdown
## 15. Known follow-ups (documented, not silently skipped)

- Offline **writes** (queue + background sync for workout completions made while offline) — read-only
  offline caching is implemented; mutation queuing is the natural next step, and `WorkoutLogger`'s single
  `completeWorkout` call is the seam where it would be added.
- True background push notifications (requires a scheduled server-side sender) — local/foreground
  notification preferences are implemented and documented as such in Settings.
- A dedicated native Expo app — deliberately out of scope in favor of one polished PWA (see §2).
```

to:

```markdown
## 15. Known follow-ups (documented, not silently skipped)

- True background push notifications (requires a scheduled server-side sender) — local/foreground
  notification preferences are implemented and documented as such in Settings.
- A dedicated native Expo app — deliberately out of scope in favor of one polished PWA (see §2).

Closed: offline writes (queued via `localStorage` in `src/lib/offline/workout-queue.ts` and flushed by
`OfflineQueueSync` on reconnect), password reset (`/auth/reset-password`), an edit-workout UI wired to
the existing `modifyWorkout` action, and an optional body-metrics log (weight/Max HR) with charts on
the Progress page.
```

- [ ] **Step 2: Also update the architecture tree in §2 to list the new files**

Change:

```markdown
  lib/
    supabase/              browser/server/middleware Supabase clients + hand-typed Database
    training/               domain layer: types, pace math, date math, phases, aggregation,
                             Supabase queries (reads) and Server Actions (writes)
    auth/actions.ts        sign-up/sign-in/magic-link/sign-out + per-user plan seeding
```

to:

```markdown
  lib/
    supabase/              browser/server/middleware Supabase clients + hand-typed Database
    training/               domain layer: types, pace math, date math, phases, aggregation,
                             Supabase queries (reads) and Server Actions (writes)
    auth/actions.ts        sign-up/sign-in/magic-link/password-reset/sign-out + per-user plan seeding
    offline/workout-queue.ts  localStorage-backed queue for workout completions made offline
```

- [ ] **Step 3: Run full verification suite**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four pass cleanly (typecheck: no errors; lint: no errors; test: all tests including the 5 new ones in `tests/workout-queue.test.ts` pass; build: production build succeeds).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for the completed feature set"
```

---

## Self-Review Notes

- **Spec coverage:** all four in-scope items from `docs/superpowers/specs/2026-09-17-complete-app-design.md` map to tasks — password reset (Tasks 1–3), offline write queue (Tasks 4–6), edit-workout UI (Task 7), body-metrics log (Tasks 8–10). The explicitly-out-of-scope items (background push, Expo) are untouched.
- **No migration needed:** confirmed `body_metrics` table/RLS already exist in `supabase/migrations/0001_init.sql:131-217` and `Database["public"]["Tables"]["body_metrics"]` already exists in `src/lib/supabase/database.types.ts:163-178` — Task 8 only adds application code.
- **Type consistency:** `CompleteWorkoutInput` (Task 5/6), `ModifyWorkoutInput`/`modifyWorkout` (Task 7), `BodyMetricInput`/`upsertBodyMetric` (Task 8/9), `BodyMetric` (Task 8/9/10), `WeightPoint`/`RestingHrPoint` (Task 10) are each defined once and consumed with matching names/shapes across tasks.
