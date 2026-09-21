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
  createWorkoutInterval,
  updateWorkoutInterval,
  deleteWorkoutInterval,
  linkWorkoutRace,
  unlinkWorkoutRace,
  deleteWorkout,
} from "@/lib/training/actions";
import { formatDuration, paceFromDistanceAndTime, parseDurationToSeconds, secondsToPaceText } from "@/lib/training/pace";
import type { Workout, WorkoutInterval, Race } from "@/lib/training/types";
import { workoutTypeMeta, WORKOUT_TYPES } from "@/components/workouts/workout-meta";
import { Plus, Trash2, X } from "lucide-react";

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

  // Intervals
  const [editingIntervals, setEditingIntervals] = useState<Map<string, WorkoutInterval>>(new Map(intervals.map(i => [i.id, i])));
  const [newIntervals, setNewIntervals] = useState<Partial<WorkoutInterval>[]>([]);
  const [deletedIntervals, setDeletedIntervals] = useState<string[]>([]);

  // Race
  const [linkedRace, setLinkedRace] = useState<Race | null>(race);
  const [showRaceSelector, setShowRaceSelector] = useState(false);

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

  const handleAddInterval = useCallback(() => {
    const nextNumber = Math.max(
      ...Array.from(editingIntervals.values()).map(i => i.interval_number),
      ...newIntervals.map(i => i.interval_number ?? 0),
      0,
    ) + 1;
    setNewIntervals([...newIntervals, { interval_number: nextNumber, distance_m: 1000 }]);
  }, [editingIntervals, newIntervals]);

  const handleDeleteInterval = useCallback((id: string) => {
    const interval = editingIntervals.get(id);
    if (interval) {
      setDeletedIntervals([...deletedIntervals, id]);
      const newMap = new Map(editingIntervals);
      newMap.delete(id);
      setEditingIntervals(newMap);
    }
  }, [editingIntervals, deletedIntervals]);

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

        // Delete removed intervals
        for (const intervalId of deletedIntervals) {
          const result = await deleteWorkoutInterval(intervalId);
          if (!result.ok) {
            setError(result.error ?? "Could not delete interval.");
            return;
          }
        }

        // Update existing intervals
        for (const [id, interval] of editingIntervals.entries()) {
          const original = intervals.find(i => i.id === id);
          if (original && JSON.stringify(original) !== JSON.stringify(interval)) {
            const result = await updateWorkoutInterval({
              intervalId: id,
              distanceM: interval.distance_m,
              targetPaceSecondsPerKm: interval.target_pace_seconds_per_km ?? null,
              recoverySeconds: interval.recovery_seconds ?? null,
              recoveryType: interval.recovery_type ?? null,
            });
            if (!result.ok) {
              setError(result.error ?? "Could not update interval.");
              return;
            }
          }
        }

        // Create new intervals
        for (const newInterval of newIntervals) {
          if (newInterval.distance_m) {
            const result = await createWorkoutInterval({
              workoutId: workout.id,
              intervalNumber: newInterval.interval_number ?? 1,
              distanceM: newInterval.distance_m,
              targetPaceSecondsPerKm: newInterval.target_pace_seconds_per_km ?? null,
              recoverySeconds: newInterval.recovery_seconds ?? null,
              recoveryType: newInterval.recovery_type ?? null,
            });
            if (!result.ok) {
              setError(result.error ?? "Could not create interval.");
              return;
            }
          }
        }

        // Update race link
        if (linkedRace && race?.id !== linkedRace.id) {
          const raceResult = await linkWorkoutRace({
            workoutId: workout.id,
            raceId: linkedRace.id,
          });
          if (!raceResult.ok) {
            setError(raceResult.error ?? "Could not link race.");
            return;
          }
        } else if (!linkedRace && race) {
          const raceResult = await unlinkWorkoutRace(workout.id);
          if (!raceResult.ok) {
            setError(raceResult.error ?? "Could not unlink race.");
            return;
          }
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

          {/* Intervals */}
          {!workout.is_rest_day && (
            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Intervals</h3>
                <Button size="sm" variant="outline" onClick={handleAddInterval} disabled={pending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {Array.from(editingIntervals.values()).map((interval) => (
                  <div key={interval.id} className="flex gap-2 rounded-md border border-border bg-surface/50 p-3">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`interval-distance-${interval.id}`} className="text-xs">
                            Distance (m)
                          </Label>
                          <Input
                            id={`interval-distance-${interval.id}`}
                            inputMode="decimal"
                            value={interval.distance_m}
                            onChange={(e) => {
                              const updated = { ...interval, distance_m: Number(e.target.value) };
                              setEditingIntervals(new Map(editingIntervals).set(interval.id, updated));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`interval-pace-${interval.id}`} className="text-xs">
                            Pace (sec/km)
                          </Label>
                          <Input
                            id={`interval-pace-${interval.id}`}
                            inputMode="decimal"
                            value={interval.target_pace_seconds_per_km ?? ""}
                            onChange={(e) => {
                              const updated = {
                                ...interval,
                                target_pace_seconds_per_km: e.target.value ? Number(e.target.value) : null,
                              };
                              setEditingIntervals(new Map(editingIntervals).set(interval.id, updated));
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`interval-recovery-${interval.id}`} className="text-xs">
                            Recovery (sec)
                          </Label>
                          <Input
                            id={`interval-recovery-${interval.id}`}
                            inputMode="decimal"
                            value={interval.recovery_seconds ?? ""}
                            onChange={(e) => {
                              const updated = {
                                ...interval,
                                recovery_seconds: e.target.value ? Number(e.target.value) : null,
                              };
                              setEditingIntervals(new Map(editingIntervals).set(interval.id, updated));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`interval-type-${interval.id}`} className="text-xs">
                            Recovery type
                          </Label>
                          <select
                            id={`interval-type-${interval.id}`}
                            value={interval.recovery_type ?? ""}
                            onChange={(e) => {
                              const updated = {
                                ...interval,
                                recovery_type: (e.target.value as any) || null,
                              };
                              setEditingIntervals(new Map(editingIntervals).set(interval.id, updated));
                            }}
                            className="flex w-full rounded-md border border-border bg-surface px-2 py-1 text-xs"
                          >
                            <option value="">None</option>
                            <option value="jog">Jog</option>
                            <option value="walk">Walk</option>
                            <option value="easy_pace">Easy pace</option>
                            <option value="stand">Stand</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteInterval(interval.id)}
                      disabled={pending}
                      className="mt-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {newIntervals.map((interval, idx) => (
                  <div key={`new-${idx}`} className="flex gap-2 rounded-md border border-border bg-surface/50 p-3">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Distance (m)</Label>
                          <Input
                            inputMode="decimal"
                            value={interval.distance_m ?? ""}
                            onChange={(e) => {
                              const updated = [...newIntervals];
                              updated[idx] = { ...interval, distance_m: Number(e.target.value) };
                              setNewIntervals(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pace (sec/km)</Label>
                          <Input
                            inputMode="decimal"
                            value={interval.target_pace_seconds_per_km ?? ""}
                            onChange={(e) => {
                              const updated = [...newIntervals];
                              updated[idx] = {
                                ...interval,
                                target_pace_seconds_per_km: e.target.value ? Number(e.target.value) : null,
                              };
                              setNewIntervals(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Recovery (sec)</Label>
                          <Input
                            inputMode="decimal"
                            value={interval.recovery_seconds ?? ""}
                            onChange={(e) => {
                              const updated = [...newIntervals];
                              updated[idx] = {
                                ...interval,
                                recovery_seconds: e.target.value ? Number(e.target.value) : null,
                              };
                              setNewIntervals(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Recovery type</Label>
                          <select
                            value={interval.recovery_type ?? ""}
                            onChange={(e) => {
                              const updated = [...newIntervals];
                              updated[idx] = {
                                ...interval,
                                recovery_type: (e.target.value as any) || null,
                              };
                              setNewIntervals(updated);
                            }}
                            className="flex w-full rounded-md border border-border bg-surface px-2 py-1 text-xs"
                          >
                            <option value="">None</option>
                            <option value="jog">Jog</option>
                            <option value="walk">Walk</option>
                            <option value="easy_pace">Easy pace</option>
                            <option value="stand">Stand</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setNewIntervals(newIntervals.filter((_, i) => i !== idx))}
                      disabled={pending}
                      className="mt-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Race */}
          {!workout.is_rest_day && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Race</h3>
              {linkedRace ? (
                <div className="flex items-center justify-between rounded-md bg-surface/50 p-3">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{linkedRace.name}</p>
                    <p className="text-xs text-muted">{linkedRace.distance_km} km</p>
                  </div>
                  <button
                    onClick={() => setLinkedRace(null)}
                    disabled={pending}
                    className="text-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowRaceSelector(!showRaceSelector)}>
                  Link race
                </Button>
              )}
              {showRaceSelector && availableRaces.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableRaces.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setLinkedRace(r);
                        setShowRaceSelector(false);
                      }}
                      disabled={pending}
                      className="w-full rounded-md border border-border p-2 text-left text-sm hover:bg-surface/50"
                    >
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted">{r.distance_km} km</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

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
