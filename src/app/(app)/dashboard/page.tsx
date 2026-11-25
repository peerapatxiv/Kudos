import Link from "next/link";
import { getAllWorkouts, getLatestBodyMetric, getProfile, getRaces, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RaceDetailDialog } from "@/components/races/race-detail-dialog";
import { TodayWorkoutCard } from "@/components/dashboard/today-workout-card";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { Card, CardContent } from "@/components/ui/card";
import { todayIso } from "@/lib/training/dates";
import { phaseForDate } from "@/lib/training/phases";
import { summarizeWeek } from "@/lib/training/aggregate";
import { Heart, Gauge, Zap, Ruler, Target, Calendar } from "lucide-react";
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

  const upcomingRaces = races
    .filter((r) => r.date.slice(0, 10) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      {/* Header */}
      <div className="rounded-lg border border-border/50 bg-gradient-to-br from-surface-2/40 to-surface-2/20 p-6 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-2">
          {format(new Date(`${today}T00:00:00`), "EEEE, MMMM d, yyyy")}
        </p>
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-a-race/60" />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            {phase ? phase.label : "Training"}
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-a-race/60" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Today</h2>
        </div>
        <TodayWorkoutCard workout={todayWorkout} phase={phase} />
      </div>

      {/* Key Races */}
      {upcomingRaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Upcoming races</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingRaces.map((race) => (
              <RaceDetailDialog key={race.id} race={race} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      {currentWeek && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">This week</h2>
          <WeeklySummary week={currentWeek} stats={weekStats} />
        </div>
      )}

      {/* Key Metrics */}
      {(latestBodyMetric || profile?.height_cm) && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Key metrics</h2>
          <div className="grid gap-3 grid-cols-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latestBodyMetric?.resting_hr && (
            <Card className="hover:border-foreground/20 transition-all hover:shadow-lg hover:bg-surface-2/40">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-bold text-foreground">{latestBodyMetric.resting_hr}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted leading-tight">Resting HR</p>
                  </div>
                  <Heart className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
          {latestBodyMetric?.vo2max && (
            <Card className="hover:border-foreground/20 transition-all hover:shadow-lg hover:bg-surface-2/40">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-bold text-foreground">{latestBodyMetric.vo2max}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted leading-tight">VO2 Max</p>
                  </div>
                  <Zap className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
          {profile?.height_cm && (
            <Card className="hover:border-foreground/20 transition-all hover:shadow-lg hover:bg-surface-2/40">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-bold text-foreground">{profile.height_cm}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted leading-tight">Height (cm)</p>
                  </div>
                  <Ruler className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
          {latestBodyMetric?.weight_kg && (
            <Card className="hover:border-foreground/20 transition-all hover:shadow-lg hover:bg-surface-2/40">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-bold text-foreground">{latestBodyMetric.weight_kg}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted leading-tight">Weight (kg)</p>
                  </div>
                  <Gauge className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Next 5 days</h2>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <UpcomingList workouts={upcoming} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-muted">
        <Link href="/plan" className="underline underline-offset-2">
          View the full training plan
        </Link>
      </p>
    </div>
  );
}
