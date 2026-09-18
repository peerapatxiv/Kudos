"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { completeWorkout, skipWorkout } from "@/lib/training/actions";
import { enqueueCompletion } from "@/lib/offline/workout-queue";
import { paceFromDistanceAndTime, secondsToPaceText } from "@/lib/training/pace";
import type { Workout } from "@/lib/training/types";

export function WorkoutLogger({
  workout,
  open,
  onOpenChange,
}: {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [distance, setDistance] = useState(workout.distance_km ? String(workout.distance_km) : "");
  const [duration, setDuration] = useState("");
  const [effort, setEffort] = useState("5");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distanceKm = Number(distance);
  const durationSeconds = parseDuration(duration);
  const pace =
    distanceKm > 0 && durationSeconds ? paceFromDistanceAndTime(distanceKm, durationSeconds) : null;

  function reset() {
    setDone(false);
    setQueuedOffline(false);
    setError(null);
  }

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const input = {
        workoutId: workout.id,
        actualDistanceKm: distanceKm > 0 ? distanceKm : null,
        actualTimeSeconds: durationSeconds,
        perceivedEffort: Number(effort),
        athleteNotes: notes || null,
      };
      try {
        const result = await completeWorkout(input);
        if (!result.ok) {
          setError(result.error ?? "Could not save this workout.");
          return;
        }
        setDone(true);
      } catch {
        enqueueCompletion(input);
        setQueuedOffline(true);
        setDone(true);
      }
    });
  }

  function handleSkip() {
    setError(null);
    startTransition(async () => {
      const result = await skipWorkout(workout.id, notes || undefined);
      if (!result.ok) setError(result.error ?? "Could not update this workout.");
      else onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper className="h-7 w-7" />
            </div>
            <DialogTitle>{queuedOffline ? "Saved Offline" : "Workout Complete"}</DialogTitle>
            <p className="text-sm text-muted">
              {queuedOffline
                ? "You're offline — this will sync automatically once you're back online."
                : `${distanceKm > 0 ? `${distanceKm} km` : workout.title}${durationSeconds ? ` in ${duration}` : ""}${pace ? ` · ${secondsToPaceText(pace)}/km avg` : ""}`}
            </p>
            <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-2 w-full">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Log workout</DialogTitle>
              <DialogDescription>{workout.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    inputMode="decimal"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Time (mm:ss)</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="48:20"
                  />
                </div>
              </div>

              {pace && (
                <p className="text-xs text-muted">
                  Average pace: <span className="font-semibold text-foreground">{secondsToPaceText(pace)}/km</span>
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="effort">Perceived effort (1–10)</Label>
                <Input
                  id="effort"
                  type="range"
                  min={1}
                  max={10}
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                />
                <p className="text-right text-xs tabular-nums text-muted">{effort}/10</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                  placeholder="How did it feel?"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={handleSkip} disabled={pending}>
                  Skip
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleComplete} disabled={pending}>
                  <CheckCircle2 className="h-4 w-4" />
                  {pending ? "Saving…" : "Mark Complete"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function parseDuration(input: string): number | null {
  const parts = input.trim().split(":").map(Number);
  if (parts.length === 0 || parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
