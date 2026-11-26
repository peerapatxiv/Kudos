"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDuration,
  parseDurationToSeconds,
  secondsToPaceText,
} from "@/lib/training/pace";
import {
  STANDARD_RACE_DISTANCES,
  calculateVdotFromRace,
  estimatePacesFromVdot,
  predictStandardRaces,
} from "@/lib/training/pace-calculator";
import type { Workout } from "@/lib/training/types";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Pencil, RotateCcw, Zap } from "lucide-react";

interface AdaptiveZonesProps {
  /** Completed races with a distance and time, newest first. */
  recentRaces: Workout[];
  /** Show the Change (what-if editor) and Learn more buttons. */
  showControls?: boolean;
}

function formatKm(km: number): string {
  return `${Number(km.toFixed(2))} km`;
}

/** Format a `YYYY-MM-DD` date as e.g. "16 Nov 2026". */
function formatIsoDate(isoDate: string): string {
  return format(new Date(`${isoDate.slice(0, 10)}T00:00:00`), "d MMM yyyy");
}

function raceDate(race: Workout): string {
  return formatIsoDate(race.date);
}

export function AdaptiveZonesCard({
  recentRaces,
  showControls = true,
}: AdaptiveZonesProps) {
  const races = recentRaces.filter(
    (r) =>
      r.completed &&
      r.actual_distance_km != null &&
      r.actual_distance_km > 0 &&
      r.actual_time_seconds != null &&
      r.actual_time_seconds > 0,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  // What-if overrides for the selected race; null means "use the logged result".
  const [distanceInput, setDistanceInput] = useState<string | null>(null);
  const [timeInput, setTimeInput] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState<string | null>(null);

  if (races.length === 0) {
    return (
      <Card className="border-l-4 border-l-amber-500/40 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardContent className="flex flex-col items-center gap-2.5 py-6 px-4 text-center sm:py-7">
          <div className="rounded-lg bg-amber-500/10 p-2.5">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Complete a race to unlock adaptive zones
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Log a race result at any distance to get personalized pace zone
              suggestions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const race = races.find((r) => String(r.id) === selectedId) ?? races[0];
  const loggedDistanceKm = race.actual_distance_km!;
  const loggedTimeSeconds = race.actual_time_seconds!;

  const parsedDistance =
    distanceInput == null ? loggedDistanceKm : Number(distanceInput);
  const parsedTime =
    timeInput == null ? loggedTimeSeconds : parseDurationToSeconds(timeInput);
  const distanceValid =
    Number.isFinite(parsedDistance) &&
    parsedDistance >= 1 &&
    parsedDistance <= 100;
  const timeValid = parsedTime != null && parsedTime > 0;
  // Fall back to the logged result while an input is half-typed or invalid.
  const distanceKm =
    distanceValid && timeValid ? parsedDistance : loggedDistanceKm;
  const timeSeconds =
    distanceValid && timeValid ? parsedTime! : loggedTimeSeconds;
  const loggedDate = race.date.slice(0, 10);
  // A cleared or partial date input falls back to the race's own date.
  const shownDate = dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : loggedDate;
  const isOverridden =
    distanceKm !== loggedDistanceKm || timeSeconds !== loggedTimeSeconds || shownDate !== loggedDate;

  const resetOverrides = () => {
    setDistanceInput(null);
    setTimeInput(null);
    setDateInput(null);
  };
  const vdot = calculateVdotFromRace(distanceKm, timeSeconds);
  const paces = estimatePacesFromVdot(vdot);
  const predictions = predictStandardRaces(vdot);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Adaptive Training Zones
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-1.5">
              <span>
                Based on {formatKm(distanceKm)} in{" "}
                {formatDuration(timeSeconds)} (
                {secondsToPaceText(timeSeconds / distanceKm)}/km) · {formatIsoDate(shownDate)}
              </span>
              {showControls && (
                <button
                  type="button"
                  onClick={() => setEditing(!editing)}
                  aria-expanded={editing}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                    editing
                      ? "border-amber-500 bg-amber-500 text-black shadow-sm shadow-amber-500/30 hover:bg-amber-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:border-amber-500/60 hover:bg-amber-500/20",
                  )}
                >
                  {editing ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Pencil className="h-3 w-3" />
                  )}
                  {editing ? "Done" : "Change"}
                </button>
              )}
            </CardDescription>
          </div>
          <Badge className="ml-2 shrink-0">VDOT {vdot}</Badge>
        </div>
        {races.length > 1 && (
          <Select
            value={String(race.id)}
            onValueChange={(id) => {
              setSelectedId(id);
              resetOverrides();
            }}
          >
            <SelectTrigger
              className="mt-3 w-full"
              aria-label="Race to base zones on"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {races.map((r, i) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {raceDate(r)} · {r.title} · {formatKm(r.actual_distance_km!)}
                  {i === 0 ? " (latest)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showControls && editing && (
          <div className="mt-3 space-y-3 rounded-lg border border-border/40 bg-surface-2/40 p-3">
            <div
              role="group"
              aria-label="Distance presets"
              className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2/70 p-1"
            >
              {STANDARD_RACE_DISTANCES.map((d) => {
                const active = Math.abs(distanceKm - d.distanceKm) < 0.01;
                return (
                  <button
                    key={d.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDistanceInput(String(d.distanceKm))}
                    className={cn(
                      "h-8 rounded-md px-2 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                      active
                        ? "bg-amber-500 text-black shadow-sm shadow-amber-500/30"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {d.label === "Half Marathon" ? "Half" : d.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="adaptive-date">Date</Label>
                <Input
                  id="adaptive-date"
                  type="date"
                  value={dateInput ?? loggedDate}
                  onChange={(e) => setDateInput(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adaptive-distance">Distance (km)</Label>
                <Input
                  id="adaptive-distance"
                  inputMode="decimal"
                  value={
                    distanceInput ?? String(Number(loggedDistanceKm.toFixed(4)))
                  }
                  onChange={(e) => setDistanceInput(e.target.value)}
                  aria-invalid={!distanceValid}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adaptive-time">Time (h:mm:ss)</Label>
                <Input
                  id="adaptive-time"
                  inputMode="numeric"
                  value={timeInput ?? formatDuration(loggedTimeSeconds)}
                  onChange={(e) => setTimeInput(e.target.value)}
                  aria-invalid={!timeValid}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {distanceValid && timeValid
                  ? "Zones update as you type. Your logged race result is not changed."
                  : "Enter a distance of 1–100 km and a time like 1:38:30."}
              </p>
              {isOverridden && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetOverrides}
                  className="h-7 shrink-0 rounded-full px-3 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Race predictions
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {predictions.map((p) => (
              <div
                key={p.label}
                className="rounded-lg border border-border/30 bg-surface-2/50 p-3"
              >
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                  {formatDuration(p.seconds)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {secondsToPaceText(p.paceSecondsPerKm)}/km
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Training paces
          </p>
          <div className="grid gap-2.5 text-sm">
            <PaceRow
              label="Tempo Pace"
              pace={secondsToPaceText(paces.tempoPaceSecondsPerKm)}
            />
            <PaceRow
              label="Threshold Pace"
              pace={secondsToPaceText(paces.thresholdPaceSecondsPerKm)}
            />
            <PaceRow
              label="Interval Pace"
              pace={secondsToPaceText(paces.intervalPaceSecondsPerKm)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
          <p className="text-xs font-semibold text-amber-700">
            💡 How it works
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Zones follow your latest race at any distance. Pick another race
            above to compare, then update your Pace Zones to match.
          </p>
        </div>

        {showControls && (
          <Button
            variant="outline"
            className="w-full rounded-lg border-border/40 text-sm text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide details" : "Learn more about VDOT"}
            <ChevronDown
              className={cn(
                "ml-1.5 h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </Button>
        )}

        {showControls && expanded && (
          <div className="space-y-2 rounded-md bg-surface/50 p-3 text-xs text-muted-foreground">
            <p>
              <strong>VDOT</strong> (VO2max proxy) is calculated from your race
              performance using Jack Daniels&apos; Running Formula. It
              represents your aerobic capacity and can be used to predict race
              times and optimal training paces.
            </p>
            <p className="mt-2">
              Predictions assume equal training for each distance and a flat
              course, so a hilly or hot race will understate your fitness.
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
      <span className="font-semibold text-foreground tabular-nums">
        {pace}/km
      </span>
    </div>
  );
}
