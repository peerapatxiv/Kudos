import { Card, CardContent } from "@/components/ui/card";
import type { PhaseDefinition } from "@/lib/training/phases";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PHASE_TONE: Record<string, string> = {
  lead_in: "bg-rest/15 text-rest",
  pre_plan: "bg-rest/15 text-rest",
  base: "bg-easy/15 text-easy",
  build: "bg-tempo/15 text-tempo",
  peak: "bg-interval/15 text-interval",
  taper: "bg-secondary-race/15 text-secondary-race",
  recovery_bridge: "bg-recovery/15 text-recovery",
};

export function PhaseCard({
  phase,
  stats,
}: {
  phase: PhaseDefinition;
  stats?: { totalPlannedKm: number; workoutCount: number; longRunKm: number | null };
}) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", PHASE_TONE[phase.id])}>
            {phase.label}
          </span>
          <span className="text-xs text-muted">
            {format(new Date(`${phase.startDate}T00:00:00`), "MMM d")} –{" "}
            {format(new Date(`${phase.endDate}T00:00:00`), "MMM d")}
          </span>
        </div>
        <p className="text-sm text-muted">{phase.description}</p>
        {stats && (
          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <Stat label="Planned" value={`${stats.totalPlannedKm} km`} />
            <Stat label="Workouts" value={String(stats.workoutCount)} />
            <Stat label="Long run" value={stats.longRunKm ? `${stats.longRunKm} km` : "—"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2/60 py-2">
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
