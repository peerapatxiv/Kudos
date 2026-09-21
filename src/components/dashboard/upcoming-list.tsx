import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import type { Workout } from "@/lib/training/types";
import { cn } from "@/lib/utils";

/**
 * A compact schedule for the dashboard's "Next up" section — distinct from
 * WorkoutCard (used on the Log page, where status icons carry real
 * information). Here every item is always upcoming/planned, so a status
 * marker would be decorative; the date instead gives each row its context,
 * and rest days recede rather than competing for attention with training days.
 */
export function UpcomingList({ workouts }: { workouts: Workout[] }) {
  return (
    <ul className="divide-y divide-border">
      {workouts.map((workout) => {
        const day = new Date(`${workout.date}T00:00:00`);
        const meta = !workout.is_rest_day ? workoutTypeMeta(workout.workout_type) : null;
        const Icon = meta?.icon;

        return (
          <li key={workout.id}>
            <Link
              href={`/calendar?date=${workout.date}`}
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-lg"
            >
              <div className="flex w-9 shrink-0 flex-col items-center leading-none">
                <span className="text-xs font-medium uppercase text-muted">{format(day, "EEE")}</span>
                <span className="mt-1 text-sm font-semibold tabular-nums text-foreground">{format(day, "d")}</span>
              </div>

              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={
                  meta
                    ? { backgroundColor: `color-mix(in oklab, ${meta.colorVar} 16%, transparent)`, color: meta.colorVar }
                    : undefined
                }
              >
                {Icon ? (
                  <Icon className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm",
                    workout.is_rest_day ? "text-muted" : "font-medium text-foreground",
                  )}
                >
                  {workout.is_rest_day ? "Rest" : workout.title}
                </p>
                {!workout.is_rest_day && (
                  <p className="truncate text-xs text-muted">
                    {[
                      workout.distance_km ? `${workout.distance_km} km` : null,
                      workout.target_pace_min_sec_per_km ? `@ ${workout.target_pace_min_sec_per_km}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || meta!.label}
                  </p>
                )}
              </div>

              {workout.is_race && <Badge variant="race">Race</Badge>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
