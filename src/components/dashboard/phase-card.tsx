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
      <div className="group rounded-xl border border-border/50 bg-gradient-to-br from-surface/80 via-surface to-surface-2/40 backdrop-blur-sm overflow-hidden transition-all hover:border-foreground/30 hover:shadow-xl hover:shadow-foreground/5 flex flex-col">
        <div className="p-6 space-y-5 flex-1">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "inline-block rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-transform group-hover:scale-105",
                  PHASE_COLORS[(phase.color as PhaseColor) || "rest"],
                )}
              >
                {phase.label}
              </span>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Duration</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(`${phase.startDate}T00:00:00`), "MMM d")}
                  <span className="text-muted mx-1.5">→</span>
                  {format(new Date(`${phase.endDate}T00:00:00`), "MMM d")}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted/85">{phase.description}</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg bg-gradient-to-br from-surface-2/60 to-surface-2/30 p-3 text-center border border-border/30">
                <p className="text-lg font-bold text-foreground">{stats.totalPlannedKm}</p>
                <p className="text-xs uppercase tracking-wide text-muted mt-1">Planned km</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-surface-2/60 to-surface-2/30 p-3 text-center border border-border/30">
                <p className="text-lg font-bold text-foreground">{stats.workoutCount}</p>
                <p className="text-xs uppercase tracking-wide text-muted mt-1">Workouts</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-surface-2/60 to-surface-2/30 p-3 text-center border border-border/30">
                <p className="text-lg font-bold text-foreground">{stats.longRunKm ? `${stats.longRunKm}` : "—"}</p>
                <p className="text-xs uppercase tracking-wide text-muted mt-1">Long run km</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 border-t border-border/30 p-4 bg-gradient-to-r from-surface-2/40 to-surface-2/20 backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="flex-1 h-10 gap-2 font-medium text-sm rounded-lg hover:bg-foreground hover:text-background transition-colors"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 h-10 gap-2 font-medium text-sm rounded-lg hover:bg-danger/15 hover:text-danger transition-colors text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <EditPhaseDialog phase={phase} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
