"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditPhaseDialog } from "@/components/phases/edit-phase-dialog";
import { deletePhase } from "@/lib/training/actions";
import type { PhaseDefinition } from "@/lib/training/phases";
import { PHASE_COLORS, type PhaseColor } from "@/lib/training/phases";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PencilLine, Trash2 } from "lucide-react";

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

  const colorKey = (phase.color as PhaseColor) || "rest";
  const colorClass = PHASE_COLORS[colorKey];

  return (
    <>
      <Card className="overflow-hidden cursor-pointer hover:border-foreground/30 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col bg-surface border border-border/50">
        <CardContent className="flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6 flex flex-col gap-3 sm:gap-4 md:gap-5">
          {/* Header: Phase name + Date */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold uppercase tracking-wide w-fit", colorClass)}>
              {phase.label}
            </span>
            <span className="text-xs font-medium text-muted-foreground leading-tight">
              {format(new Date(`${phase.startDate}T00:00:00`), "MMM d")} – {format(new Date(`${phase.endDate}T00:00:00`), "MMM d")}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted">{phase.description}</p>

          {/* Metrics Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 auto-rows-max md:auto-rows-auto -mt-1">
              <div className="col-span-2 md:col-span-1">
                <MetricBox label="Planned" value={`${stats.totalPlannedKm}`} unit="km" />
              </div>
              <MetricBox label="Workouts" value={String(stats.workoutCount)} unit="" />
              <MetricBox label="Long run" value={stats.longRunKm ? `${stats.longRunKm}` : "—"} unit={stats.longRunKm ? "km" : ""} />
            </div>
          )}
        </CardContent>

        {/* Footer: Actions */}
        <div className="flex gap-2 border-t border-border/30 px-3 py-2.5 sm:px-4 md:px-6 md:py-3 justify-end">
          <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} className="h-8 w-8" title="Edit phase">
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 w-8 text-muted-foreground hover:text-danger hover:border-danger/50"
            title="Delete phase"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <EditPhaseDialog phase={phase} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

function MetricBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-surface-2/50 border border-border/30 p-2.5 sm:p-3 md:p-4 flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-base sm:text-lg md:text-xl font-semibold text-foreground tabular-nums">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
