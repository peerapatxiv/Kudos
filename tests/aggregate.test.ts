import { describe, expect, it } from "vitest";
import { summarizeWeek } from "@/lib/training/aggregate";
import type { Workout } from "@/lib/training/types";

function makeWorkout(overrides: Partial<Workout>): Workout {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: "user-1",
    training_week_id: "week-1",
    date: "2026-10-10",
    day_of_week: "Sat",
    title: "Easy run",
    workout_type: "easy",
    distance_km: 8,
    target_pace_min_sec_per_km: "5:30/km",
    pace_min_sec_per_km: 330,
    notes: null,
    is_rest_day: false,
    is_race: false,
    race_id: null,
    completed: false,
    status: "planned",
    completed_at: null,
    actual_distance_km: null,
    actual_time_seconds: null,
    actual_pace_seconds_per_km: null,
    perceived_effort: null,
    athlete_notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeWeek (Week 4 example from the spec)", () => {
  it("computes planned/completed km and completion % the way the WeeklySummary card expects", () => {
    const workouts: Workout[] = [
      makeWorkout({ id: "1", distance_km: 10, completed: true, status: "completed", actual_distance_km: 10 }),
      makeWorkout({ id: "2", distance_km: 9, completed: true, status: "completed", actual_distance_km: 8 }),
      makeWorkout({ id: "3", distance_km: 10, completed: true, status: "completed", actual_distance_km: 10 }),
      makeWorkout({ id: "4", distance_km: 6, completed: false, status: "skipped" }),
      makeWorkout({ id: "5", distance_km: 22, workout_type: "long_run", completed: true, status: "completed", actual_distance_km: 14 }),
      makeWorkout({ id: "6", is_rest_day: true, distance_km: null, title: "Rest", workout_type: "rest" }),
      makeWorkout({ id: "7", is_rest_day: true, distance_km: null, title: "Rest", workout_type: "rest" }),
    ];

    const summary = summarizeWeek(workouts);

    expect(summary.plannedKm).toBe(57);
    expect(summary.completedKm).toBe(42);
    expect(summary.completionPct).toBe(74);
    expect(summary.workoutsCompleted).toBe(4);
    expect(summary.workoutsSkipped).toBe(1);
    expect(summary.restDays).toBe(2);
    expect(summary.longRunKm).toBe(22);
  });
});
