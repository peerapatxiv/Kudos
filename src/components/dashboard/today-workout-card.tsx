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
        <Card className="border-dashed border-2">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">No workout scheduled</h2>
              <p className="mt-2 text-sm text-muted">Add an activity or enjoy the day off.</p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add activity for today
            </Button>
          </CardContent>
        </Card>

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
      <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: meta.colorVar }}>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              {isLeadIn && <Badge variant="neutral">Lead-in · controlled</Badge>}
              {isBridge && <Badge variant="recovery">Recovery bridge</Badge>}
              {workout.is_race && <Badge variant="race">Race</Badge>}
            </div>
            {workout.completed && (
              <span className="flex items-center gap-1 text-xs font-medium text-completed whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {workout.is_rest_day ? "Rest day" : workout.title}
            </h2>
            {!workout.is_rest_day && (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {workout.distance_km && (
                  <div>
                    <p className="text-lg font-semibold text-foreground">{workout.distance_km}</p>
                    <p className="text-xs uppercase text-muted">km</p>
                  </div>
                )}
                {workout.target_pace_min_sec_per_km && (
                  <div>
                    <p className="text-lg font-semibold text-foreground">{workout.target_pace_min_sec_per_km}</p>
                    <p className="text-xs uppercase text-muted">Pace</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {workout.notes && <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">{workout.notes}</p>}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
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
                className="flex-1"
                onClick={() => setLoggerOpen(true)}
              >
                <PlayCircle className="h-4 w-4" />
                Start
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuickAddOpen(true)}
              title="Add another activity for today"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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
