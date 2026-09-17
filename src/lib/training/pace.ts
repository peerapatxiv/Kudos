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
