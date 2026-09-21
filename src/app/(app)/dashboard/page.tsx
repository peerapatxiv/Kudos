import Link from "next/link";
import { getAllWorkouts, getLatestBodyMetric, getProfile, getRaces, getTrainingWeeks } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RaceDetailDialog } from "@/components/races/race-detail-dialog";
import { TodayWorkoutCard } from "@/components/dashboard/today-workout-card";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { HrZoneCard } from "@/components/training/hr-zone-card";
import { todayIso } from "@/lib/training/dates";
import { phaseForDate } from "@/lib/training/phases";
import { summarizeWeek } from "@/lib/training/aggregate";
import { CalendarDays, Heart, Gauge, Zap, Ruler } from "lucide-react";
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

  const upcomingRaces = races.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {format(new Date(`${today}T00:00:00`), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {phase ? phase.label : "Training"}
        </h1>
      </div>

      {/* Today's Focus */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Today</h2>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latestBodyMetric?.resting_hr && (
            <Card className="min-h-[120px]">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{latestBodyMetric.resting_hr}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">Max HR</p>
                  </div>
                  <Heart className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          )}
          {latestBodyMetric?.vo2max && (
            <Card className="min-h-[120px]">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{latestBodyMetric.vo2max}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">VO2 Max</p>
                  </div>
                  <Zap className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          )}
          {profile?.height_cm && (
            <Card className="min-h-[120px]">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{profile.height_cm}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">Height (cm)</p>
                  </div>
                  <Ruler className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          )}
          {latestBodyMetric?.weight_kg && (
            <Card className="min-h-[120px]">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{latestBodyMetric.weight_kg}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">Weight (kg)</p>
                  </div>
                  <Gauge className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Training Zones */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Training zones</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <HrZoneCard maxHr={latestBodyMetric?.resting_hr ?? null} />
          </div>
          <div>
            <PaceZoneCard />
          </div>
        </div>
      </div>

{/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Next 5 days</h2>
          <Card>
            <CardContent className="pt-5">
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
