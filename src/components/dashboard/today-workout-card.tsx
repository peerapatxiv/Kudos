"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import type { Workout } from "@/lib/training/types";
import type { PhaseDefinition } from "@/lib/training/phases";
import { CheckCircle2, PlayCircle } from "lucide-react";

export function TodayWorkoutCard({ workout, phase }: { workout: Workout | null; phase: PhaseDefinition | null }) {
  const [loggerOpen, setLoggerOpen] = useState(false);

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

          <div className="flex gap-2 pt-1">
            <Link href={`/calendar?date=${workout.date}`} className="flex-1">
              <Button variant="outline" className="w-full">
                View details
              </Button>
            </Link>
            {!workout.is_rest_day && !workout.completed && (
              <Button variant="primary" size="lg" className="flex-1" onClick={() => setLoggerOpen(true)}>
                <PlayCircle className="h-4 w-4" />
                Start Workout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!workout.is_rest_day && <WorkoutLogger workout={workout} open={loggerOpen} onOpenChange={setLoggerOpen} />}
    </>
  );
}
