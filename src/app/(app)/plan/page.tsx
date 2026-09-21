import { getAllWorkouts, getTrainingWeeks, getLatestBodyMetric, getPhases } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PhaseCard } from "@/components/dashboard/phase-card";
import { AddPhaseButton } from "@/components/phases/add-phase-button";
import { PACE_ZONES } from "@/lib/training/pace-zones";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { HrZoneCard } from "@/components/training/hr-zone-card";
import { AdaptiveZonesCard } from "@/components/training/adaptive-zones-card";
import { summarizePhase } from "@/lib/training/aggregate";
import type { TrainingPhaseId } from "@/lib/training/types";

export default async function PlanPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [weeksResult, workoutsResult, latestBodyMetric, phasesResult] = await Promise.all([
    getTrainingWeeks(),
    getAllWorkouts(),
    getLatestBodyMetric(),
    getPhases(),
  ]);

  // Phases always has a fallback, so it should always be ok
  const phases = phasesResult.status === "ok" ? phasesResult.data : [];

  // Workouts and weeks are required
  if (weeksResult.status !== "ok" || workoutsResult.status !== "ok") {
    return <EmptyState title="Couldn't load the training plan" description="Refresh to try again." />;
  }

  const weeks = weeksResult.data;
  const workouts = workoutsResult.data;

  const weekIdsByPhase = new Map<TrainingPhaseId, Set<string>>();
  const recentRaces = workouts
    .filter((w) => w.is_race && w.completed && w.actual_distance_km != null && w.actual_time_seconds != null)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 1);
  for (const week of weeks) {
    if (!weekIdsByPhase.has(week.phase)) weekIdsByPhase.set(week.phase, new Set());
    weekIdsByPhase.get(week.phase)!.add(week.id);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Training Plan</h1>
          <p className="text-sm text-muted">Six phases from lead-in to the recovery bridge.</p>
        </div>
        <AddPhaseButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {phases.map((phase) => {
          const weekIds = weekIdsByPhase.get(phase.id as TrainingPhaseId) ?? new Set();
          const phaseWorkouts = workouts.filter((w) => w.training_week_id && weekIds.has(w.training_week_id));
          const stats = summarizePhase(phaseWorkouts);
          return <PhaseCard key={phase.id} phase={phase} stats={stats} />;
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Training zones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <HrZoneCard maxHr={latestBodyMetric?.resting_hr ?? null} />
          <PaceZoneCard />
        </div>
      </div>

      <AdaptiveZonesCard recentRaces={recentRaces} />

      <p className="text-xs text-muted">
        Pace zones: Easy {PACE_ZONES[0].paceLow}–{PACE_ZONES[0].paceHigh}/km · Half pace {PACE_ZONES[2].paceLow}/km is
        the A-race goal pace.
      </p>
    </div>
  );
}
