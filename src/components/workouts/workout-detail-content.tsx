"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { EditWorkoutDialog } from "@/components/workouts/edit-workout-dialog";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import { phaseForDate } from "@/lib/training/phases";
import type { Race, Workout, WorkoutInterval } from "@/lib/training/types";
import { CheckCircle2, XCircle, PencilLine, PlayCircle, RotateCcw, Trash2 } from "lucide-react";
import { resetWorkout, deleteWorkout } from "@/lib/training/actions";

export function WorkoutDetailContent({
  workout,
  intervals,
  race,
  availableRaces = [],
}: {
  workout: Workout;
  intervals: WorkoutInterval[];
  race: Race | null;
  availableRaces?: Race[];
}) {
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = workoutTypeMeta(workout.workout_type);
  const phase = phaseForDate(workout.date);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkout(workout.id);
      if (result.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete workout");
      }
    });
  };

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
          {workout.is_race && <Badge variant="race">Race</Badge>}
          {phase && <Badge variant={phase.color as any}>{phase.label}</Badge>}
        </div>
        <DialogTitle>{workout.title}</DialogTitle>
        <DialogDescription>{format(new Date(`${workout.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</DialogDescription>
      </DialogHeader>

      {!workout.is_rest_day && (
        <div className="grid grid-cols-2 gap-3">
          {workout.distance_km != null && (
            <Detail label="Distance" value={`${workout.distance_km} km`} />
          )}
          {workout.target_pace_min_sec_per_km && (
            <Detail label="Target pace" value={workout.target_pace_min_sec_per_km} />
          )}
        </div>
      )}

      {race && (
        <div className="rounded-md border border-border bg-surface-2/60 p-3 text-sm">
          <p className="font-medium text-foreground">{race.name}</p>
          {race.goal_time_seconds && (
            <p className="text-muted">Goal {formatDuration(race.goal_time_seconds)}</p>
          )}
          {race.notes && <p className="mt-1 text-xs text-muted">{race.notes}</p>}
        </div>
      )}


      {workout.notes && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</p>
          <p className="mt-1 text-sm text-muted">{workout.notes}</p>
        </div>
      )}

      {workout.completed && (
        <div className="rounded-md border border-completed/30 bg-completed/5 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-completed">
            <CheckCircle2 className="h-4 w-4" /> Completed
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted">
            {workout.actual_distance_km != null && <span>Distance: {workout.actual_distance_km} km</span>}
            {workout.actual_time_seconds != null && <span>Time: {formatDuration(workout.actual_time_seconds)}</span>}
            {workout.actual_pace_seconds_per_km != null && (
              <span>Pace: {secondsToPaceText(workout.actual_pace_seconds_per_km)}/km</span>
            )}
            {workout.perceived_effort != null && <span>Effort: {workout.perceived_effort}/10</span>}
          </div>
          {workout.athlete_notes && <p className="mt-1 text-xs text-muted">&ldquo;{workout.athlete_notes}&rdquo;</p>}
        </div>
      )}

      {workout.status === "skipped" && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-skipped">
          <XCircle className="h-4 w-4" /> Skipped
        </p>
      )}

      {!workout.is_rest_day && (
        <>
          {deleteConfirm ? (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3 space-y-3">
              <p className="text-sm font-medium text-danger">Delete this workout?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={pending}>
                  {pending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="Edit workout" disabled={pending}>
                <PencilLine className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDeleteConfirm(true)} title="Delete workout" disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
              {!workout.completed ? (
                <Button variant="primary" className="flex-1" onClick={() => setLoggerOpen(true)} disabled={pending}>
                  <PlayCircle className="h-4 w-4" />
                  Log this workout
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => resetWorkout(workout.id)} disabled={pending}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {!workout.is_rest_day && (
        <>
          <WorkoutLogger workout={workout} open={loggerOpen} onOpenChange={setLoggerOpen} />
          <EditWorkoutDialog
            key={workout.completed ? "completed" : "planned"}
            workout={workout}
            intervals={intervals}
            race={race}
            open={editOpen}
            onOpenChange={setEditOpen}
            availableRaces={availableRaces}
          />
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2/60 px-3 py-2">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
