import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PACE_ZONES } from "@/lib/training/pace-zones";
import { cn } from "@/lib/utils";

const ZONE_COLOR: Record<string, string> = {
  easy: "bg-easy",
  marathon: "bg-long-run",
  half: "bg-a-race",
  threshold: "bg-tempo",
  intervals: "bg-interval",
};

export function PaceZoneCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {PACE_ZONES.map((zone) => (
          <div key={zone.id} className="flex items-center gap-3 text-sm">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ZONE_COLOR[zone.id])} />
            <span className="flex-1 text-foreground">{zone.label}</span>
            <span className="tabular-nums text-muted">
              {zone.paceHigh ? `${zone.paceLow}–${zone.paceHigh}` : zone.paceLow}/km
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pace Zones</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {PACE_ZONES.map((zone) => (
          <div
            key={zone.id}
            className="space-y-1 rounded-lg border border-border/30 bg-gradient-to-br from-surface-2/50 to-surface-2/30 p-2 sm:p-3 hover:border-foreground/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", ZONE_COLOR[zone.id])} />
              <p className="text-xs font-semibold text-foreground">{zone.label}</p>
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {zone.paceHigh ? `${zone.paceLow}–${zone.paceHigh}` : zone.paceLow}
              <span className="text-xs font-normal text-muted">/km</span>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
