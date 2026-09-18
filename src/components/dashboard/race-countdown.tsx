import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function RaceCountdownCard({ race, href }: { race: Race; href: string }) {
  const days = daysUntil(race.date);
  const isA = race.priority === "a_race";
  const label = isA ? "A-RACE" : race.priority === "tune_up" ? "TUNE-UP" : "RACE of THE YEAR";

  return (
    <Link href={href}>
      <Card
        className={cn(
          "relative overflow-hidden transition-transform hover:-translate-y-0.5",
          isA && "border-a-race/40",
        )}
      >
        <div
          className={cn("absolute inset-0 opacity-[0.06]", isA ? "bg-a-race" : "bg-secondary-race")}
          aria-hidden
        />
        <CardContent className="relative pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={isA ? "a-race" : race.priority === "tune_up" ? "tune-up" : "secondary"}>
              {label}
            </Badge>
            <span className="text-xs text-muted">{format(new Date(`${race.date}T00:00:00`), "MMM d, yyyy")}</span>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">{race.name}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn("text-3xl font-bold tabular-nums", isA ? "text-a-race" : "text-secondary-race")}>
                {days}
              </span>
              <span className="text-sm text-muted">day{days === 1 ? "" : "s"} to go</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span>
              <strong className="text-foreground">{race.distance_km}</strong> km
            </span>
            {race.goal_time_seconds ? (
              <span>
                Goal <strong className="text-foreground">{formatGoal(race.goal_time_seconds)}</strong>
              </span>
            ) : null}
            {race.goal_pace_seconds_per_km ? (
              <span>
                Pace <strong className="text-foreground">{secondsToPaceText(race.goal_pace_seconds_per_km)}/km</strong>
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
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
