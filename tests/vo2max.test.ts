import { describe, expect, it } from "vitest";
import { estimateVo2max } from "@/lib/training/vo2max";

describe("estimateVo2max", () => {
  it("returns null for non-positive distance", () => {
    expect(estimateVo2max(0, 2400)).toBeNull();
    expect(estimateVo2max(-5, 2400)).toBeNull();
  });

  it("returns null for non-positive time", () => {
    expect(estimateVo2max(10, 0)).toBeNull();
    expect(estimateVo2max(10, -100)).toBeNull();
  });

  it("estimates a plausible VDOT for a 20-minute 5K", () => {
    // A well-known reference effort: 5km in 20:00 is commonly cited as ~VDOT 50.
    const result = estimateVo2max(5, 1200);
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(45);
    expect(result as number).toBeLessThan(55);
  });

  it("gives a higher VDOT for a faster time at the same distance", () => {
    const slower = estimateVo2max(10, 2700);
    const faster = estimateVo2max(10, 2400);
    expect(slower).not.toBeNull();
    expect(faster).not.toBeNull();
    expect(faster as number).toBeGreaterThan(slower as number);
  });

  it("gives a higher VDOT for holding the same pace over a longer distance", () => {
    // Same 4:00/km pace, 5K (20:00) vs 10K (40:00) — sustaining it twice as long
    // implies a higher underlying aerobic capacity.
    const fiveK = estimateVo2max(5, 1200);
    const tenK = estimateVo2max(10, 2400);
    expect(fiveK).not.toBeNull();
    expect(tenK).not.toBeNull();
    expect(tenK as number).toBeGreaterThan(fiveK as number);
  });

  it("rounds to one decimal place", () => {
    const result = estimateVo2max(10, 2400) as number;
    expect(Math.round(result * 10) / 10).toBe(result);
  });
});
