"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  KM_PER_MILE,
  finishTimeDistances,
  formatDuration,
  gelKms,
  secondsToPaceText,
  timeFromDistanceAndPace,
  toSecondsPerKm,
  type PaceUnit,
} from "@/lib/training/pace";

const ROWS = finishTimeDistances();
const RACE_ROWS = ROWS.filter((row) => row.isRace);
const UNITS: PaceUnit[] = ["km", "mi"];
// Realistic running paces, in seconds per unit.
const SLIDER_RANGE: Record<PaceUnit, { min: number; max: number }> = {
  km: { min: 180, max: 540 }, // 3:00–9:00 /km
  mi: { min: 300, max: 840 }, // 5:00–14:00 /mi
};

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 2);

export function FinishTimeTable({
  defaultMinutes = 5,
  defaultSeconds = 0,
  defaultUnit = "km",
}: {
  defaultMinutes?: number;
  defaultSeconds?: number;
  defaultUnit?: PaceUnit;
}) {
  // Text state so the fields can be briefly empty while typing.
  const [minutesText, setMinutesText] = useState(String(defaultMinutes));
  const [secondsText, setSecondsText] = useState(String(defaultSeconds).padStart(2, "0"));
  const [unit, setUnit] = useState<PaceUnit>(defaultUnit);
  const [raceLabel, setRaceLabel] = useState("Marathon");

  const minutes = Number(minutesText) || 0;
  const seconds = Math.min(Number(secondsText) || 0, 59);
  const paceSeconds = minutes * 60 + seconds;
  const hasPace = paceSeconds > 0;
  const secondsPerKm = toSecondsPerKm(paceSeconds, unit);
  const finishTime = (distanceKm: number) =>
    hasPace ? formatDuration(timeFromDistanceAndPace(distanceKm, secondsPerKm)) : "–";

  const race = RACE_ROWS.find((row) => row.label === raceLabel) ?? RACE_ROWS[RACE_ROWS.length - 1];
  const raceRows = ROWS.filter((row) => row.distanceKm <= race.distanceKm);
  const gelsFor = (distanceKm: number) => (hasPace ? gelKms(distanceKm, secondsPerKm) : []);
  const gels = gelsFor(race.distanceKm);

  const setPace = (totalSeconds: number) => {
    const rounded = Math.round(totalSeconds);
    setMinutesText(String(Math.floor(rounded / 60)));
    setSecondsText(String(rounded % 60).padStart(2, "0"));
  };

  const setFromSlider = (e: ChangeEvent<HTMLInputElement>) => setPace(Number(e.target.value));

  // Step by one second, clamped to the slider range.
  const step = (delta: number) => {
    const { min, max } = SLIDER_RANGE[unit];
    const base = hasPace ? paceSeconds : min;
    setPace(Math.min(Math.max(base + delta, min), max));
  };

  // Switching unit keeps the same speed: 5:00/km becomes 8:03/mi.
  const changeUnit = (next: PaceUnit) => {
    if (next === unit) return;
    if (hasPace) setPace(next === "mi" ? paceSeconds * KM_PER_MILE : paceSeconds / KM_PER_MILE);
    setUnit(next);
  };

  const range = SLIDER_RANGE[unit];
  const fieldClass =
    "h-12 bg-transparent p-0 text-4xl! font-semibold leading-none tracking-tight tabular-nums text-foreground caret-a-race outline-none placeholder:text-muted/50 sm:h-14 sm:text-5xl!";

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Expected Pace</CardTitle>
            <CardDescription>Type it, tap − / +, or drag the slider.</CardDescription>
          </div>
          <div
            role="radiogroup"
            aria-label="Pace unit"
            className="grid shrink-0 grid-cols-2 rounded-full border border-border bg-surface-2/50 p-0.5 text-xs"
          >
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                onClick={() => changeUnit(u)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium transition-colors",
                  unit === u ? "bg-a-race text-a-race-foreground shadow-sm" : "text-muted hover:text-foreground",
                )}
              >
                /{u}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <StepButton label="Faster by 1 second" onStep={() => step(-1)} disabled={hasPace && paceSeconds <= range.min}>
              <Minus className="h-5 w-5" />
            </StepButton>
            <div className="flex items-center">
            <input
              aria-label="Pace minutes"
              inputMode="numeric"
              className={cn(fieldClass, "text-right")}
              style={{ width: `${Math.max(minutesText.length, 1)}ch` }}
              value={minutesText}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setMinutesText(digitsOnly(e.target.value))}
            />
            <span aria-hidden className="mx-1 flex h-12 flex-col justify-center gap-2 sm:mx-1.5 sm:h-14 sm:gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/70 sm:h-2 sm:w-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/70 sm:h-2 sm:w-2" />
            </span>
            <input
              aria-label="Pace seconds"
              inputMode="numeric"
              className={cn(fieldClass, "w-[2ch] text-left")}
              value={secondsText}
              placeholder="00"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setSecondsText(digitsOnly(e.target.value))}
              onBlur={() => setSecondsText(String(seconds).padStart(2, "0"))}
            />
            <span className="ml-2 self-end pb-1.5 text-base font-medium text-muted sm:pb-2">/{unit}</span>
            </div>
            <StepButton label="Slower by 1 second" onStep={() => step(1)} disabled={paceSeconds >= range.max}>
              <Plus className="h-5 w-5" />
            </StepButton>
          </div>

          <div className="space-y-1.5">
            <input
              type="range"
              aria-label="Pace slider"
              min={range.min}
              max={range.max}
              step={1}
              value={Math.min(Math.max(paceSeconds, range.min), range.max)}
              onChange={setFromSlider}
              className="h-1.5 w-full cursor-pointer accent-a-race"
            />
            <div className="flex justify-between text-xs text-muted tabular-nums">
              <span>{secondsToPaceText(range.min)} faster</span>
              <span>slower {secondsToPaceText(range.max)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div role="radiogroup" aria-label="Race distance" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {RACE_ROWS.map((row) => {
          const selected = row.label === race.label;
          const gelCount = gelsFor(row.distanceKm).length;
          return (
            <button
              key={row.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setRaceLabel(row.label)}
              className={cn(
                "rounded-lg border bg-surface px-4 py-3 text-left transition-colors sm:px-5 sm:py-4",
                selected ? "border-a-race ring-2 ring-a-race/30" : "border-border hover:border-muted",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{row.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                {finishTime(row.distanceKm)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {gelCount === 0 ? "No gels needed" : `${gelCount} gel${gelCount > 1 ? "s" : ""} + 1 before start`}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated Finish Time · {race.label}</CardTitle>
          <CardDescription>
            At {hasPace ? secondsToPaceText(paceSeconds) : "–"}/{unit}.{" "}
            {gels.length > 0
              ? "Take 1 gel 15 min before the start, then at each Gel km below with a few sips of water."
              : "Under an hour — no gels needed during the race."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Distance
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {raceRows.map((row) => {
                const gelNumber = gels.indexOf(row.distanceKm) + 1;
                const hasGel = gelNumber > 0;
                return (
                  <tr
                    key={row.label}
                    className={cn(
                      "border-b border-border/50",
                      row.isRace && "bg-surface-2/70 font-semibold",
                      hasGel && "bg-a-race/10",
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        "border-l-2 px-3 py-2.5 text-left",
                        hasGel ? "border-a-race" : "border-transparent",
                        row.isRace || hasGel ? "font-semibold text-foreground" : "font-normal text-muted",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="min-w-14">{row.label}</span>
                        {hasGel && (
                          <span className="rounded-full bg-a-race px-2 py-0.5 text-xs font-semibold leading-none text-a-race-foreground">
                            Gel {gelNumber}
                          </span>
                        )}
                      </span>
                    </th>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right",
                        row.isRace || hasGel ? "font-semibold text-foreground" : "text-foreground/80",
                      )}
                    >
                      {finishTime(row.distanceKm)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Round −/+ button that steps once on tap and repeats, speeding up, while held. */
function StepButton({
  label,
  onStep,
  disabled,
  children,
}: {
  label: string;
  onStep: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Repeats read the newest onStep (it closes over the current pace), refreshed after each render.
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  const start = () => {
    stop();
    onStepRef.current();
    let delay = 400;
    const repeat = () => {
      onStepRef.current();
      delay = Math.max(40, delay * 0.8);
      timer.current = setTimeout(repeat, delay);
    };
    timer.current = setTimeout(repeat, delay);
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStepRef.current();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "flex h-11 w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-full border border-border bg-surface-2/50 text-foreground transition-all",
        "hover:border-a-race/60 hover:bg-a-race/10 hover:text-a-race active:scale-95 active:bg-a-race active:text-a-race-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/50",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
