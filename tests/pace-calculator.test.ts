import { describe, expect, it } from "vitest";
import { calculateVdotFromRace, estimatePacesFromVdot, predictRaceSeconds } from "@/lib/training/pace-calculator";

describe("calculateVdotFromRace", () => {
  it("gives ~VDOT 50 for a 20:00 5K", () => {
    const vdot = calculateVdotFromRace(5, 1200);
    expect(vdot).toBeGreaterThan(48);
    expect(vdot).toBeLessThan(51);
  });

  it("gives a lower VDOT for a slower time", () => {
    expect(calculateVdotFromRace(10, 3000)).toBeLessThan(calculateVdotFromRace(10, 2400));
  });
});

describe("predictRaceSeconds", () => {
  it("round-trips a race result", () => {
    const vdot = calculateVdotFromRace(10, 2700);
    expect(Math.abs(predictRaceSeconds(vdot, 10) - 2700)).toBeLessThan(10);
  });

  it("predicts ~3:10 marathon for VDOT 50 (Daniels table)", () => {
    const seconds = predictRaceSeconds(50, 42.195);
    expect(seconds).toBeGreaterThan(3 * 3600 + 7 * 60);
    expect(seconds).toBeLessThan(3 * 3600 + 12 * 60);
  });
});

describe("estimatePacesFromVdot", () => {
  it("orders paces marathon > half > tempo > threshold > interval (sec/km)", () => {
    const p = estimatePacesFromVdot(50);
    const mp = p.marathonSeconds / 42.195;
    const hmp = p.halfMarathonSeconds / 21.0975;
    expect(mp).toBeGreaterThan(hmp);
    expect(hmp).toBeGreaterThan(p.tempoPaceSecondsPerKm);
    expect(p.tempoPaceSecondsPerKm).toBeGreaterThan(p.thresholdPaceSecondsPerKm);
    expect(p.thresholdPaceSecondsPerKm).toBeGreaterThan(p.intervalPaceSecondsPerKm);
  });

  it("matches Daniels' VDOT 50 threshold (~4:15/km) and interval (~3:55/km)", () => {
    const p = estimatePacesFromVdot(50);
    expect(Math.abs(p.thresholdPaceSecondsPerKm - 255)).toBeLessThan(6);
    expect(Math.abs(p.intervalPaceSecondsPerKm - 235)).toBeLessThan(6);
  });
});
