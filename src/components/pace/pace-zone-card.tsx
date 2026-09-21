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
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PACE_ZONES.map((zone) => (
          <div
            key={zone.id}
            className="space-y-1.5 rounded-lg border border-border/50 bg-gradient-to-br from-surface-2/40 to-surface-2/20 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className={cn("h-3 w-3 rounded-full", ZONE_COLOR[zone.id])} />
              <p className="text-sm font-semibold text-foreground">{zone.label}</p>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {zone.paceHigh ? `${zone.paceLow}–${zone.paceHigh}` : zone.paceLow}
              <span className="text-xs font-normal text-muted">/km</span>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
