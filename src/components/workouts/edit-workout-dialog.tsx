"use client";

import { useState, useTransition, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import {
  editCompletedWorkout,
  modifyWorkout,
  updateWorkoutMetadata,
  deleteWorkout,
} from "@/lib/training/actions";
import { formatDuration, paceFromDistanceAndTime, parseDurationToSeconds, secondsToPaceText } from "@/lib/training/pace";
import type { Workout, WorkoutInterval, Race } from "@/lib/training/types";
import { workoutTypeMeta, WORKOUT_TYPES } from "@/components/workouts/workout-meta";
import { Trash2 } from "lucide-react";

interface EditWorkoutDialogProps {
  workout: Workout;
  intervals: WorkoutInterval[];
  race: Race | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRaces?: Race[];
}

export function EditWorkoutDialog({
  workout,
  intervals,
  race,
  open,
  onOpenChange,
  availableRaces = [],
}: EditWorkoutDialogProps) {
  const [title, setTitle] = useState(workout.title);
  const [workoutType, setWorkoutType] = useState(workout.workout_type);
  const [distance, setDistance] = useState(workout.distance_km != null ? String(workout.distance_km) : "");
  const [targetPace, setTargetPace] = useState(workout.target_pace_min_sec_per_km ?? "");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [athleteNotes, setAthleteNotes] = useState(workout.athlete_notes ?? "");

  // Completed workout fields
  const [actualDistance, setActualDistance] = useState(
    workout.actual_distance_km != null ? String(workout.actual_distance_km) : "",
  );
  const [actualDuration, setActualDuration] = useState(
    workout.actual_time_seconds != null ? formatDuration(workout.actual_time_seconds) : "",
  );
  const [effort, setEffort] = useState(workout.perceived_effort != null ? String(workout.perceived_effort) : "5");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actualDistanceKm = Number(actualDistance);
  const actualDurationSeconds = parseDurationToSeconds(actualDuration);
  const actualPace =
    actualDistanceKm > 0 && actualDurationSeconds
      ? paceFromDistanceAndTime(actualDistanceKm, actualDurationSeconds)
      : null;


  const handleSavePlanned = () => {
    setError(null);
    startTransition(async () => {
      try {
        const distanceKm = distance.trim() === "" ? null : Number(distance);
        if (distanceKm !== null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
          setError("Enter a distance greater than 0, or leave it blank.");
          return;
        }

        // Update metadata
        const metaResult = await updateWorkoutMetadata({
          workoutId: workout.id,
          title,
          workoutType,
          distanceKm,
          targetPaceMinSecPerKm: targetPace || null,
          notes: notes || null,
        });
        if (!metaResult.ok) {
          setError(metaResult.error ?? "Could not save changes.");
          return;
        }

        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  };

  const handleSaveCompleted = () => {
    setError(null);
    startTransition(async () => {
      try {
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

        // Update completed workout
        const result = await editCompletedWorkout({
          workoutId: workout.id,
          actualDistanceKm: distanceKm,
          actualTimeSeconds: timeSeconds,
          perceivedEffort: Number(effort),
          athleteNotes: athleteNotes || null,
        });
        if (!result.ok) {
          setError(result.error ?? "Could not save changes.");
          return;
        }

        // Also update metadata if changed
        const distanceKm2 = distance.trim() === "" ? null : Number(distance);
        if (distanceKm2 !== null && (Number.isNaN(distanceKm2) || distanceKm2 <= 0)) {
          setError("Enter a distance greater than 0, or leave it blank.");
          return;
        }

        await updateWorkoutMetadata({
          workoutId: workout.id,
          title,
          notes: notes || null,
        });

        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit workout</DialogTitle>
          <DialogDescription>{workout.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Basics</h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Workout title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-type">Type</Label>
                <select
                  id="edit-type"
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value as any)}
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  {WORKOUT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {workoutTypeMeta(type).label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-distance">Distance (km)</Label>
                <Input
                  id="edit-distance"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pace">Target pace (min:sec/km)</Label>
              <Input
                id="edit-pace"
                value={targetPace}
                onChange={(e) => setTargetPace(e.target.value)}
                placeholder="5:00"
              />
            </div>
          </section>


          {/* Notes */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Notes</h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Workout notes</Label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="General notes about this workout"
              />
            </div>
          </section>

          {/* Completed Fields */}
          {workout.completed && (
            <section className="space-y-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Completion Data</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-actual-distance">Actual distance (km)</Label>
                  <Input
                    id="edit-actual-distance"
                    inputMode="decimal"
                    value={actualDistance}
                    onChange={(e) => setActualDistance(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-actual-duration">Actual time (mm:ss)</Label>
                  <Input
                    id="edit-actual-duration"
                    value={actualDuration}
                    onChange={(e) => setActualDuration(e.target.value)}
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
                <Label htmlFor="edit-athlete-notes">Notes</Label>
                <textarea
                  id="edit-athlete-notes"
                  value={athleteNotes}
                  onChange={(e) => setAthleteNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                  placeholder="How did it feel?"
                />
              </div>
            </section>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 border-t border-border pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={pending}
              title="Delete this workout"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={workout.completed ? handleSaveCompleted : handleSavePlanned}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete workout?"
        description={`Are you sure you want to delete "${workout.title}"? This action cannot be undone.`}
        destructiveText="Delete"
        onConfirm={async () => {
          const result = await deleteWorkout(workout.id);
          if (!result.ok) {
            throw new Error(result.error ?? "Failed to delete workout");
          }
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
