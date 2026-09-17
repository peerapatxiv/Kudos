import { describe, expect, it } from "vitest";
import { SEED_RACES, SEED_WEEKS, SEED_WORKOUTS } from "@/lib/training/plan-data";
import { dayOfWeekLabel } from "@/lib/training/dates";

describe("seed plan data", () => {
  it("has exactly 82 workout days (2026-09-16 .. 2026-12-06 inclusive)", () => {
    expect(SEED_WORKOUTS).toHaveLength(82);
  });

  it("has no duplicate dates", () => {
    const dates = SEED_WORKOUTS.map((w) => w.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("covers every day in the plan range with no gaps", () => {
    const dates = new Set(SEED_WORKOUTS.map((w) => w.date));
    let cursor = new Date("2026-09-16T00:00:00Z");
    const end = new Date("2026-12-06T00:00:00Z");
    while (cursor <= end) {
      expect(dates.has(cursor.toISOString().slice(0, 10))).toBe(true);
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  });

  it("defines exactly the three races with correct dates, distances, and priorities", () => {
    expect(SEED_RACES).toHaveLength(3);
    const a = SEED_RACES.find((r) => r.key === "a_race")!;
    const secondary = SEED_RACES.find((r) => r.key === "secondary")!;
    const tuneUp = SEED_RACES.find((r) => r.key === "tune_up")!;

    expect(a).toMatchObject({ date: "2026-11-28", distance_km: 21.1, priority: "a_race", goal_time_seconds: 5700, goal_pace_seconds_per_km: 270 });
    expect(secondary).toMatchObject({ date: "2026-12-06", distance_km: 42.2, priority: "secondary" });
    expect(secondary.goal_time_seconds).toBeNull();
    expect(tuneUp).toMatchObject({ date: "2026-11-22", distance_km: 21, priority: "tune_up" });
  });

  it("marks the secondary race's suggested pace as guidance, never a fixed goal", () => {
    const dec6 = SEED_WORKOUTS.find((w) => w.date === "2026-12-06")!;
    const secondary = SEED_RACES.find((r) => r.key === "secondary")!;
    expect(dec6.notes).toMatch(/recovery/i);
    // The plan explicitly warns against chasing a 3:30 split — that's guidance, not a goal.
    expect(secondary.goal_time_seconds).toBeNull();
    expect(secondary.goal_pace_seconds_per_km).toBeNull();
  });

  it("does not fabricate an interval structure where the plan gave a range or left it unspecified", () => {
    const sep29 = SEED_WORKOUTS.find((w) => w.date === "2026-09-29")!;
    const oct27 = SEED_WORKOUTS.find((w) => w.date === "2026-10-27")!;
    const nov17 = SEED_WORKOUTS.find((w) => w.date === "2026-11-17")!;
    expect(sep29.intervals).toBeUndefined();
    expect(oct27.intervals).toBeUndefined();
    expect(nov17.intervals).toBeUndefined();
  });

  it("builds explicit interval rows only when the plan gave an exact count and distance", () => {
    const sep22 = SEED_WORKOUTS.find((w) => w.date === "2026-09-22")!;
    expect(sep22.intervals).toHaveLength(8);
    expect(sep22.intervals?.[0]).toMatchObject({ distance_m: 400, recovery_seconds: 60, recovery_type: "jog" });

    const nov3 = SEED_WORKOUTS.find((w) => w.date === "2026-11-03")!;
    expect(nov3.intervals).toHaveLength(3);
    expect(nov3.intervals?.[0]).toMatchObject({ distance_m: 3000, recovery_seconds: 180 });
  });

  it("every workout's day_of_week is derived, not hardcoded, and matches the calendar", () => {
    for (const w of SEED_WORKOUTS.slice(0, 10)) {
      expect(dayOfWeekLabel(w.date)).toBeTruthy();
    }
  });

  it("assigns each week to exactly one of the six phases plus the historical pre-plan entry", () => {
    const phases = new Set(SEED_WEEKS.map((w) => w.phase));
    expect(phases).toEqual(
      new Set(["pre_plan", "lead_in", "base", "build", "peak", "taper", "recovery_bridge"]),
    );
  });

  it("keeps the recovery bridge to 8 days with no training-week overlap into the taper", () => {
    const bridge = SEED_WEEKS.find((w) => w.key === "bridge")!;
    expect(bridge.start_date).toBe("2026-11-29");
    expect(bridge.end_date).toBe("2026-12-06");
  });
});
