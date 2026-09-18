"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modifyWorkout } from "@/lib/training/actions";
import type { Workout } from "@/lib/training/types";

export function EditWorkoutDialog({
  workout,
  open,
  onOpenChange,
}: {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [distance, setDistance] = useState(workout.distance_km != null ? String(workout.distance_km) : "");
  const [notes, setNotes] = useState(workout.athlete_notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmed = distance.trim();
      const distanceKm = trimmed === "" ? null : Number(trimmed);
      if (distanceKm !== null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
        setError("Enter a distance greater than 0, or leave it blank.");
        return;
      }
      const result = await modifyWorkout({ workoutId: workout.id, distanceKm, notes: notes || null });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit workout</DialogTitle>
          <DialogDescription>{workout.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-distance">Distance (km)</Label>
            <Input
              id="edit-distance"
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder={workout.distance_km ? String(workout.distance_km) : "10"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Why the change? (optional)</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
              placeholder="Shortened for tired legs, moved up a day, etc."
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
