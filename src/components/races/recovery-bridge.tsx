import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import type { Workout } from "@/lib/training/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecoveryBridge({ workouts }: { workouts: Workout[] }) {
  const bridge = workouts
    .filter((w) => w.date >= "2026-11-28" && w.date <= "2026-12-06")
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-warning">8-Day Recovery Bridge</p>
          <p className="text-xs text-muted">Do not add fitness here. Recover.</p>
        </div>
      </div>

      <div className="relative space-y-3 pl-5">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
        {bridge.map((w) => {
          const isRace = w.is_race;
          return (
            <div key={w.id} className="relative">
              <span
                className={cn(
                  "absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-surface",
                  isRace ? "bg-race" : w.is_rest_day ? "bg-rest" : "bg-recovery",
                )}
              />
              <Card className={isRace ? "border-race/40" : undefined}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-medium text-muted">{format(new Date(`${w.date}T00:00:00`), "EEE, MMM d")}</p>
                    <p className={cn("text-sm font-semibold", isRace ? "text-race" : "text-foreground")}>
                      {w.title.replace(/^RACE — /, "")}
                    </p>
                    {w.notes && <p className="mt-0.5 text-xs text-muted">{w.notes}</p>}
                  </div>
                  {w.distance_km != null && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {w.distance_km} km
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
