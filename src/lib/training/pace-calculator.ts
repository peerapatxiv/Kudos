import { estimateVo2max } from "@/lib/training/vo2max";

/**
 * VDOT (VO2max proxy) from a race performance, via the Daniels-Gilbert formula.
 * Returns 0 for invalid input.
 */
export function calculateVdotFromRace(distanceKm: number, timeSeconds: number): number {
  return estimateVo2max(distanceKm, timeSeconds) ?? 0;
}

/** Oxygen cost (ml/kg/min) of running at a velocity in metres per minute. */
function oxygenCost(velocityMetersPerMinute: number): number {
  return -4.6 + 0.182258 * velocityMetersPerMinute + 0.000104 * velocityMetersPerMinute ** 2;
}

/** Inverse of oxygenCost: velocity (m/min) that costs the given VO2. */
function velocityForVo2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Fraction of VO2max sustainable for a race lasting the given minutes. */
function percentMaxForDuration(minutes: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
}

/** Predicted race time (seconds) at a distance for a given VDOT. */
export function predictRaceSeconds(vdot: number, distanceKm: number): number {
  const meters = distanceKm * 1000;
  // VDOT implied by a finish time falls as the time grows, so bisect on time.
  let lo = 60; // 1 minute
  let hi = 24 * 60 * 60; // 24 hours
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const minutes = mid / 60;
    const implied = oxygenCost(meters / minutes) / percentMaxForDuration(minutes);
    if (implied > vdot) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** Pace (seconds per km) when running at a fraction of VDOT. */
function paceAtPercentVdot(vdot: number, fraction: number): number {
  const metersPerMinute = velocityForVo2(vdot * fraction);
  return Math.round(60000 / metersPerMinute);
}

/** Estimate race performance capability */
export interface RaceEstimate {
  halfMarathonSeconds: number;
  marathonSeconds: number;
  tempoPaceSecondsPerKm: number;
  thresholdPaceSecondsPerKm: number;
  intervalPaceSecondsPerKm: number;
}

/**
 * Race predictions and training paces from VDOT (Daniels' Running Formula).
 * Threshold ≈ 88% VO2max, Interval ≈ 97.5% VO2max; Tempo sits midway between
 * half-marathon pace and threshold pace.
 */
export function estimatePacesFromVdot(vdot: number): RaceEstimate {
  const halfMarathonSeconds = predictRaceSeconds(vdot, 21.0975);
  const thresholdPaceSecondsPerKm = paceAtPercentVdot(vdot, 0.88);
  return {
    halfMarathonSeconds,
    marathonSeconds: predictRaceSeconds(vdot, 42.195),
    tempoPaceSecondsPerKm: Math.round((halfMarathonSeconds / 21.0975 + thresholdPaceSecondsPerKm) / 2),
    thresholdPaceSecondsPerKm,
    intervalPaceSecondsPerKm: paceAtPercentVdot(vdot, 0.975),
  };
}

/** Check if a recent race performance should trigger zone recalculation */
export function shouldRecalculateZones(lastRecalcDate: string | null, raceDate: string): boolean {
  if (!lastRecalcDate) return true;

  const daysSinceRecalc = Math.floor(
    (new Date(raceDate).getTime() - new Date(lastRecalcDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Recalculate if it's been more than 30 days since last recalc, or if new race is more recent
  return daysSinceRecalc > 30 || new Date(raceDate) > new Date(lastRecalcDate);
}
