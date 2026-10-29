"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HR_ZONES } from "@/lib/training/hr-zones";
import type { ResolvedHrZone } from "@/lib/training/zones";
import { EditHrZonesButton } from "./edit-zones-dialog";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

const ZONE_COLOR: Record<string, string> = {
  recovery: "bg-recovery",
  easy: "bg-easy",
  tempo: "bg-tempo",
  vo2max: "bg-interval",
  maximum: "bg-a-race",
};

export function HrZoneCard({
  zones,
  editable = false,
  compact = false,
  className,
}: {
  zones: ResolvedHrZone[] | null;
  editable?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const editButton = editable ? (
    <EditHrZonesButton
      zones={HR_ZONES.map((zone) => {
        const current = zones?.find((z) => z.id === zone.id);
        return {
          id: zone.id,
          label: zone.label,
          colorClass: ZONE_COLOR[zone.id],
          low: current ? String(current.low) : "",
          high: current ? String(current.high) : "",
        };
      })}
    />
  ) : null;

  if (!zones) {
    return (
      <Card className={className}>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Heart Rate Zones</CardTitle>
          {editButton}
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Add your Max HR in Body Metrics, or tap the pencil to set your zones.
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {zones.map((range) => {
          const zone = range;
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
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Heart Rate Zones</CardTitle>
        {editButton}
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {zones.map((range) => {
          const zone = range;
          return (
            <div
              key={zone.id}
              className="space-y-1 rounded-lg border border-border/30 bg-gradient-to-br from-surface-2/50 to-surface-2/30 p-2 sm:p-3 hover:border-foreground/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", ZONE_COLOR[zone.id])} />
                <p className="text-xs font-semibold text-foreground">{zone.label}</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground">
                {range.low}–{range.high}
                <span className="text-xs font-normal text-muted"> bpm</span>
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
