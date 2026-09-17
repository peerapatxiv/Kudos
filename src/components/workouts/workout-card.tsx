import Link from "next/link";
import { CheckCircle2, CircleDashed, XCircle, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Workout } from "@/lib/training/types";
import { cn } from "@/lib/utils";
import { workoutTypeMeta } from "./workout-meta";

const STATUS_ICON = {
  completed: CheckCircle2,
  skipped: XCircle,
  modified: PencilLine,
  planned: CircleDashed,
};

export function WorkoutCard({ workout, href, dense = false }: { workout: Workout; href?: string; dense?: boolean }) {
  const meta = workoutTypeMeta(workout.workout_type);
  const Icon = meta.icon;
  const StatusIcon = STATUS_ICON[workout.status];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-surface px-4 transition-colors",
        href && "hover:border-foreground/20 cursor-pointer",
        dense ? "py-2.5" : "py-3.5",
      )}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${meta.colorVar} 16%, transparent)`, color: meta.colorVar }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{workout.title}</p>
          {workout.is_race && <Badge variant="race">Race</Badge>}
        </div>
        <p className="truncate text-xs text-muted">
          {workout.is_rest_day
            ? "Rest"
            : [
                workout.distance_km ? `${workout.distance_km} km` : null,
                workout.target_pace_min_sec_per_km ? `@ ${workout.target_pace_min_sec_per_km}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || meta.label}
        </p>
      </div>

      <StatusIcon
        className={cn(
          "h-5 w-5 shrink-0",
          workout.status === "completed" && "text-completed",
          workout.status === "skipped" && "text-skipped",
          workout.status === "modified" && "text-tempo",
          workout.status === "planned" && "text-muted-foreground",
        )}
      />
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
