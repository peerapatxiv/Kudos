"use client";

import { useState } from "react";
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
import { CheckCircle2, XCircle, PencilLine, PlayCircle, RotateCcw } from "lucide-react";
import { resetWorkout } from "@/lib/training/actions";

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
  const meta = workoutTypeMeta(workout.workout_type);
  const phase = phaseForDate(workout.date);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
          {workout.is_race && <Badge variant="race">Race</Badge>}
          {phase && <Badge variant="neutral">{phase.label}</Badge>}
        </div>
        <DialogTitle>{workout.title}</DialogTitle>
        <DialogDescription>{format(new Date(`${workout.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</DialogDescription>
      </DialogHeader>

      {!workout.is_rest_day && (
        <div className="grid grid-cols-2 gap-3 text-sm">
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

      {intervals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Main set</p>
          <div className="space-y-1.5">
            {intervals.map((interval) => (
              <div
                key={interval.id}
                className="flex items-center justify-between rounded-md bg-surface-2/60 px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  #{interval.interval_number} · {interval.distance_m >= 1000 ? `${interval.distance_m / 1000} km` : `${interval.distance_m} m`}
                </span>
                <span className="text-muted">
                  {interval.target_pace_seconds_per_km ? `${secondsToPaceText(interval.target_pace_seconds_per_km)}/km` : "—"}
                  {interval.recovery_seconds
                    ? ` · ${interval.recovery_seconds}s ${interval.recovery_type ?? "recovery"}`
                    : interval.recovery_type
                      ? ` · ${interval.recovery_type} recovery`
                      : ""}
                </span>
              </div>
            ))}
          </div>
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
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="Edit workout">
            <PencilLine className="h-4 w-4" />
          </Button>
          {!workout.completed ? (
            <Button variant="primary" className="flex-1" onClick={() => setLoggerOpen(true)}>
              <PlayCircle className="h-4 w-4" />
              Log this workout
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={() => resetWorkout(workout.id)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
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
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
