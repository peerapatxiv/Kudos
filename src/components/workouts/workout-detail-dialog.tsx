"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkoutDetailContent } from "@/components/workouts/workout-detail-content";
import type { Race, Workout, WorkoutInterval } from "@/lib/training/types";

export function WorkoutDetailDialog({
  workout,
  intervals,
  race,
  children,
  availableRaces = [],
}: {
  workout: Workout;
  intervals: WorkoutInterval[];
  race: Race | null;
  children: React.ReactNode;
  availableRaces?: Race[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-pointer text-left">
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <WorkoutDetailContent
            workout={workout}
            intervals={intervals}
            race={race}
            availableRaces={availableRaces}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
