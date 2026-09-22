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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              <span className="text-xs font-medium text-muted">{days} days to go</span>
            </div>
            <DialogTitle className="text-2xl">{race.name}</DialogTitle>
            <DialogDescription>{format(new Date(`${race.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <Card className="border-l-4" style={{ borderColor: `color-mix(in oklab, ${meta.colorVar} 30%, transparent)`, borderLeftColor: `${meta.colorVar}` }}>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5">
                <MetricItem label="Distance" value={`${race.distance_km} km`} />
                <MetricItem
                  label="Goal"
                  value={race.goal_time_seconds ? formatDuration(race.goal_time_seconds) : "—"}
                  highlight
                />
                <MetricItem
                  label="Goal pace"
                  value={race.goal_pace_seconds_per_km ? `${secondsToPaceText(race.goal_pace_seconds_per_km)}/km` : "—"}
                  highlight
                />
              </CardContent>
            </Card>

            {race.notes && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Race plan</p>
                  <p className="mt-1.5 text-sm text-foreground">{race.notes}</p>
                </CardContent>
              </Card>
            )}

            <PaceCalculator
              defaultDistanceKm={race.distance_km}
              defaultPaceText={race.goal_pace_seconds_per_km ? secondsToPaceText(race.goal_pace_seconds_per_km) : "4:30"}
              markers={[5, 10, 15, 20, race.distance_km]}
            />

            <div className="border-t border-border pt-4">
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
    <div className="flex flex-col items-center gap-1">
      <p className={cn("text-sm sm:text-base font-semibold tabular-nums", highlight ? "text-a-race" : "text-foreground")}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
