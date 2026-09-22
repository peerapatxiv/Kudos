"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildSplits,
  paceFromGoalTime,
  paceTextToSeconds,
  parseDurationToSeconds,
  secondsToPaceText,
  timeFromDistanceAndPace,
  formatDuration,
} from "@/lib/training/pace";

const DEFAULT_MARKERS = [5, 10, 15, 20, 21.1];

export function PaceCalculator({
  defaultDistanceKm = 21.1,
  defaultPaceText = "4:30",
  markers = DEFAULT_MARKERS,
}: {
  defaultDistanceKm?: number;
  defaultPaceText?: string;
  markers?: number[];
}) {
  const [mode, setMode] = useState<"pace-to-time" | "goal-to-pace">("pace-to-time");
  const [distance, setDistance] = useState(String(defaultDistanceKm));
  const [pace, setPace] = useState(defaultPaceText);
  const [goalTime, setGoalTime] = useState("1:35:00");

  const distanceKm = Number(distance) || 0;
  const paceSeconds = paceTextToSeconds(pace);
  const goalSeconds = parseDurationToSeconds(goalTime);

  const derivedPace = useMemo(() => {
    if (mode === "pace-to-time") return paceSeconds;
    if (!goalSeconds || distanceKm <= 0) return null;
    return paceFromGoalTime(distanceKm, goalSeconds);
  }, [mode, paceSeconds, goalSeconds, distanceKm]);

  const totalTime =
    mode === "pace-to-time" && paceSeconds && distanceKm > 0
      ? timeFromDistanceAndPace(distanceKm, paceSeconds)
      : null;

  const splits = derivedPace ? buildSplits(derivedPace, markers.filter((m) => m <= distanceKm || mode === "goal-to-pace")) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pace Calculator</CardTitle>
        <CardDescription>Convert between pace, distance, and time — and see split targets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="pace-to-time">Pace → Time</TabsTrigger>
            <TabsTrigger value="goal-to-pace">Goal Time → Pace</TabsTrigger>
          </TabsList>

          <TabsContent value="pace-to-time" className="space-y-2.5 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pc-distance">Distance (km)</Label>
                <Input id="pc-distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-pace">Pace (min:sec /km)</Label>
                <Input id="pc-pace" value={pace} onChange={(e) => setPace(e.target.value)} placeholder="4:30" />
              </div>
            </div>
            {totalTime != null && (
              <p className="text-sm text-muted">
                Estimated time: <span className="font-semibold text-foreground">{formatDuration(totalTime)}</span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="goal-to-pace" className="space-y-2.5 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pc-distance-2">Distance (km)</Label>
                <Input id="pc-distance-2" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-goal">Goal time (h:mm:ss)</Label>
                <Input id="pc-goal" value={goalTime} onChange={(e) => setGoalTime(e.target.value)} placeholder="1:35:00" />
              </div>
            </div>
            {derivedPace != null && (
              <p className="text-sm text-muted">
                Required pace: <span className="font-semibold text-foreground">{secondsToPaceText(derivedPace)}/km</span>
              </p>
            )}
          </TabsContent>
        </Tabs>

        {splits.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Splits</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {splits.map((split) => (
                <div key={split.distanceKm} className="rounded-md bg-surface-2/60 px-2.5 py-1.5 text-center">
                  <p className="text-xs text-muted">{split.distanceKm} km</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{split.elapsedLabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
