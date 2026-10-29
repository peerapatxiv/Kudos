/**
 * Training zones the athlete can edit. Saved on the profile as overrides keyed
 * by zone id; anything not saved falls back to the defaults in hr-zones.ts and
 * pace-zones.ts.
 */
import { HR_ZONES, calculateHrZoneRange } from "./hr-zones";
import { PACE_ZONES } from "./pace-zones";
import { paceTextToSeconds } from "./pace";
import type { PaceZone } from "./types";

export type HrZoneOverrides = Record<string, { low: number; high: number }>;
export type PaceZoneOverrides = Record<string, { low: string; high: string | null }>;

export interface ResolvedHrZone {
  id: string;
  label: string;
  low: number;
  high: number;
}

/** HR zones in bpm: saved values win, otherwise a % of max HR. Null when neither is available. */
export function resolveHrZones(
  maxHr: number | null,
  overrides: HrZoneOverrides | null,
): ResolvedHrZone[] | null {
  if (!overrides && !maxHr) return null;
  const zones: ResolvedHrZone[] = [];
  for (const zone of HR_ZONES) {
    const saved = overrides?.[zone.id];
    if (saved) {
      zones.push({ id: zone.id, label: zone.label, low: saved.low, high: saved.high });
    } else if (maxHr) {
      zones.push({ id: zone.id, label: zone.label, ...calculateHrZoneRange(maxHr, zone) });
    }
  }
  return zones.length > 0 ? zones : null;
}

export function resolvePaceZones(overrides: PaceZoneOverrides | null): PaceZone[] {
  return PACE_ZONES.map((zone) => {
    const saved = overrides?.[zone.id];
    return saved ? { ...zone, paceLow: saved.low, paceHigh: saved.high } : zone;
  });
}

/** Returns an error message, or null when every zone is valid. */
export function validateHrZones(zones: HrZoneOverrides): string | null {
  for (const zone of HR_ZONES) {
    const value = zones[zone.id];
    if (!value) continue;
    const { low, high } = value;
    if (!Number.isInteger(low) || !Number.isInteger(high) || low < 30 || high > 250) {
      return `${zone.label}: use whole numbers between 30 and 250 bpm.`;
    }
    if (low > high) return `${zone.label}: the low value must not be above the high value.`;
  }
  return null;
}

export function validatePaceZones(zones: PaceZoneOverrides): string | null {
  for (const zone of PACE_ZONES) {
    const value = zones[zone.id];
    if (!value) continue;
    if (paceTextToSeconds(value.low) == null) return `${zone.label}: enter pace as m:ss, e.g. 5:15.`;
    if (value.high != null && paceTextToSeconds(value.high) == null) {
      return `${zone.label}: enter pace as m:ss, e.g. 5:45.`;
    }
  }
  return null;
}

/** Keep only known zone ids, so stray keys never get saved. */
export function pickKnownZones<T>(zones: Record<string, T>, ids: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(zones).filter(([id]) => ids.includes(id)));
}
