/** Calculate VDOT (VO2max proxy) from race performance using Daniels' Running Formula */
export function calculateVdotFromRace(distanceKm: number, timeSeconds: number): number {
  const distanceMiles = distanceKm / 1.60934;
  const timeMinutes = timeSeconds / 60;
  const pace = timeMinutes / distanceMiles; // minutes per mile

  // Daniels' VDOT calculation
  const T = pace;
  const R = 0.8;

  const vdot = (0.8353 * R + 86.16) * Math.exp(-0.1692 * R) + 0.4 * pace;

  return Math.round(vdot * 10) / 10;
}

/** Calculate equivalent race times for different distances using VDOT */
export function calculateEquivalentPace(vdot: number, distanceKm: number): number {
  // Returns seconds per km
  const distanceMiles = distanceKm / 1.60934;

  // Approximate formula to get pace from VDOT for a given distance
  const factor = Math.pow(distanceMiles / 10, 0.06);
  const basePace = 29.54 + 5.057 * (40 - vdot); // base pace in seconds per km
  const adjustedPace = basePace * factor;

  return Math.round(adjustedPace);
}

/** Estimate race performance capability */
export interface RaceEstimate {
  halfMarathonSeconds: number;
  marathonSeconds: number;
  tempoPaceSecondsPerKm: number;
  thresholdPaceSecondsPerKm: number;
  intervalPaceSecondsPerKm: number;
}

export function estimatePacesFromVdot(vdot: number): RaceEstimate {
  // Using VDOT-based formulas to estimate paces for different efforts
  // These are approximations based on training research

  const halfMarathonSecondsPerKm = 60 * (19.65 - 0.31 * (vdot - 40));
  const marathonSecondsPerKm = halfMarathonSecondsPerKm * 1.05; // Marathon ~5% slower

  const tempoPaceSecondsPerKm = halfMarathonSecondsPerKm * 0.95; // ~95% of half-marathon pace
  const thresholdPaceSecondsPerKm = halfMarathonSecondsPerKm * 0.9; // ~90% of half-marathon pace
  const intervalPaceSecondsPerKm = halfMarathonSecondsPerKm * 0.8; // ~80% of half-marathon pace

  return {
    halfMarathonSeconds: Math.round(halfMarathonSecondsPerKm * 21.0975), // 21.0975 km
    marathonSeconds: Math.round(marathonSecondsPerKm * 42.195),
    tempoPaceSecondsPerKm: Math.round(tempoPaceSecondsPerKm),
    thresholdPaceSecondsPerKm: Math.round(thresholdPaceSecondsPerKm),
    intervalPaceSecondsPerKm: Math.round(intervalPaceSecondsPerKm),
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
