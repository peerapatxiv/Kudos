"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkoutMetadata, linkWorkoutRace, unlinkWorkoutRace } from "@/lib/training/actions";
import type { Workout, WorkoutInterval, Race } from "@/lib/training/types";

export function EditWorkoutDialog({
  workout,
  race,
  open,
  onOpenChange,
  availableRaces = [],
}: {
  workout: Workout;
  intervals?: WorkoutInterval[];
  race: Race | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRaces?: Race[];
}) {
  const [title, setTitle] = useState(workout.title);
  const [workoutType, setWorkoutType] = useState(workout.workout_type);
  const [distanceKm, setDistanceKm] = useState(workout.distance_km?.toString() || "");
  const [targetPace, setTargetPace] = useState(workout.target_pace_min_sec_per_km || "");
  const [notes, setNotes] = useState(workout.notes || "");
  const [selectedRaceId, setSelectedRaceId] = useState(race?.id || "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    startTransition(async () => {
      const result = await updateWorkoutMetadata({
        workoutId: workout.id,
        title,
        workoutType,
        distanceKm: distanceKm ? parseFloat(distanceKm) : null,
        targetPaceMinSecPerKm: targetPace || null,
        notes: notes || null,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not save changes.");
        return;
      }

      // Handle race linking
      if (selectedRaceId && !race) {
        const raceResult = await linkWorkoutRace({
          workoutId: workout.id,
          raceId: selectedRaceId,
        });
        if (!raceResult.ok) {
          setError(raceResult.error ?? "Could not link race.");
          return;
        }
      } else if (!selectedRaceId && race) {
        const unlinkResult = await unlinkWorkoutRace(workout.id);
        if (!unlinkResult.ok) {
          setError(unlinkResult.error ?? "Could not unlink race.");
          return;
        }
      }

      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="workout-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="workout-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Easy run"
              className="h-9"
            />
          </div>

          {/* Workout Type */}
          <div className="space-y-2">
            <Label htmlFor="workout-type" className="text-sm font-medium">
              Workout type
            </Label>
            <select
              id="workout-type"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value as any)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
            >
              <option value="easy">Easy</option>
              <option value="tempo">Tempo</option>
              <option value="interval">Interval</option>
              <option value="long_run">Long run</option>
              <option value="recovery">Recovery</option>
              <option value="rest">Rest</option>
              <option value="race">Race</option>
            </select>
          </div>

          {/* Distance */}
          <div className="space-y-2">
            <Label htmlFor="workout-distance" className="text-sm font-medium">
              Distance (km)
            </Label>
            <Input
              id="workout-distance"
              type="number"
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="e.g., 10"
              className="h-9"
            />
          </div>

          {/* Target Pace */}
          <div className="space-y-2">
            <Label htmlFor="workout-pace" className="text-sm font-medium">
              Target pace (min:sec/km)
            </Label>
            <Input
              id="workout-pace"
              value={targetPace}
              onChange={(e) => setTargetPace(e.target.value)}
              placeholder="e.g., 5:30"
              className="h-9"
            />
          </div>

          {/* Race */}
          {availableRaces.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="workout-race" className="text-sm font-medium">
                Race
              </Label>
              <select
                id="workout-race"
                value={selectedRaceId}
                onChange={(e) => setSelectedRaceId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
              >
                <option value="">None</option>
                {availableRaces.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="workout-notes" className="text-sm font-medium">
              Notes
            </Label>
            <textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 resize-none"
              placeholder="Add notes about this workout..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-danger/10 border border-danger/20 p-3">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 h-9"
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
