"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RaceCountdownCard } from "@/components/dashboard/race-countdown";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { raceTypeMeta } from "@/components/races/race-meta";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";
import { cn } from "@/lib/utils";

export function RaceDetailDialog({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(race.date);
  const meta = raceTypeMeta(race.priority);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-pointer text-left">
        <RaceCountdownCard race={race} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant={meta.badgeVariant} className="text-xs">{meta.label}</Badge>
              <span className="text-xs font-medium text-muted">{days} days to go</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl mt-2">{race.name}</DialogTitle>
            <DialogDescription className="text-sm">{format(new Date(`${race.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 pt-3">
            <Card className="border-l-4 overflow-hidden" style={{ borderColor: `color-mix(in oklab, ${meta.colorVar} 30%, transparent)`, borderLeftColor: `${meta.colorVar}` }}>
              <CardContent className="space-y-0 p-4 sm:p-5">
                <div className="pb-3 sm:pb-4 border-b border-border/50">
                  <MetricItem label="Distance" value={`${race.distance_km} km`} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4">
                  <div className="border-r border-border/50 pr-3 sm:pr-4">
                    <MetricItem
                      label="Goal pace"
                      value={race.goal_pace_seconds_per_km ? `${secondsToPaceText(race.goal_pace_seconds_per_km)}/km` : "—"}
                      highlight
                    />
                  </div>
                  <div className="pl-3 sm:pl-4">
                    <MetricItem
                      label="Goal"
                      value={race.goal_time_seconds ? formatDuration(race.goal_time_seconds) : "—"}
                      highlight
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {race.notes && (
              <Card>
                <CardContent className="pt-3 sm:pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Race plan</p>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{race.notes}</p>
                </CardContent>
              </Card>
            )}

            <PaceCalculator
              defaultDistanceKm={race.distance_km}
              defaultPaceText={race.goal_pace_seconds_per_km ? secondsToPaceText(race.goal_pace_seconds_per_km) : "4:30"}
              markers={[5, 10, 15, 20, race.distance_km]}
            />

            <div className="border-t border-border pt-3 sm:pt-4">
              <EditRaceDialog race={race} buttonVariant="full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetricItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className={cn("text-base sm:text-lg font-semibold tabular-nums", highlight ? "text-a-race" : "text-foreground")}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
