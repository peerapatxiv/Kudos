import { format } from "date-fns";

/**
 * The plan runs on Asia/Bangkok time (UTC+7, no DST, so a fixed offset is
 * safe and avoids depending on IANA tzdata being available on the runtime).
 * Every plan date is anchored to local midnight in this offset, and all
 * day-count math below is done in raw epoch milliseconds so it can never be
 * skewed by the *host* machine/server's own timezone.
 */
export const PLAN_TIMEZONE = "Asia/Bangkok";
const PLAN_OFFSET = "+07:00";
const DAY_MS = 24 * 60 * 60 * 1000;

/** The `YYYY-MM-DD` calendar date in Asia/Bangkok for a given instant (defaults to now). */
export function todayIso(instant: Date = new Date()): string {
  const shifted = new Date(instant.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Epoch ms for local midnight, Asia/Bangkok, on the given `YYYY-MM-DD` date. */
function planMidnightMs(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00${PLAN_OFFSET}`).getTime();
}

/** Parse a `YYYY-MM-DD` plan date into an absolute Date at local midnight, Asia/Bangkok. */
export function parsePlanDate(isoDate: string): Date {
  return new Date(planMidnightMs(isoDate));
}

export function formatPlanDate(date: Date, pattern = "yyyy-MM-dd"): string {
  return format(date, pattern);
}

/** Whole calendar-day countdown from "today" (Asia/Bangkok) to a target `YYYY-MM-DD` date. */
export function daysUntil(targetIsoDate: string, from: Date = new Date()): number {
  return daysBetween(todayIso(from), targetIsoDate);
}

/** Whole calendar-day span between two `YYYY-MM-DD` plan dates (can be negative). */
export function daysBetween(startIsoDate: string, endIsoDate: string): number {
  return Math.round((planMidnightMs(endIsoDate) - planMidnightMs(startIsoDate)) / DAY_MS);
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Day-of-week for a `YYYY-MM-DD` calendar date, independent of any clock time or offset. */
export function dayOfWeekLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return DAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
