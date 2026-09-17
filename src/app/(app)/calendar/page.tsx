import { Suspense } from "react";
import { getAllWorkoutIntervals, getAllWorkouts, getRaces } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { TrainingCalendar } from "@/components/calendar/training-calendar";

async function CalendarData() {
  const [workoutsResult, intervalsResult, racesResult] = await Promise.all([
    getAllWorkouts(),
    getAllWorkoutIntervals(),
    getRaces(),
  ]);

  if (workoutsResult.status !== "ok" || intervalsResult.status !== "ok" || racesResult.status !== "ok") {
    return <EmptyState title="Couldn't load the calendar" description="Refresh to try again." />;
  }

  const intervalsByWorkout = new Map<string, typeof intervalsResult.data>();
  for (const interval of intervalsResult.data) {
    const list = intervalsByWorkout.get(interval.workout_id) ?? [];
    list.push(interval);
    intervalsByWorkout.set(interval.workout_id, list);
  }

  const racesById = new Map(racesResult.data.map((r) => [r.id, r]));

  return (
    <TrainingCalendar workouts={workoutsResult.data} intervalsByWorkout={intervalsByWorkout} racesById={racesById} />
  );
}

export default function CalendarPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
        <p className="text-sm text-muted">Swipe or use the arrows to move between weeks and months.</p>
      </div>
      <Suspense fallback={<LoadingState rows={6} />}>
        <CalendarData />
      </Suspense>
    </div>
  );
}
