import { describe, expect, it } from "vitest";
import {
  buildSplits,
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
