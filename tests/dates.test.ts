import { describe, expect, it } from "vitest";
import { daysBetween, daysUntil, dayOfWeekLabel, todayIso } from "@/lib/training/dates";

describe("Asia/Bangkok date handling", () => {
  it("Nov 28 -> Dec 6 is 8 days", () => {
    expect(daysBetween("2026-11-28", "2026-12-06")).toBe(8);
  });

  it("Sep 17, 2026 -> A-race (Nov 28) is 72 days", () => {
    expect(daysBetween("2026-09-17", "2026-11-28")).toBe(72);
  });

  it("Sep 17, 2026 -> secondary race (Dec 6) is 80 days", () => {
    expect(daysBetween("2026-09-17", "2026-12-06")).toBe(80);
  });

  it("daysUntil computes dynamically from a supplied 'now', not a hardcoded number", () => {
    // Instant is 2026-09-17 10:00 UTC = 17:00 Bangkok, still 2026-09-17 locally.
    const now = new Date("2026-09-17T10:00:00Z");
    expect(daysUntil("2026-11-28", now)).toBe(72);
  });

  it("does not shift a UTC-late-evening instant to the wrong Bangkok calendar day", () => {
    // 2026-09-17 23:00 UTC is already 2026-09-18 06:00 in Bangkok.
    const lateUtc = new Date("2026-09-17T23:00:00Z");
    expect(todayIso(lateUtc)).toBe("2026-09-18");

    // 2026-09-16 18:00 UTC is 2026-09-17 01:00 in Bangkok — still the 17th, not the 16th.
    const earlyBangkokMorning = new Date("2026-09-16T18:00:00Z");
    expect(todayIso(earlyBangkokMorning)).toBe("2026-09-17");
  });

  it("labels the day of week for a plan date", () => {
    // 2026-11-28 is a Saturday.
    expect(dayOfWeekLabel("2026-11-28")).toBe("Sat");
  });
});
