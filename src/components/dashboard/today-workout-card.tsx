"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { WorkoutDetailContent } from "@/components/workouts/workout-detail-content";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import type { Workout, WorkoutWithIntervals, Race } from "@/lib/training/types";
import type { PhaseDefinition } from "@/lib/training/phases";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { fetchWorkoutDetails } from "@/lib/training/actions";

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

  if (!workout) {
    return (
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted">No workout scheduled for today. Enjoy the day off.</p>
        </CardContent>
      </Card>
    );
  }

  const meta = workoutTypeMeta(workout.workout_type);
  const isLeadIn = phase?.id === "lead_in";
  const isBridge = phase?.id === "recovery_bridge";

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1" style={{ backgroundColor: meta.colorVar }} />
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              {isLeadIn && <Badge variant="neutral">Lead-in · controlled</Badge>}
              {isBridge && <Badge variant="recovery">Recovery bridge</Badge>}
              {workout.is_race && <Badge variant="race">Race</Badge>}
            </div>
            {workout.completed && (
              <span className="flex items-center gap-1 text-xs font-medium text-completed">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {workout.is_rest_day ? "Rest day" : workout.title}
            </h2>
            {!workout.is_rest_day && (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted">
                {workout.distance_km ? (
                  <span>
                    <strong className="text-foreground">{workout.distance_km}</strong> km
                  </span>
                ) : null}
                {workout.target_pace_min_sec_per_km ? (
                  <span>
                    Target <strong className="text-foreground">{workout.target_pace_min_sec_per_km}</strong>
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {workout.notes && <p className="text-sm text-muted">{workout.notes}</p>}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:flex-1"
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
                size="lg"
                className="w-full sm:flex-1 sm:w-auto"
                onClick={() => setLoggerOpen(true)}
              >
                <PlayCircle className="h-4 w-4" />
                Start Workout
              </Button>
            )}
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
    </>
  );
}
