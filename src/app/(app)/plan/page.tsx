import { getAllWorkouts, getTrainingWeeks, getLatestBodyMetric, getPhases, getProfile } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PhaseCard } from "@/components/dashboard/phase-card";
import { AddPhaseButton } from "@/components/phases/add-phase-button";
import { resolveHrZones, resolvePaceZones } from "@/lib/training/zones";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { HrZoneCard } from "@/components/training/hr-zone-card";
import { AdaptiveZonesCard } from "@/components/training/adaptive-zones-card";
import { summarizePhase } from "@/lib/training/aggregate";
import type { TrainingPhaseId } from "@/lib/training/types";

export default async function PlanPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [weeksResult, workoutsResult, latestBodyMetric, phasesResult, profile] = await Promise.all([
    getTrainingWeeks(),
    getAllWorkouts(),
    getLatestBodyMetric(),
    getPhases(),
    getProfile(),
  ]);

  // The body-metrics "Max HR" value is stored in resting_hr.
  const hrZones = resolveHrZones(latestBodyMetric?.resting_hr ?? null, profile?.hr_zones ?? null);
  const paceZones = resolvePaceZones(profile?.pace_zones ?? null);
  const easyZone = paceZones.find((z) => z.id === "easy");
  const halfZone = paceZones.find((z) => z.id === "half");

  // Always show page - use empty arrays as fallback for failed queries
  const phases = phasesResult.status === "ok" ? phasesResult.data : [];
  const weeks = weeksResult.status === "ok" ? weeksResult.data : [];
  const workouts = workoutsResult.status === "ok" ? workoutsResult.data : [];

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Training Plan</h1>
          <p className="text-sm text-muted">Training phases</p>
        </div>
        <AddPhaseButton />
      </div>

      {/* Phases Section */}
      {phases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="text-sm font-medium text-foreground mb-2">Start building your plan</p>
          <p className="text-xs text-muted">Click the "+ Add phase" button above to create your first training phase</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2">
          {phases.map((phase) => {
            const weekIds = weekIdsByPhase.get(phase.id as TrainingPhaseId) ?? new Set();
            const phaseWorkouts = workouts.filter((w) => w.training_week_id && weekIds.has(w.training_week_id));
            const stats = summarizePhase(phaseWorkouts);
            return <PhaseCard key={phase.id} phase={phase} stats={stats} />;
          })}
        </div>
      )}

      {/* Training Zones - Always Show */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Training zones</h2>
        <div className="grid gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2">
          <HrZoneCard zones={hrZones} editable />
          <PaceZoneCard zones={paceZones} editable />
        </div>
      </div>

      {/* Adaptive Zones - Always Show */}
      <AdaptiveZonesCard recentRaces={recentRaces} />

      {/* Pace Info - Always Show */}
      <p className="text-xs text-muted">
        Pace zones: Easy {easyZone?.paceLow}
        {easyZone?.paceHigh ? `–${easyZone.paceHigh}` : ""}/km · Half pace {halfZone?.paceLow}/km is the A-race goal pace.
      </p>
    </div>
  );
}
