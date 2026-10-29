import { describe, expect, it } from "vitest";
import {
  pickKnownZones,
  resolveHrZones,
  resolvePaceZones,
  validateHrZones,
  validatePaceZones,
} from "@/lib/training/zones";

describe("resolveHrZones", () => {
  it("returns null with no max HR and nothing saved", () => {
    expect(resolveHrZones(null, null)).toBeNull();
  });

  it("derives zones from max HR by default", () => {
    const zones = resolveHrZones(194, null)!;
    expect(zones[0]).toEqual({ id: "recovery", label: "Recovery", low: 97, high: 116 });
    expect(zones).toHaveLength(5);
  });

  it("uses saved values over max HR", () => {
    const zones = resolveHrZones(194, { easy: { low: 120, high: 140 } })!;
    expect(zones[1]).toEqual({ id: "easy", label: "Easy/Aerobic", low: 120, high: 140 });
    expect(zones[0].low).toBe(97);
  });

  it("shows saved zones even without max HR", () => {
    const zones = resolveHrZones(null, { easy: { low: 120, high: 140 } })!;
    expect(zones).toEqual([{ id: "easy", label: "Easy/Aerobic", low: 120, high: 140 }]);
  });
});

describe("resolvePaceZones", () => {
  it("returns defaults when nothing is saved", () => {
    expect(resolvePaceZones(null)[0]).toMatchObject({ id: "easy", paceLow: "5:15", paceHigh: "5:45" });
  });

  it("applies saved paces", () => {
    const zones = resolvePaceZones({ half: { low: "4:25", high: null } });
    expect(zones.find((z) => z.id === "half")).toMatchObject({ paceLow: "4:25", paceHigh: null });
  });
});

describe("validation", () => {
  it("rejects HR low above high", () => {
    expect(validateHrZones({ easy: { low: 150, high: 140 } })).toMatch(/Easy/);
  });

  it("rejects out-of-range HR", () => {
    expect(validateHrZones({ easy: { low: 10, high: 140 } })).toMatch(/30 and 250/);
  });

  it("accepts valid HR zones", () => {
    expect(validateHrZones({ easy: { low: 120, high: 140 } })).toBeNull();
  });

  it("rejects badly formatted paces", () => {
    expect(validatePaceZones({ easy: { low: "5.15", high: "5:45" } })).toMatch(/m:ss/);
    expect(validatePaceZones({ easy: { low: "5:15", high: "abc" } })).toMatch(/m:ss/);
  });

  it("accepts valid paces", () => {
    expect(validatePaceZones({ easy: { low: "5:15", high: "5:45" }, half: { low: "4:30", high: null } })).toBeNull();
  });

  it("drops unknown zone ids", () => {
    expect(pickKnownZones({ easy: 1, hack: 2 }, ["easy"])).toEqual({ easy: 1 });
  });
});
