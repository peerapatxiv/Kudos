"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RaceCountdownCard } from "@/components/dashboard/race-countdown";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";

/** Clicking any race card opens this popup with its full detail — no separate race pages. Every
 * race gets the same layout (stat tiles, notes, pace tools) regardless of its priority. */
export function RaceDetailDialog({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(race.date);
  const isA = race.priority === "a_race";
  const isSecondary = race.priority === "secondary";
  const badgeVariant = isA ? "a-race" : race.priority === "tune_up" ? "tune-up" : isSecondary ? "secondary" : "neutral";
  const label = isA ? "A-RACE" : race.priority === "tune_up" ? "TUNE-UP" : isSecondary ? "RACE of THE YEAR" : "RACE";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-pointer text-left">
        <RaceCountdownCard race={race} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant}>{label}</Badge>
              <span className="text-xs text-muted">{days} days to go</span>
              <div className="ml-auto">
                <EditRaceDialog race={race} />
              </div>
            </div>
            <DialogTitle>{race.name}</DialogTitle>
            <DialogDescription>{format(new Date(`${race.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <Card className={isA ? "border-a-race/30" : undefined}>
              <CardContent className="grid grid-cols-3 gap-3 pt-5 text-center">
                <Metric label="Distance" value={`${race.distance_km} km`} />
                <Metric label="Goal" value={race.goal_time_seconds ? formatDuration(race.goal_time_seconds) : "—"} accent={isA} />
                <Metric
                  label="Goal pace"
                  value={race.goal_pace_seconds_per_km ? `${secondsToPaceText(race.goal_pace_seconds_per_km)}/km` : "—"}
                  accent={isA}
                />
              </CardContent>
            </Card>

            {race.notes && (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Race plan</p>
                  <p className="mt-1 text-sm text-foreground">{race.notes}</p>
                </CardContent>
              </Card>
            )}

            <PaceCalculator
              defaultDistanceKm={race.distance_km}
              defaultPaceText={race.goal_pace_seconds_per_km ? secondsToPaceText(race.goal_pace_seconds_per_km) : "4:30"}
              markers={[5, 10, 15, 20, race.distance_km]}
            />

            <PaceZoneCard />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums sm:text-xl ${accent ? "text-a-race" : "text-foreground"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
