"use client";

import { useState, useTransition, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { workoutTypeMeta, WORKOUT_TYPES } from "@/components/workouts/workout-meta";
import type { WorkoutType } from "@/lib/training/types";
import { format } from "date-fns";
import { SEED_WORKOUTS } from "@/lib/training/plan-data";
import { ChevronRight } from "lucide-react";

interface QuickAddWorkoutDialogProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    date: string;
    title: string;
    workoutType: WorkoutType;
    distanceKm?: number;
    targetPace?: string;
    isCompleted?: boolean;
  }) => Promise<void>;
}

export function QuickAddWorkoutDialog({ date, open, onOpenChange, onSubmit }: QuickAddWorkoutDialogProps) {
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<WorkoutType>("easy");
  const [title, setTitle] = useState("");
  const [distance, setDistance] = useState("");
  const [pace, setPace] = useState("");
  const [workoutMode, setWorkoutMode] = useState<"plan" | "activity">("plan");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const planWorkouts = useMemo(() => {
    return SEED_WORKOUTS.filter((w) => w.date === date);
  }, [date]);

  const handleSelectPlanWorkout = (index: number) => {
    const workout = planWorkouts[index];
    setSelectedWorkoutIndex(index);
    setSelectedType(workout.workout_type);
    setTitle(workout.title);
    setDistance(workout.distance_km?.toString() || "");
    setPace(workout.paceText || "");
  };

  const handleSubmit = () => {
    setError(null);

    const finalTitle = selectedType === "rest" && !title.trim() ? "Rest Day" : title.trim();
    if (!finalTitle) {
      setError("Please enter a workout title");
      return;
    }

    const distanceKm = distance.trim() ? Number(distance) : undefined;
    if (distanceKm !== undefined && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
      setError("Enter a valid distance or leave it blank");
      return;
    }

    startTransition(async () => {
      try {
        await onSubmit({
          date,
          title: finalTitle,
          workoutType: selectedType,
          distanceKm: selectedType === "rest" ? undefined : distanceKm,
          targetPace: pace.trim() || undefined,
          isCompleted: workoutMode === "activity",
        });
        setTitle("");
        setDistance("");
        setPace("");
        setSelectedType("easy");
        setWorkoutMode("plan");
        setSelectedWorkoutIndex(null);
        setMode("select");
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add workout");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Workout</DialogTitle>
          {date && (
            <DialogDescription>
              {format(new Date(`${date}T00:00:00`), "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Custom Workout Form Only */}
          <>
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  {selectedType === "rest" ? "Title (Optional)" : "Workout Title"}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedType === "rest" ? "Leave blank for 'Rest Day'" : "e.g., Morning run"}
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WORKOUT_TYPES.map((type) => {
                    const meta = workoutTypeMeta(type);
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        disabled={pending}
                        className="flex items-center gap-1.5 rounded-md border-2 px-2 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderColor: selectedType === type ? "var(--a-race)" : "var(--border)",
                          backgroundColor: selectedType === type ? "var(--a-race)" : "transparent",
                          color: selectedType === type ? "white" : "var(--foreground)",
                        }}
                      >
                        <meta.icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Workout Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWorkoutMode("plan")}
                    disabled={pending}
                    className="rounded-md border-2 px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      borderColor: workoutMode === "plan" ? "var(--tempo)" : "var(--border)",
                      backgroundColor: workoutMode === "plan" ? "var(--tempo)" : "transparent",
                      color: workoutMode === "plan" ? "white" : "var(--foreground)",
                    }}
                  >
                    Plan
                  </button>
                  <button
                    onClick={() => setWorkoutMode("activity")}
                    disabled={pending}
                    className="rounded-md border-2 px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      borderColor: workoutMode === "activity" ? "var(--completed)" : "var(--border)",
                      backgroundColor: workoutMode === "activity" ? "var(--completed)" : "transparent",
                      color: workoutMode === "activity" ? "white" : "var(--foreground)",
                    }}
                  >
                    Activity Done
                  </button>
                </div>
              </div>

              {selectedType !== "rest" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="distance">Distance (km) - Optional</Label>
                    <Input
                      id="distance"
                      inputMode="decimal"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="10.5"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pace">
                      {workoutMode === "plan" ? "Target pace" : "Pace"} (min:sec/km) - Optional
                    </Label>
                    <Input
                      id="pace"
                      value={pace}
                      onChange={(e) => setPace(e.target.value)}
                      placeholder="5:00"
                      disabled={pending}
                    />
                  </div>
                </>
              )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={pending}
            >
              {pending ? "Adding..." : "Add Workout"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </>
        </div>
      </DialogContent>
    </Dialog>
  );
}
