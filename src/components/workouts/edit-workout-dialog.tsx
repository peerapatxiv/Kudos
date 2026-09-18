"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editCompletedWorkout, modifyWorkout } from "@/lib/training/actions";
import { formatDuration, paceFromDistanceAndTime, parseDurationToSeconds, secondsToPaceText } from "@/lib/training/pace";
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
  const [actualDistance, setActualDistance] = useState(
    workout.actual_distance_km != null ? String(workout.actual_distance_km) : "",
  );
  const [actualDuration, setActualDuration] = useState(
    workout.actual_time_seconds != null ? formatDuration(workout.actual_time_seconds) : "",
  );
  const [effort, setEffort] = useState(workout.perceived_effort != null ? String(workout.perceived_effort) : "5");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actualDistanceKm = Number(actualDistance);
  const actualDurationSeconds = parseDurationToSeconds(actualDuration);
  const actualPace =
    actualDistanceKm > 0 && actualDurationSeconds
      ? paceFromDistanceAndTime(actualDistanceKm, actualDurationSeconds)
      : null;

  function handleSaveCompleted() {
    setError(null);
    startTransition(async () => {
      const trimmedDistance = actualDistance.trim();
      const distanceKm = trimmedDistance === "" ? null : Number(trimmedDistance);
      if (distanceKm !== null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
        setError("Enter a distance greater than 0, or leave it blank.");
        return;
      }

      const trimmedDuration = actualDuration.trim();
      const timeSeconds = trimmedDuration === "" ? null : parseDurationToSeconds(trimmedDuration);
      if (trimmedDuration !== "" && timeSeconds === null) {
        setError("Enter time as mm:ss or h:mm:ss.");
        return;
      }

      const result = await editCompletedWorkout({
        workoutId: workout.id,
        actualDistanceKm: distanceKm,
        actualTimeSeconds: timeSeconds,
        perceivedEffort: Number(effort),
        athleteNotes: notes || null,
      });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else onOpenChange(false);
    });
  }

  function handleSavePlanned() {
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

        {workout.completed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-actual-distance">Distance (km)</Label>
                <Input
                  id="edit-actual-distance"
                  inputMode="decimal"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-actual-duration">Time (mm:ss)</Label>
                <Input
                  id="edit-actual-duration"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(e.target.value)}
                  placeholder="48:20"
                />
              </div>
            </div>

            {actualPace && (
              <p className="text-xs text-muted">
                Average pace: <span className="font-semibold text-foreground">{secondsToPaceText(actualPace)}/km</span>
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-effort">Perceived effort (1–10)</Label>
              <Input
                id="edit-effort"
                type="range"
                min={1}
                max={10}
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
              <p className="text-right text-xs tabular-nums text-muted">{effort}/10</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-completed-notes">Notes</Label>
              <textarea
                id="edit-completed-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="How did it feel?"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSaveCompleted} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
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
              <Button variant="primary" className="flex-1" onClick={handleSavePlanned} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
