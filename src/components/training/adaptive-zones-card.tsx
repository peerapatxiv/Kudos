"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { secondsToPaceText } from "@/lib/training/pace";
import { calculateVdotFromRace, estimatePacesFromVdot, type RaceEstimate } from "@/lib/training/pace-calculator";
import type { Workout } from "@/lib/training/types";
import { Zap } from "lucide-react";

interface AdaptiveZonesProps {
  recentRaces: Workout[];
}

export function AdaptiveZonesCard({ recentRaces }: AdaptiveZonesProps) {
  const [expanded, setExpanded] = useState(false);

  if (recentRaces.length === 0) {
    return (
      <Card className="border-l-4 border-l-amber-500/40 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardContent className="flex flex-col items-center gap-2.5 py-6 px-4 text-center sm:py-7">
          <div className="rounded-lg bg-amber-500/10 p-2.5">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Complete a race to unlock adaptive zones</p>
            <p className="text-xs text-muted-foreground max-w-sm">Log a race result to get personalized pace zone suggestions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestRace = recentRaces[0];
  if (!latestRace.completed || !latestRace.actual_distance_km || !latestRace.actual_time_seconds) {
    return null;
  }

  const vdot = calculateVdotFromRace(latestRace.actual_distance_km, latestRace.actual_time_seconds);
  const suggestedPaces = estimatePacesFromVdot(vdot);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Adaptive Training Zones
            </CardTitle>
            <CardDescription>Suggested adjustments based on {latestRace.title}</CardDescription>
          </div>
          <Badge className="ml-2">
            VDOT {vdot}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2.5 text-sm">
          <PaceRow label="Half Marathon Pace" pace={secondsToPaceText(Math.round(suggestedPaces.halfMarathonSeconds / 21.0975))} />
          <PaceRow label="Marathon Pace" pace={secondsToPaceText(Math.round(suggestedPaces.marathonSeconds / 42.195))} />
          <PaceRow label="Tempo Pace" pace={secondsToPaceText(suggestedPaces.tempoPaceSecondsPerKm)} />
          <PaceRow label="Threshold Pace" pace={secondsToPaceText(suggestedPaces.thresholdPaceSecondsPerKm)} />
          <PaceRow label="Interval Pace" pace={secondsToPaceText(suggestedPaces.intervalPaceSecondsPerKm)} />
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
          <p className="text-xs font-semibold text-amber-700">💡 How it works</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Based on your {latestRace.title} result, these are your optimal paces for each training zone. Update your Pace Zones to match.
          </p>
        </div>

        <Button variant="ghost" className="w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide details" : "Learn more about VDOT"}
        </Button>

        {expanded && (
          <div className="space-y-2 rounded-md bg-surface/50 p-3 text-xs text-muted-foreground">
            <p>
              <strong>VDOT</strong> (VO2max proxy) is calculated from your race performance using Jack Daniels' Running Formula. It represents
              your aerobic capacity and can be used to predict race times and optimal training paces.
            </p>
            <p className="mt-2">
              These suggested paces are based on research-backed relationships between VDOT and sustainable training efforts. Use them as a guide
              to adjust your Pace Zones.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaceRow({ label, pace }: { label: string; pace: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/30 bg-surface-2/50 p-3 hover:border-foreground/20 hover:shadow-sm transition-all">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">{pace}/km</span>
    </div>
  );
}
