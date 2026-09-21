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
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted">
          <Zap className="h-4 w-4" />
          Complete a race to see suggested pace zone adjustments
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
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between rounded-md bg-surface/50 p-2">
            <span className="text-muted">Half Marathon Pace</span>
            <span className="font-semibold">{secondsToPaceText(Math.round(suggestedPaces.halfMarathonSeconds / 21.0975))}/km</span>
          </div>
          <div className="flex justify-between rounded-md bg-surface/50 p-2">
            <span className="text-muted">Marathon Pace</span>
            <span className="font-semibold">{secondsToPaceText(Math.round(suggestedPaces.marathonSeconds / 42.195))}/km</span>
          </div>
          <div className="flex justify-between rounded-md bg-surface/50 p-2">
            <span className="text-muted">Tempo Pace</span>
            <span className="font-semibold">{secondsToPaceText(suggestedPaces.tempoPaceSecondsPerKm)}/km</span>
          </div>
          <div className="flex justify-between rounded-md bg-surface/50 p-2">
            <span className="text-muted">Threshold Pace</span>
            <span className="font-semibold">{secondsToPaceText(suggestedPaces.thresholdPaceSecondsPerKm)}/km</span>
          </div>
          <div className="flex justify-between rounded-md bg-surface/50 p-2">
            <span className="text-muted">Interval Pace</span>
            <span className="font-semibold">{secondsToPaceText(suggestedPaces.intervalPaceSecondsPerKm)}/km</span>
          </div>
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <p className="text-xs font-semibold text-amber-700">💡 How this works</p>
          <p className="mt-1 text-xs text-muted">
            Your {latestRace.title} performance suggests these target paces for different training zones. Update your training plan
            with these suggestions to stay aligned with your current fitness.
          </p>
        </div>

        <Button variant="ghost" className="w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide details" : "Learn more about VDOT"}
        </Button>

        {expanded && (
          <div className="space-y-2 rounded-md bg-surface/50 p-3 text-xs text-muted">
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
