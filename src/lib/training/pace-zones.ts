import type { PaceZone } from "./types";

export const PACE_ZONES: PaceZone[] = [
  {
    id: "easy",
    label: "Easy",
    paceLow: "5:15",
    paceHigh: "5:45",
    description: "Conversational aerobic running. The bulk of every week.",
  },
  {
    id: "marathon",
    label: "Marathon Pace",
    paceLow: "4:58",
    paceHigh: null,
    description: "Steady marathon-effort running used in select long runs.",
  },
  {
    id: "half",
    label: "Half Pace",
    paceLow: "4:30",
    paceHigh: null,
    description: "A-race goal pace — the effort the half marathon is run at.",
  },
  {
    id: "threshold",
    label: "Threshold",
    paceLow: "4:20",
    paceHigh: "4:30",
    description: "Comfortably-hard tempo effort that raises the lactate threshold.",
  },
  {
    id: "intervals",
    label: "Intervals",
    paceLow: "3:55",
    paceHigh: "4:05",
    description: "Short, sharp repeats with full jog recovery.",
  },
];

export function paceZoneForSecondsPerKm(secondsPerKm: number | null): PaceZone | null {
  if (secondsPerKm == null) return null;
  // Slower pace = larger seconds-per-km, so "low" here means the faster bound.
  const toSeconds = (text: string) => {
    const [m, s] = text.split(":").map(Number);
    return m * 60 + s;
  };
  for (const zone of PACE_ZONES) {
    const fast = toSeconds(zone.paceLow);
    const slow = zone.paceHigh ? toSeconds(zone.paceHigh) : fast;
    if (secondsPerKm >= Math.min(fast, slow) - 5 && secondsPerKm <= Math.max(fast, slow) + 5) {
      return zone;
    }
  }
  return null;
}
