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

          <div className="space-y-5 pt-4">
            <Card style={{ borderColor: `color-mix(in oklab, ${meta.colorVar} 30%, transparent)` }}>
              <CardContent className="grid grid-cols-3 gap-3 pt-5 text-center">
                <Metric label="Distance" value={`${race.distance_km} km`} />
                <Metric
                  label="Goal"
                  value={race.goal_time_seconds ? formatDuration(race.goal_time_seconds) : "—"}
                  color={meta.colorVar}
                />
                <Metric
                  label="Goal pace"
                  value={race.goal_pace_seconds_per_km ? `${secondsToPaceText(race.goal_pace_seconds_per_km)}/km` : "—"}
                  color={meta.colorVar}
                />
              </CardContent>
            </Card>

            {race.notes && (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Race plan</p>
                  <p className="mt-2 text-sm text-foreground">{race.notes}</p>
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

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p
        className="text-lg font-bold tabular-nums text-foreground"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
