"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditPhaseDialog } from "@/components/phases/edit-phase-dialog";
import { deletePhase } from "@/lib/training/actions";
import type { PhaseDefinition } from "@/lib/training/phases";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PencilLine, Trash2 } from "lucide-react";

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
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${phase.label}" phase?`)) return;

    setDeleting(true);
    const result = await deletePhase(phase.id);
    setDeleting(false);

    if (!result.ok) {
      alert("Failed to delete phase: " + result.error);
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:border-foreground/30 transition-colors group" onClick={() => setEditOpen(true)}>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                PHASE_TONE[phase.id],
              )}
            >
              {phase.label}
            </span>
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted">
                {format(new Date(`${phase.startDate}T00:00:00`), "MMM d")} –{" "}
                {format(new Date(`${phase.endDate}T00:00:00`), "MMM d")}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilLine className="h-4 w-4 text-muted flex-shrink-0" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-4 w-4 p-0 text-muted hover:text-danger hover:bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
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

      <EditPhaseDialog phase={phase} open={editOpen} onOpenChange={setEditOpen} />
    </>
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
