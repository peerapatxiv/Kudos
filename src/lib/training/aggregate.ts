import type { Workout } from "./types";

export interface WeeklyStats {
  plannedKm: number;
  completedKm: number;
  completionPct: number;
  workoutsPlanned: number;
  workoutsCompleted: number;
  workoutsSkipped: number;
  restDays: number;
  longRunKm: number | null;
  keyWorkout: Workout | null;
}

/** Aggregate a week's workouts into the summary shown on WeeklySummary / PhaseCard. */
export function summarizeWeek(workouts: Workout[]): WeeklyStats {
  const training = workouts.filter((w) => !w.is_rest_day);
  const plannedKm = round1(sum(training.map((w) => w.distance_km ?? 0)));
  const completedKm = round1(
    sum(training.map((w) => (w.completed ? w.actual_distance_km ?? w.distance_km ?? 0 : 0))),
  );
  const workoutsCompleted = training.filter((w) => w.completed).length;
  const workoutsSkipped = training.filter((w) => w.status === "skipped").length;
  const restDays = workouts.filter((w) => w.is_rest_day).length;
  const longRun = training
    .filter((w) => w.workout_type === "long_run")
    .sort((a, b) => (b.distance_km ?? 0) - (a.distance_km ?? 0))[0];
  const keyWorkout =
    training.find((w) => w.workout_type === "race") ??
    training.filter((w) => w.workout_type === "interval" || w.workout_type === "tempo").sort(
      (a, b) => (b.distance_km ?? 0) - (a.distance_km ?? 0),
    )[0] ??
    longRun ??
    null;

  return {
    plannedKm,
    completedKm,
    completionPct: plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0,
    workoutsPlanned: training.length,
    workoutsCompleted,
    workoutsSkipped,
    restDays,
    longRunKm: longRun?.distance_km ?? null,
    keyWorkout,
  };
}

export interface PhaseStats {
  totalPlannedKm: number;
  workoutCount: number;
  longRunKm: number | null;
}

export function summarizePhase(workouts: Workout[]): PhaseStats {
  const training = workouts.filter((w) => !w.is_rest_day);
  const longRun = training
    .filter((w) => w.workout_type === "long_run")
    .sort((a, b) => (b.distance_km ?? 0) - (a.distance_km ?? 0))[0];
  return {
    totalPlannedKm: round1(sum(training.map((w) => w.distance_km ?? 0))),
    workoutCount: training.length,
    longRunKm: longRun?.distance_km ?? null,
  };
}

export function completionBreakdown(workouts: Workout[]) {
  const training = workouts.filter((w) => !w.is_rest_day);
  return {
    completed: training.filter((w) => w.status === "completed").length,
    skipped: training.filter((w) => w.status === "skipped").length,
    modified: training.filter((w) => w.status === "modified").length,
    planned: training.filter((w) => w.status === "planned").length,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
