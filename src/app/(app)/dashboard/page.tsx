import Link from "next/link";
import { getAllWorkouts, getLatestBodyMetric, getProfile, getRaces, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RaceDetailDialog } from "@/components/races/race-detail-dialog";
import { TodayWorkoutCard } from "@/components/dashboard/today-workout-card";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { BodyMetricsSummary } from "@/components/dashboard/body-metrics-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { HrZoneCard } from "@/components/training/hr-zone-card";
import { todayIso } from "@/lib/training/dates";
import { phaseForDate } from "@/lib/training/phases";
import { summarizeWeek } from "@/lib/training/aggregate";
import { CalendarDays } from "lucide-react";
import { format, addDays } from "date-fns";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="pt-8">
        <SupabaseNotConfigured />
      </div>
    );
  }

  const [racesResult, weeksResult, workoutsResult, latestBodyMetric, profile] = await Promise.all([
    getRaces(),
    getTrainingWeeks(),
    getAllWorkouts(),
    getLatestBodyMetric(),
    getProfile(),
  ]);

  if (racesResult.status === "error" || weeksResult.status === "error" || workoutsResult.status === "error") {
    return (
      <EmptyState
        title="Couldn't load your dashboard"
        description="There was a problem reaching Supabase. Refresh to try again."
      />
    );
  }

  const today = todayIso();
  const races = racesResult.status === "ok" ? racesResult.data : [];
  const weeks = weeksResult.status === "ok" ? weeksResult.data : [];
  const workouts = workoutsResult.status === "ok" ? workoutsResult.data : [];

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No training plan yet"
        description="Run the seed script to import the full plan into Supabase — see README.md."
      />
    );
  }

  const aRace = races.find((r) => r.priority === "a_race") ?? null;
  const secondaryRace = races.find((r) => r.priority === "secondary") ?? null;

  const todayWorkout = workouts.find((w) => w.date === today) ?? null;
  const phase = phaseForDate(today);
  const currentWeek = weeks.find((w) => today >= w.start_date && today <= w.end_date) ?? null;
  const weekWorkouts = currentWeek ? workouts.filter((w) => w.training_week_id === currentWeek.id) : [];
  const weekStats = summarizeWeek(weekWorkouts);

  const upcoming = workouts
    .filter((w) => w.date > today && w.date <= format(addDays(new Date(`${today}T00:00:00`), 5), "yyyy-MM-dd"))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {format(new Date(`${today}T00:00:00`), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {phase ? phase.label : "Training"}
        </h1>
      </div>

      <TodayWorkoutCard workout={todayWorkout} phase={phase} />

      <div className="grid gap-4 sm:grid-cols-2">
        {aRace && <RaceDetailDialog race={aRace} />}
        {secondaryRace && <RaceDetailDialog race={secondaryRace} />}
      </div>

      {currentWeek && <WeeklySummary week={currentWeek} stats={weekStats} />}

      <BodyMetricsSummary metric={latestBodyMetric} profile={profile} />

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next up</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingList workouts={upcoming} />
          </CardContent>
        </Card>
      )}

      <HrZoneCard maxHr={latestBodyMetric?.resting_hr ?? null} />

      <PaceZoneCard />

      <p className="text-center text-xs text-muted">
        <Link href="/plan" className="underline underline-offset-2">
          View the full training plan
        </Link>
      </p>
    </div>
  );
}
