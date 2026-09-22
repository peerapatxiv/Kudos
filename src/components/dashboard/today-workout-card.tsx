"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { WorkoutDetailContent } from "@/components/workouts/workout-detail-content";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import { QuickAddWorkoutDialog } from "@/components/calendar/quick-add-workout-dialog";
import type { Workout, WorkoutWithIntervals, Race } from "@/lib/training/types";
import type { PhaseDefinition } from "@/lib/training/phases";
import { CheckCircle2, PlayCircle, Plus } from "lucide-react";
import { fetchWorkoutDetails, createQuickWorkout } from "@/lib/training/actions";
import { todayIso } from "@/lib/training/dates";

export function TodayWorkoutCard({
  workout,
  phase,
  availableRaces = [],
}: {
  workout: Workout | null;
  phase: PhaseDefinition | null;
  availableRaces?: Race[];
}) {
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [detailRaces, setDetailRaces] = useState<Race[]>(availableRaces);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const today = todayIso();

  if (!workout) {
    return (
      <>
        <div className="rounded-lg border border-border/50 bg-gradient-to-br from-surface-2/40 to-surface-2/20 p-6 hover:border-foreground/20 hover:shadow-lg transition-all space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Rest day</h2>
            <p className="text-sm text-muted-foreground">Perfect time to recover and recharge.</p>
          </div>
          <Button
            variant="primary"
            className="w-full h-14 text-lg font-bold shadow-lg shadow-a-race/40 hover:shadow-xl hover:shadow-a-race/50 hover:opacity-95 transition-all duration-200 active:scale-95"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-6 w-6" />
            Add activity
          </Button>
        </div>

        <QuickAddWorkoutDialog
          date={today}
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onSubmit={async (data) => {
            const result = await createQuickWorkout(data);
            if (!result.ok) {
              alert("Failed to add workout: " + result.error);
            }
            setQuickAddOpen(false);
          }}
        />
      </>
    );
  }

  const meta = workoutTypeMeta(workout.workout_type);
  const isLeadIn = phase?.id === "lead_in";
  const isBridge = phase?.id === "recovery_bridge";

  return (
    <>
      <div className="rounded-lg border border-border/50 bg-gradient-to-br from-surface-2/40 to-surface-2/20 p-6 hover:border-foreground/20 hover:shadow-lg transition-all space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
            {isLeadIn && <Badge variant="neutral">Lead-in · controlled</Badge>}
            {isBridge && <Badge variant="recovery">Recovery bridge</Badge>}
            {workout.is_race && <Badge variant="race">Race</Badge>}
          </div>
          {workout.completed && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-completed whitespace-nowrap bg-completed/10 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </span>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            {workout.is_rest_day ? "Rest day" : workout.title}
          </h2>
          {!workout.is_rest_day && (
            <div className="flex flex-wrap items-center gap-6">
              {workout.distance_km && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Distance</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{workout.distance_km} km</p>
                </div>
              )}
              {workout.target_pace_min_sec_per_km && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target pace</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{workout.target_pace_min_sec_per_km}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {workout.notes && (
          <div className="rounded-lg bg-surface-2/60 border border-border/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">Notes</p>
            {workout.notes}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row pt-4">
          <Button
            variant="outline"
            className="flex-1 h-13 sm:h-10 text-base sm:text-sm font-medium border-border/60 hover:border-foreground/40 hover:bg-surface-2/50 shadow-sm transition-all duration-200"
            onClick={async () => {
              const result = await fetchWorkoutDetails(workout.date);
              if (result.status === "ok" && result.data) {
                setDetailsData(result.data);
                setDetailRaces(result.races || availableRaces);
                setDetailsOpen(true);
              }
            }}
          >
            View details
          </Button>
          {!workout.is_rest_day && !workout.completed && (
            <Button
              variant="primary"
              className="flex-1 h-14 sm:h-10 text-lg sm:text-base font-bold sm:font-semibold shadow-lg shadow-a-race/40 hover:shadow-xl hover:shadow-a-race/50 hover:opacity-95 transition-all duration-200 active:scale-95"
              onClick={() => setLoggerOpen(true)}
            >
              <PlayCircle className="h-6 w-6 sm:h-5 sm:w-5" />
              Start
            </Button>
          )}
          <Button
            variant="outline"
            className="h-13 sm:h-10 w-13 sm:w-auto px-3 border-border/60 hover:border-foreground/40 hover:bg-surface-2/50 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
            onClick={() => setQuickAddOpen(true)}
            title="Add another activity for today"
          >
            <Plus className="h-6 w-6 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {!workout.is_rest_day && <WorkoutLogger workout={workout} open={loggerOpen} onOpenChange={setLoggerOpen} />}

      {detailsData && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <WorkoutDetailContent
              workout={detailsData}
              intervals={detailsData.workout_intervals ?? []}
              race={detailsData.race ?? null}
              availableRaces={detailRaces}
            />
          </DialogContent>
        </Dialog>
      )}

      <QuickAddWorkoutDialog
        date={today}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSubmit={async (data) => {
          const result = await createQuickWorkout(data);
          if (!result.ok) {
            alert("Failed to add workout: " + result.error);
          }
          setQuickAddOpen(false);
        }}
      />
    </>
  );
}
