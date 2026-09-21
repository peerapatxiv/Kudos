"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HR_ZONES, calculateHrZoneRange } from "@/lib/training/hr-zones";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

const ZONE_COLOR: Record<string, string> = {
  recovery: "bg-recovery",
  easy: "bg-easy",
  tempo: "bg-tempo",
  vo2max: "bg-interval",
  maximum: "bg-a-race",
};

export function HrZoneCard({ maxHr, compact = false, className }: { maxHr: number | null; compact?: boolean; className?: string }) {
  if (!maxHr) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted">
          <AlertCircle className="h-4 w-4" />
          Add your Max HR in Body Metrics to view Heart Rate zones
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {HR_ZONES.map((zone) => {
          const range = calculateHrZoneRange(maxHr, zone);
          return (
            <div key={zone.id} className="flex items-center gap-3 text-sm">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ZONE_COLOR[zone.id])} />
              <span className="flex-1 text-foreground">{zone.label}</span>
              <span className="tabular-nums text-muted">
                {range.low}–{range.high} bpm
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Heart Rate Zones</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {HR_ZONES.map((zone) => {
          const range = calculateHrZoneRange(maxHr, zone);
          return (
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
                {range.low}–{range.high}
                <span className="text-muted font-normal"> bpm</span>
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
