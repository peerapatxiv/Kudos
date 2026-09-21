"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <Card className="overflow-hidden hover:border-foreground/30 transition-all hover:shadow-lg flex flex-col bg-gradient-to-br from-surface to-surface-2/50 border border-border/50">
        <CardContent className="pt-4 pb-3 px-4 space-y-3 flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                  PHASE_COLORS[(phase.color as PhaseColor) || "rest"],
                )}
              >
                {phase.label}
              </span>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {format(new Date(`${phase.startDate}T00:00:00`), "MMM d")} – {format(new Date(`${phase.endDate}T00:00:00`), "MMM d")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted/80">{phase.description}</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <Stat label="Planned" value={`${stats.totalPlannedKm} km`} />
              <Stat label="Workouts" value={String(stats.workoutCount)} />
              <Stat label="Long run" value={stats.longRunKm ? `${stats.longRunKm} km` : "—"} />
            </div>
          )}
        </CardContent>

        <div className="flex gap-2 border-t border-border/30 p-2.5 bg-surface-2/40 justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditOpen(true)}
            className="h-8 w-8"
            title="Edit phase"
          >
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2/60 py-1.5 px-2">
      <p className="text-xs font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
