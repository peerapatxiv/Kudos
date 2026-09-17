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
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PACE_ZONES.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/60 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ZONE_COLOR[zone.id])} />
              <div>
                <p className="text-sm font-medium text-foreground">{zone.label}</p>
                <p className="text-[11px] text-muted">{zone.description}</p>
              </div>
            </div>
            <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">
              {zone.paceHigh ? `${zone.paceLow}–${zone.paceHigh}` : zone.paceLow}
              <span className="text-muted font-normal">/km</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
