import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStats } from "@/lib/training/aggregate";
import type { TrainingWeek } from "@/lib/training/types";
import { format } from "date-fns";

export function WeeklySummary({ week, stats }: { week: TrainingWeek; stats: WeeklyStats }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{week.week_number >= 0 ? `Week ${week.week_number}` : "Lead-in"}</CardTitle>
          <CardDescription>
            {format(new Date(`${week.start_date}T00:00:00`), "MMM d")} –{" "}
            {format(new Date(`${week.end_date}T00:00:00`), "MMM d")}
          </CardDescription>
        </div>
        <span className="text-lg font-bold tabular-nums text-foreground">{stats.completionPct}%</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={stats.completionPct} />

        <div className="space-y-3 text-sm">
          {/* Planned - Full Width */}
          <div className="col-span-full">
            <MetricBlock label="Planned" value={`${stats.plannedKm} km`} />
          </div>

          {/* Other metrics - 2 columns */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricBlock label="Workouts" value={String(stats.workoutsPlanned)} />
            <MetricBlock label="Long run" value={stats.longRunKm ? `${stats.longRunKm} km` : "—"} />
            <MetricBlock label="Completed" value={`${stats.completedKm} km`} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>
            {stats.workoutsCompleted}/{stats.workoutsPlanned} workouts completed
          </span>
          {stats.keyWorkout ? <span className="font-medium text-foreground">Key: {stats.keyWorkout.title}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
