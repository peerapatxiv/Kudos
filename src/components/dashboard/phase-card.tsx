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

  return (
    <>
      <Card className="overflow-hidden hover:border-foreground/30 transition-colors flex flex-col">
        <CardContent className="pt-5 space-y-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                PHASE_COLORS[(phase.color as PhaseColor) || "rest"],
              )}
            >
              {phase.label}
            </span>
            <span className="text-xs text-muted whitespace-nowrap">
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

        <div className="flex gap-2 border-t border-border/50 p-3 bg-surface-2/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="flex-1 h-8 gap-2"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 h-8 gap-2 hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
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
