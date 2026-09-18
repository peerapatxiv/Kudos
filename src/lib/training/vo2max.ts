/**
 * Estimated VO2max (VDOT) from a single race performance, using the
 * Daniels-Gilbert formula (Daniels' Running Formula). Calibrated to genuine
 * race effort — pass in a completed race's actual distance and time, not an
 * easy training run.
 */
export function estimateVo2max(distanceKm: number, timeSeconds: number): number | null {
  if (distanceKm <= 0 || timeSeconds <= 0) return null;

  const velocityMetersPerMinute = (distanceKm * 1000) / (timeSeconds / 60);
  const vo2 =
    -4.6 + 0.182258 * velocityMetersPerMinute + 0.000104 * velocityMetersPerMinute ** 2;

  const minutes = timeSeconds / 60;
  const percentMax =
    0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);

  return Math.round((vo2 / percentMax) * 10) / 10;
}
