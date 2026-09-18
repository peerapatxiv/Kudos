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

export default async function ProgressPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [weeksResult, workoutsResult, bodyMetricsResult] = await Promise.all([
    getTrainingWeeks(),
    getAllWorkouts(),
    getBodyMetrics(),
  ]);

  if (weeksResult.status !== "ok" || workoutsResult.status !== "ok") {
    return <EmptyState title="Couldn't load progress" description="Refresh to try again." />;
  }

  const weeks = weeksResult.data.filter((w) => w.week_number >= 0).sort((a, b) => a.week_number - b.week_number);
  const workouts = workoutsResult.data;

  if (workouts.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title="Nothing to show yet" description="Run the seed script to import the training plan." />
    );
  }

  const mileage: WeeklyMileagePoint[] = weeks.map((week) => {
    const weekWorkouts = workouts.filter((w) => w.training_week_id === week.id);
    const stats = summarizeWeek(weekWorkouts);
    return {
      label: week.week_number === 0 ? "Lead-in" : `W${week.week_number}`,
      planned: stats.plannedKm,
      completed: stats.completedKm,
    };
  });

  const pacePoints: PacePoint[] = workouts
    .filter((w) => w.completed && w.actual_pace_seconds_per_km)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({
      date: w.date,
      label: format(new Date(`${w.date}T00:00:00`), "MMM d"),
      paceSeconds: w.actual_pace_seconds_per_km!,
      type: w.workout_type,
    }));

  const longRuns: LongRunPoint[] = weeks
    .map((week) => {
      const weekWorkouts = workouts.filter((w) => w.training_week_id === week.id);
      const stats = summarizeWeek(weekWorkouts);
      return {
        label: week.week_number === 0 ? "Lead-in" : `W${week.week_number}`,
        distanceKm: stats.longRunKm ?? 0,
      };
    })
    .filter((p) => p.distanceKm > 0);

  const breakdown = completionBreakdown(workouts);

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
