import { describe, expect, it } from "vitest";
import {
  buildSplits,
  finishTimeDistances,
  gelKms,
  toSecondsPerKm,
  KM_PER_MILE,
  formatDuration,
  paceFromDistanceAndTime,
  paceFromGoalTime,
  paceTextToSeconds,
  parseDurationToSeconds,
  secondsToPaceText,
  timeFromDistanceAndPace,
} from "@/lib/training/pace";

describe("pace text <-> seconds", () => {
  it("parses M:SS pace text", () => {
    expect(paceTextToSeconds("4:30")).toBe(270);
    expect(paceTextToSeconds("5:05")).toBe(305);
  });

  it("round-trips seconds -> pace text", () => {
    expect(secondsToPaceText(270)).toBe("4:30");
    expect(secondsToPaceText(305)).toBe("5:05");
  });

  it("rejects malformed pace text", () => {
    expect(paceTextToSeconds("not a pace")).toBeNull();
  });
});

describe("duration formatting", () => {
  it("formats under an hour as M:SS", () => {
    expect(formatDuration(325)).toBe("5:25");
  });

  it("formats an hour+ as H:MM:SS", () => {
    expect(formatDuration(5700)).toBe("1:35:00");
  });

  it("parses H:MM:SS and M:SS back to seconds", () => {
    expect(parseDurationToSeconds("1:35:00")).toBe(5700);
    expect(parseDurationToSeconds("48:20")).toBe(2900);
  });
});

describe("A-race goal pace: 21.1 km in 1:35:00 ≈ 4:30/km", () => {
  it("required pace from goal time is ~4:30/km", () => {
    const pace = paceFromGoalTime(21.1, 5700);
    expect(pace).not.toBeNull();
    expect(Math.round(pace!)).toBeGreaterThanOrEqual(268);
    expect(Math.round(pace!)).toBeLessThanOrEqual(272);
    expect(secondsToPaceText(pace!)).toBe("4:30");
  });

  it("21.1 km at a flat 4:30/km finishes in ~1:35:00", () => {
    const seconds = timeFromDistanceAndPace(21.1, 270);
    // 21.1 * 270 = 5697s = 1:34:57, within 1 minute of the stated 1:35:00 goal.
    expect(Math.abs(seconds - 5700)).toBeLessThan(60);
  });
});

describe("logged run: 10 km in 48:20 -> 4:50/km", () => {
  it("computes average pace from distance + elapsed time", () => {
    const pace = paceFromDistanceAndTime(10, 2900);
    expect(pace).toBe(290);
    expect(secondsToPaceText(pace!)).toBe("4:50");
  });
});

describe("pace calculator splits", () => {
  it("builds elapsed-time splits at each marker for 4:30/km", () => {
    const splits = buildSplits(270, [5, 10, 15, 20, 21.1]);
    expect(splits).toHaveLength(5);
    expect(splits[0].elapsedLabel).toBe("22:30");
    expect(splits[3].elapsedLabel).toBe("1:30:00");
    expect(splits[4].distanceKm).toBe(21.1);
  });
});

describe("finish-time table", () => {
  it("lists every km to 42 plus half and marathon", () => {
    const rows = finishTimeDistances();
    expect(rows).toHaveLength(44);
    expect(rows[0]).toEqual({ label: "1 km", distanceKm: 1, isRace: false });
    expect(rows.find((r) => r.distanceKm === 5)).toEqual({ label: "5k", distanceKm: 5, isRace: true });
    expect(rows[21]).toEqual({ label: "Half", distanceKm: 21.0975, isRace: true });
    expect(rows.at(-1)).toEqual({ label: "Marathon", distanceKm: 42.195, isRace: true });
  });


  it("matches the example table values", () => {
    expect(formatDuration(timeFromDistanceAndPace(10, 420))).toBe("1:10:00");
    expect(formatDuration(timeFromDistanceAndPace(9, 450))).toBe("1:07:30");
  });
});

describe("toSecondsPerKm", () => {
  it("leaves km paces alone", () => {
    expect(toSecondsPerKm(420, "km")).toBe(420);
  });

  it("converts mile paces to km", () => {
    // 8:00/mi over a mile takes 8:00
    expect(formatDuration(timeFromDistanceAndPace(KM_PER_MILE, toSecondsPerKm(480, "mi")))).toBe("8:00");
  });
});

describe("gelKms", () => {
  it("skips gels for races under an hour", () => {
    expect(gelKms(10, 300)).toEqual([]);
  });

  it("plans a half marathon every 30 min", () => {
    // 1:35 half at 4:30/km -> 30 and 60 min; 90 min is too close to the finish
    expect(gelKms(21.0975, 270)).toEqual([7, 13]);
  });

  it("plans a marathon every 25 min", () => {
    // ~3:31 at 5:00/km
    expect(gelKms(42.195, 300)).toEqual([5, 10, 15, 20, 25, 30, 35]);
  });

  it("returns nothing for invalid input", () => {
    expect(gelKms(0, 300)).toEqual([]);
    expect(gelKms(21.1, 0)).toEqual([]);
  });
});
