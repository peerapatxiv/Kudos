import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/** Purely presentational — wrap in a click handler (e.g. RaceDetailDialog's trigger) to make it interactive. */
export function RaceCountdownCard({ race }: { race: Race }) {
  const days = daysUntil(race.date);
  const isA = race.priority === "a_race";
  const isSecondary = race.priority === "secondary";
  const label = isA
    ? "A-RACE"
    : race.priority === "tune_up"
      ? "TUNE-UP"
      : isSecondary
        ? "RACE of THE YEAR"
        : "RACE";
  const badgeVariant = isA ? "a-race" : race.priority === "tune_up" ? "tune-up" : isSecondary ? "secondary" : "neutral";
  const accentClass = isA ? "text-a-race" : isSecondary ? "text-secondary-race" : "text-foreground";
  const borderClass = isA ? "border-l-a-race" : isSecondary ? "border-l-secondary-race" : "border-l-muted";

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:border-foreground/20 border-l-4 bg-surface",
        borderClass,
      )}
    >
      <CardContent className="relative px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-3">
        {/* Header: Badge + Date */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={badgeVariant}>{label}</Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(`${race.date}T00:00:00`), "MMM d, yyyy")}
          </span>
        </div>

        {/* Race Name */}
        <p className="text-sm font-semibold text-foreground line-clamp-2">{race.name}</p>

        {/* Countdown - Hero Element */}
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl sm:text-5xl font-bold tabular-nums", accentClass)}>
            {days}
          </span>
          <span className="text-sm text-muted-foreground">day{days === 1 ? "" : "s"} to go</span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
          <div className="flex items-baseline gap-1">
            <span className="font-medium text-foreground">{race.distance_km}</span>
            <span>km</span>
          </div>
          {race.goal_time_seconds ? (
            <div className="flex items-baseline gap-1">
              <span>Goal</span>
              <span className="font-medium text-foreground">{formatGoal(race.goal_time_seconds)}</span>
            </div>
          ) : null}
          {race.goal_pace_seconds_per_km ? (
            <div className="flex items-baseline gap-1">
              <span>Pace</span>
              <span className="font-medium text-foreground">{secondsToPaceText(race.goal_pace_seconds_per_km)}/km</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function formatGoal(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}
