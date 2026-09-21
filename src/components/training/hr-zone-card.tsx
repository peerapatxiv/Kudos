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
              className="space-y-2 rounded-lg border border-border/50 bg-gradient-to-br from-surface-2/40 to-surface-2/20 p-4"
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("h-3 w-3 rounded-full", ZONE_COLOR[zone.id])} />
                <p className="text-sm font-semibold text-foreground">{zone.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {range.low}–{range.high}
                <span className="text-sm font-normal text-muted"> bpm</span>
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
