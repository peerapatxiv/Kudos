/**
 * Pace / time math shared by the pace calculator, workout logger, and
 * progress charts. All paces are stored and computed in seconds-per-km.
 */

export function paceTextToSeconds(pace: string): number | null {
  const match = pace.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

export function secondsToPaceText(secondsPerKm: number): string {
  const rounded = Math.round(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseDurationToSeconds(input: string): number | null {
  const parts = input.trim().split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return null;
}

/** distance (km) + pace (sec/km) -> elapsed time (sec) */
export function timeFromDistanceAndPace(
  distanceKm: number,
  paceSecondsPerKm: number,
): number {
  return distanceKm * paceSecondsPerKm;
}

/** distance (km) + elapsed time (sec) -> pace (sec/km) */
export function paceFromDistanceAndTime(
  distanceKm: number,
  totalSeconds: number,
): number | null {
  if (distanceKm <= 0) return null;
  return totalSeconds / distanceKm;
}

/** goal time (sec) + distance (km) -> required pace (sec/km) */
export function paceFromGoalTime(
  distanceKm: number,
  goalTimeSeconds: number,
): number | null {
  if (distanceKm <= 0) return null;
  return goalTimeSeconds / distanceKm;
}

export interface PaceSplit {
  distanceKm: number;
  elapsedSeconds: number;
  elapsedLabel: string;
}

/** Build elapsed-time splits at each distance marker for a given pace. */
export function buildSplits(
  paceSecondsPerKm: number,
  markersKm: number[],
): PaceSplit[] {
  return markersKm.map((distanceKm) => {
    const elapsedSeconds = timeFromDistanceAndPace(distanceKm, paceSecondsPerKm);
    return {
      distanceKm,
      elapsedSeconds,
      elapsedLabel: formatDuration(elapsedSeconds),
    };
  });
}

export interface FinishTimeDistance {
  label: string;
  distanceKm: number;
  /** Race distances (5k, 10k, half, marathon) get emphasis in the table. */
  isRace: boolean;
}

const HALF_MARATHON_KM = 21.0975;
const MARATHON_KM = 42.195;

/** Rows for the finish-time table: every whole km up to 42, plus half and full marathon. */
export function finishTimeDistances(): FinishTimeDistance[] {
  const rows: FinishTimeDistance[] = [];
  for (let km = 1; km <= 42; km++) {
    const isRace = km === 5 || km === 10;
    rows.push({ label: isRace ? `${km}k` : `${km} km`, distanceKm: km, isRace });
    if (km === 21) rows.push({ label: "Half", distanceKm: HALF_MARATHON_KM, isRace: true });
  }
  rows.push({ label: "Marathon", distanceKm: MARATHON_KM, isRace: true });
  return rows;
}


export type PaceUnit = "km" | "mi";

export const KM_PER_MILE = 1.609344;

/** Convert a pace in the given unit (sec per km or sec per mile) to sec per km. */
export function toSecondsPerKm(paceSeconds: number, unit: PaceUnit): number {
  return unit === "mi" ? paceSeconds / KM_PER_MILE : paceSeconds;
}

const MINUTE = 60;

/**
 * Whole-km marks to take a gel during a race at a steady pace.
 * Under 1 hour: none. Up to 2 hours: every 30 min. Longer: every 25 min.
 * No gel in the last 15 minutes — it won't kick in before the finish.
 */
export function gelKms(raceKm: number, secondsPerKm: number): number[] {
  if (raceKm <= 0 || secondsPerKm <= 0) return [];
  const totalSeconds = raceKm * secondsPerKm;
  if (totalSeconds < 60 * MINUTE) return [];

  const interval = (totalSeconds <= 120 * MINUTE ? 30 : 25) * MINUTE;
  const lastGelAt = totalSeconds - 15 * MINUTE;
  const kms: number[] = [];
  for (let t = interval; t <= lastGelAt; t += interval) {
    const km = Math.max(1, Math.round(t / secondsPerKm));
    if (km < raceKm && !kms.includes(km)) kms.push(km);
  }
  return kms;
}
