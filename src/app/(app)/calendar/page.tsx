import { Suspense } from "react";
import { getAllWorkoutIntervals, getAllWorkouts, getRaces } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { TrainingCalendar } from "@/components/calendar/training-calendar";
import { RacesPanel } from "@/components/races/races-panel";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { Card, CardContent } from "@/components/ui/card";
import { todayIso } from "@/lib/training/dates";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

async function CalendarData() {
  const [workoutsResult, intervalsResult, racesResult] = await Promise.all([
    getAllWorkouts(),
    getAllWorkoutIntervals(),
    getRaces(),
  ]);

  // Show calendar even if no data - always display the grid
  const workouts = workoutsResult.status === "ok" ? workoutsResult.data : [];
  const intervals = intervalsResult.status === "ok" ? intervalsResult.data : [];
  const races = racesResult.status === "ok" ? racesResult.data : [];

  const intervalsByWorkout = new Map<string, typeof intervals>();
  for (const interval of intervals) {
    const list = intervalsByWorkout.get(interval.workout_id) ?? [];
    list.push(interval);
    intervalsByWorkout.set(interval.workout_id, list);
  }

  const racesById = new Map(races.map((r) => [r.id, r]));

  // Get next 5 days workouts
  const today = todayIso();
  const nextFiveDaysWorkouts = workouts
    .filter((w) => w.date > today && w.date <= format(addDays(new Date(`${today}T00:00:00`), 5), "yyyy-MM-dd"))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <TrainingCalendar workouts={workouts} intervalsByWorkout={intervalsByWorkout} racesById={racesById} />

      {nextFiveDaysWorkouts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-a-race/60" />
            <h2 className="text-lg font-semibold text-foreground">Next 5 Days</h2>
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <UpcomingList workouts={nextFiveDaysWorkouts} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Races</h2>
        <RacesPanel races={races} />
      </div>
    </div>
  );
}

export default function CalendarPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
        <p className="text-sm text-muted">Your training calendar and races, in one place.</p>
      </div>
      <Suspense fallback={<LoadingState rows={6} />}>
        <CalendarData />
      </Suspense>
    </div>
  );
}
