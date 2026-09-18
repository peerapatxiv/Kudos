"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RaceCountdownCard } from "@/components/dashboard/race-countdown";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { RecoveryBridge } from "@/components/races/recovery-bridge";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { daysUntil, daysBetween } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import type { Race, Workout } from "@/lib/training/types";

const SECONDARY_GUIDANCE = [
  "Start conservative",
  "Run by feel",
  "Slow down if legs are not recovered",
  "No 3:30 split chasing",
  "Recovery is the priority",
];

/** Clicking any race card opens this popup with its full detail — no separate race pages. */
export function RaceDetailDialog({ race, workouts, aRaceDate }: { race: Race; workouts: Workout[]; aRaceDate?: string }) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(race.date);
  const isA = race.priority === "a_race";
  const isSecondary = race.priority === "secondary";
  const badgeVariant = isA ? "a-race" : race.priority === "tune_up" ? "tune-up" : isSecondary ? "secondary" : "neutral";
  const label = isA ? "A-RACE" : race.priority === "tune_up" ? "TUNE-UP" : isSecondary ? "RACE of THE YEAR" : "RACE";
  const gap = isSecondary && aRaceDate ? daysBetween(aRaceDate, race.date) : null;

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

            {isSecondary && gap != null && (
              <Card className="border-secondary-race/30 bg-secondary-race/5">
                <CardContent className="space-y-2 pt-5">
                  <p className="text-sm text-foreground">
                    This race comes only <strong>{gap} days</strong> after the A-race. Treat it as a recovery-pace
                    effort rather than another fresh performance attempt.
                  </p>
                  <p className="text-xs text-muted">Guidance, not a strict target — run by feel from the gun.</p>
                </CardContent>
              </Card>
            )}

            {isSecondary && (
              <Card>
                <CardContent className="pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">On race day</p>
                  <ul className="space-y-2">
                    {SECONDARY_GUIDANCE.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-race" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {isSecondary && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Recovery Bridge</h3>
                <RecoveryBridge workouts={workouts} />
              </div>
            )}

            <PaceCalculator
              defaultDistanceKm={race.distance_km}
              defaultPaceText={race.goal_pace_seconds_per_km ? secondsToPaceText(race.goal_pace_seconds_per_km) : "4:30"}
              markers={[5, 10, 15, 20, race.distance_km]}
            />

            {isA && <PaceZoneCard />}

            <div className="flex justify-end">
              <EditRaceDialog race={race} />
            </div>
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
