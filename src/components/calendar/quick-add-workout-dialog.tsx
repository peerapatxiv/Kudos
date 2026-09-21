"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { workoutTypeMeta, WORKOUT_TYPES } from "@/components/workouts/workout-meta";
import type { WorkoutType } from "@/lib/training/types";
import { format } from "date-fns";

interface QuickAddWorkoutDialogProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { date: string; title: string; workoutType: WorkoutType; distanceKm?: number }) => Promise<void>;
}

export function QuickAddWorkoutDialog({ date, open, onOpenChange, onSubmit }: QuickAddWorkoutDialogProps) {
  const [selectedType, setSelectedType] = useState<WorkoutType>("easy");
  const [title, setTitle] = useState("");
  const [distance, setDistance] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    if (!title.trim()) {
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
          title: title.trim(),
          workoutType: selectedType,
          distanceKm,
        });
        setTitle("");
        setDistance("");
        setSelectedType("easy");
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
          <DialogDescription>
            {format(new Date(`${date}T00:00:00`), "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Workout Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning run"
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_TYPES.filter((t) => t !== "rest").map((type) => {
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
