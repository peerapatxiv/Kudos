/**
 * Canonical source of the supplied training plan (2026-09-16 -> 2026-12-06).
 *
 * This is the single place the plan's dates, distances, and paces are typed
 * in. `scripts/seed.ts` inserts this into Supabase; the running app itself
 * always reads workouts back from Supabase, never from this file directly.
 * `tests/plan-data.test.ts` validates it against the source spec.
 *
 * Formatting fixes applied per spec (do not treat as data changes):
 * - "5:30/kmq" style typos are not present in this transcription; all paces
 *   below are the corrected `M:SS/km` form.
 *
 * Field notes:
 * - `paceText` preserves the plan's own wording exactly (including ranges
 *   and multi-part "reps / recovery" descriptions).
 * - `paceSeconds` is a single numeric seconds-per-km value derived from the
 *   primary (harder/working) pace in `paceText`, so charts and pace-zone
 *   matching have something numeric to key off. It is never used to
 *   overwrite `paceText`.
 * - Interval structures (`intervals`) are only populated when the plan
 *   states an explicit rep count *and* per-rep distance. Where the plan
 *   gives a range ("8-10x400m") or an unspecified structure ("short reps"),
 *   no interval rows are fabricated — the detail lives in `notes` only.
 */

import type { RacePriority, RecoveryType, TrainingPhaseId, WorkoutType } from "./types";

export const PLAN_START_DATE = "2026-09-17";

export interface SeedRace {
  key: "a_race" | "secondary" | "tune_up";
  name: string;
  race_type: string;
  date: string;
  distance_km: number;
  goal_time_seconds: number | null;
  goal_pace_seconds_per_km: number | null;
  priority: RacePriority;
  notes: string;
}

export const SEED_RACES: SeedRace[] = [
  {
    key: "a_race",
    name: "Amazing Thailand Marathon Half",
    race_type: "half_marathon",
    date: "2026-11-28",
    distance_km: 21.1,
    goal_time_seconds: 95 * 60,
    goal_pace_seconds_per_km: 270,
    priority: "a_race",
    notes:
      "Primary race of the block. All-out effort — this is the fitness test the whole plan is built around.",
  },
  {
    key: "secondary",
    name: "BYD Singapore Marathon",
    race_type: "marathon",
    date: "2026-12-06",
    distance_km: 42.2,
    goal_time_seconds: null,
    goal_pace_seconds_per_km: null,
    priority: "secondary",
    notes:
      "Only 8 days after the A-race. Deliberately not a fresh marathon attempt — no goal time is set. " +
      "Start around 4:50-5:00/km, run by feel, and be prepared to slow down. Do not chase 3:30 marathon splits. " +
      "The primary fitness test is the half marathon.",
  },
  {
    key: "tune_up",
    name: "Allianz Ayudhya World Run, Khao Yai",
    race_type: "half_marathon",
    date: "2026-11-22",
    distance_km: 21,
    goal_time_seconds: null,
    goal_pace_seconds_per_km: null,
    priority: "tune_up",
    notes: "Tune-up race during taper. Not the A-race — no specific pace target given in the plan.",
  },
];

export interface SeedWeek {
  key: string;
  week_number: number;
  phase: TrainingPhaseId;
  start_date: string;
  end_date: string;
  notes: string | null;
}

export const SEED_WEEKS: SeedWeek[] = [
  { key: "pre_plan", week_number: -1, phase: "pre_plan", start_date: "2026-09-16", end_date: "2026-09-16", notes: "Historical entry from the prior plan, preserved for context." },
  { key: "lead_in", week_number: 0, phase: "lead_in", start_date: "2026-09-17", end_date: "2026-09-21", notes: "Easing in before Base begins." },
  { key: "w1", week_number: 1, phase: "base", start_date: "2026-09-22", end_date: "2026-09-28", notes: null },
  { key: "w2", week_number: 2, phase: "base", start_date: "2026-09-29", end_date: "2026-10-05", notes: null },
  { key: "w3", week_number: 3, phase: "build", start_date: "2026-10-06", end_date: "2026-10-12", notes: null },
  { key: "w4", week_number: 4, phase: "build", start_date: "2026-10-13", end_date: "2026-10-19", notes: null },
  { key: "w5", week_number: 5, phase: "build", start_date: "2026-10-20", end_date: "2026-10-26", notes: null },
  { key: "w6", week_number: 6, phase: "build", start_date: "2026-10-27", end_date: "2026-11-02", notes: "Cutback week." },
  { key: "w7", week_number: 7, phase: "peak", start_date: "2026-11-03", end_date: "2026-11-09", notes: null },
  { key: "w8", week_number: 8, phase: "peak", start_date: "2026-11-10", end_date: "2026-11-16", notes: null },
  { key: "w9", week_number: 9, phase: "taper", start_date: "2026-11-17", end_date: "2026-11-23", notes: "Includes the Khao Yai tune-up race." },
  { key: "w10", week_number: 10, phase: "taper", start_date: "2026-11-24", end_date: "2026-11-28", notes: "Race week — Amazing Thailand Half Marathon." },
  { key: "bridge", week_number: 11, phase: "recovery_bridge", start_date: "2026-11-29", end_date: "2026-12-06", notes: "8-day recovery bridge. Do not add fitness here." },
];

export interface SeedInterval {
  interval_number: number;
  distance_m: number;
  target_pace_seconds_per_km: number | null;
  recovery_seconds: number | null;
  recovery_type: RecoveryType;
}

function reps(
  count: number,
  distanceM: number,
  paceSeconds: number | null,
  recoverySeconds: number | null,
  recoveryType: RecoveryType,
): SeedInterval[] {
  return Array.from({ length: count }, (_, i) => ({
    interval_number: i + 1,
    distance_m: distanceM,
    target_pace_seconds_per_km: paceSeconds,
    recovery_seconds: recoverySeconds,
    recovery_type: recoveryType,
  }));
}

function strides(count: number): SeedInterval[] {
  return reps(count, 100, null, null, "walk");
}

export interface SeedWorkout {
  date: string;
  weekKey: string;
  title: string;
  workout_type: WorkoutType;
  distance_km: number | null;
  paceText: string | null;
  paceSeconds: number | null;
  notes: string | null;
  is_rest_day: boolean;
  is_race: boolean;
  raceKey?: SeedRace["key"];
  intervals?: SeedInterval[];
}

const EASY_PACE_TEXT = "5:30/km";
const EASY_PACE_SECONDS = 330;

function easyRun(date: string, weekKey: string, distanceKm: number, notes: string | null = null): SeedWorkout {
  return {
    date,
    weekKey,
    title: "Easy run",
    workout_type: "easy",
    distance_km: distanceKm,
    paceText: EASY_PACE_TEXT,
    paceSeconds: EASY_PACE_SECONDS,
    notes,
    is_rest_day: false,
    is_race: false,
  };
}

function restDay(date: string, weekKey: string, notes: string | null = null): SeedWorkout {
  return {
    date,
    weekKey,
    title: "Rest",
    workout_type: "rest",
    distance_km: null,
    paceText: null,
    paceSeconds: null,
    notes,
    is_rest_day: true,
    is_race: false,
  };
}

function tempo(date: string, weekKey: string, distanceKm: number, paceSeconds: number, paceText: string, notes: string | null = null): SeedWorkout {
  return {
    date,
    weekKey,
    title: "Tempo",
    workout_type: "tempo",
    distance_km: distanceKm,
    paceText,
    paceSeconds,
    notes,
    is_rest_day: false,
    is_race: false,
  };
}

function longRun(date: string, weekKey: string, distanceKm: number, paceSeconds: number, paceText: string, title = "Long run", notes: string | null = null, intervals?: SeedInterval[]): SeedWorkout {
  return {
    date,
    weekKey,
    title,
    workout_type: "long_run",
    distance_km: distanceKm,
    paceText,
    paceSeconds,
    notes,
    is_rest_day: false,
    is_race: false,
    intervals,
  };
}

export const SEED_WORKOUTS: SeedWorkout[] = [
  // --- Historical (preserved for context; before the app's plan start) ---
  {
    date: "2026-09-16",
    weekKey: "pre_plan",
    title: "MP Pace",
    workout_type: "tempo",
    distance_km: 11,
    paceText: "4:39/km",
    paceSeconds: 279,
    notes: "Historical entry from the prior plan, preceding the 2026-09-17 app start date.",
    is_rest_day: false,
    is_race: false,
  },

  // --- Lead-in: Sep 17-21 ---
  {
    date: "2026-09-17",
    weekKey: "lead_in",
    title: "MP Pace",
    workout_type: "tempo",
    distance_km: 10,
    paceText: "4:49/km",
    paceSeconds: 289,
    notes: "Lead-in — controlled, easing-in effort. Not yet race preparation.",
    is_rest_day: false,
    is_race: false,
  },
  easyRun("2026-09-18", "lead_in", 8, "Lead-in — controlled, easing-in effort."),
  restDay("2026-09-19", "lead_in"),
  longRun(
    "2026-09-20",
    "lead_in",
    12,
    315,
    "5:15-5:45/km",
    "Moderate long run (baseline feel)",
    "Lead-in — baseline long run to gauge current fitness, not a hard effort.",
  ),
  restDay("2026-09-21", "lead_in"),

  // --- Base: Weeks 1-2, Sep 22 - Oct 5 ---
  {
    date: "2026-09-22",
    weekKey: "w1",
    title: "Speed: 8x400m",
    workout_type: "interval",
    distance_km: 7,
    paceText: "Reps 4:00/km · Recovery 5:30/km jog (60s)",
    paceSeconds: 240,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(8, 400, 240, 60, "jog"),
  },
  easyRun("2026-09-23", "w1", 6),
  tempo("2026-09-24", "w1", 7, 265, "4:25/km"),
  easyRun("2026-09-25", "w1", 5),
  longRun("2026-09-26", "w1", 16, 315, "5:15/km"),
  restDay("2026-09-27", "w1"),
  restDay("2026-09-28", "w1"),

  {
    date: "2026-09-29",
    weekKey: "w2",
    title: "Speed: 8-10x400m",
    workout_type: "interval",
    distance_km: 8,
    paceText: "Reps 4:00/km · Recovery 5:30/km",
    paceSeconds: 240,
    notes: "8-10 x 400m as given in the plan (range, not a fixed count) — no fixed rep structure recorded.",
    is_rest_day: false,
    is_race: false,
  },
  easyRun("2026-09-30", "w2", 7),
  tempo("2026-10-01", "w2", 8, 265, "4:25/km"),
  easyRun("2026-10-02", "w2", 6),
  longRun("2026-10-03", "w2", 18, 315, "5:15/km"),
  restDay("2026-10-04", "w2"),
  restDay("2026-10-05", "w2"),

  // --- Build: Weeks 3-6, Oct 6 - Nov 2 ---
  {
    date: "2026-10-06",
    weekKey: "w3",
    title: "Half-pace reps: 5x1km",
    workout_type: "interval",
    distance_km: 9,
    paceText: "Reps 4:16/km · Recovery 5:30/km jog (2min)",
    paceSeconds: 256,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(5, 1000, 256, 120, "jog"),
  },
  easyRun("2026-10-07", "w3", 7),
  tempo("2026-10-08", "w3", 9, 265, "4:25/km"),
  easyRun("2026-10-09", "w3", 6),
  longRun("2026-10-10", "w3", 20, 315, "5:15/km"),
  restDay("2026-10-11", "w3"),
  restDay("2026-10-12", "w3"),

  {
    date: "2026-10-13",
    weekKey: "w4",
    title: "Half-pace reps: 5x1km",
    workout_type: "interval",
    distance_km: 10,
    paceText: "Reps 4:16/km · Recovery 5:30/km",
    paceSeconds: 256,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(5, 1000, 256, null, "easy_pace"),
  },
  easyRun("2026-10-14", "w4", 8),
  tempo("2026-10-15", "w4", 10, 265, "4:25/km"),
  easyRun("2026-10-16", "w4", 6),
  longRun("2026-10-17", "w4", 22, 315, "5:15/km"),
  restDay("2026-10-18", "w4"),
  restDay("2026-10-19", "w4"),

  {
    date: "2026-10-20",
    weekKey: "w5",
    title: "Half-pace reps: 6x1km",
    workout_type: "interval",
    distance_km: 10,
    paceText: "Reps 4:16/km · Recovery 5:30/km",
    paceSeconds: 256,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(6, 1000, 256, null, "easy_pace"),
  },
  easyRun("2026-10-21", "w5", 8),
  tempo("2026-10-22", "w5", 11, 265, "4:25/km"),
  easyRun("2026-10-23", "w5", 7),
  longRun(
    "2026-10-24",
    "w5",
    24,
    315,
    "5:15/km, last 6km @ 4:58/km",
    "Long run — last 6km @ MP",
    "Final 6 km at marathon pace.",
    [
      { interval_number: 1, distance_m: 18000, target_pace_seconds_per_km: 315, recovery_seconds: null, recovery_type: null },
      { interval_number: 2, distance_m: 6000, target_pace_seconds_per_km: 298, recovery_seconds: null, recovery_type: null },
    ],
  ),
  restDay("2026-10-25", "w5"),
  restDay("2026-10-26", "w5"),

  {
    date: "2026-10-27",
    weekKey: "w6",
    title: "Speed — cutback week",
    workout_type: "interval",
    distance_km: 7,
    paceText: "Reps 4:00/km · Recovery 5:30/km",
    paceSeconds: 240,
    notes: "Cutback week — reduced volume. Exact rep structure not specified in the plan.",
    is_rest_day: false,
    is_race: false,
  },
  easyRun("2026-10-28", "w6", 6),
  tempo("2026-10-29", "w6", 7, 265, "4:25/km"),
  easyRun("2026-10-30", "w6", 5),
  longRun("2026-10-31", "w6", 18, 320, "5:20/km", "Long run — easy"),
  restDay("2026-11-01", "w6"),
  restDay("2026-11-02", "w6"),

  // --- Peak: Weeks 7-8, Nov 3 - Nov 16 ---
  {
    date: "2026-11-03",
    weekKey: "w7",
    title: "Half-pace reps: 3x3km",
    workout_type: "interval",
    distance_km: 11,
    paceText: "Reps 4:16/km · Recovery 5:30/km jog (3min)",
    paceSeconds: 256,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(3, 3000, 256, 180, "jog"),
  },
  easyRun("2026-11-04", "w7", 8),
  tempo("2026-11-05", "w7", 11, 260, "4:20/km", "Half-pace tempo"),
  easyRun("2026-11-06", "w7", 7),
  longRun(
    "2026-11-07",
    "w7",
    27,
    315,
    "5:15/km, last 6km @ half pace (4:16/km)",
    "Long run — last 6km @ half pace",
    "Final 6 km at half-marathon pace.",
    [
      { interval_number: 1, distance_m: 21000, target_pace_seconds_per_km: 315, recovery_seconds: null, recovery_type: null },
      { interval_number: 2, distance_m: 6000, target_pace_seconds_per_km: 256, recovery_seconds: null, recovery_type: null },
    ],
  ),
  restDay("2026-11-08", "w7"),
  restDay("2026-11-09", "w7"),

  {
    date: "2026-11-10",
    weekKey: "w8",
    title: "Half-pace reps: 5x1km",
    workout_type: "interval",
    distance_km: 10,
    paceText: "Reps 4:16/km · Recovery 5:30/km",
    paceSeconds: 256,
    notes: null,
    is_rest_day: false,
    is_race: false,
    intervals: reps(5, 1000, 256, null, "easy_pace"),
  },
  easyRun("2026-11-11", "w8", 8),
  tempo("2026-11-12", "w8", 11, 265, "4:25/km"),
  easyRun("2026-11-13", "w8", 7),
  longRun("2026-11-14", "w8", 24, 315, "5:15/km", "Long run — easy"),
  restDay("2026-11-15", "w8"),
  restDay("2026-11-16", "w8"),

  // --- Taper: Weeks 9-10, Nov 17 - Nov 28 ---
  {
    date: "2026-11-17",
    weekKey: "w9",
    title: "Short reps @ half pace",
    workout_type: "interval",
    distance_km: 8,
    paceText: "Reps 4:16/km · Recovery 5:30/km",
    paceSeconds: 256,
    notes: "Exact rep structure not specified in the plan.",
    is_rest_day: false,
    is_race: false,
  },
  easyRun("2026-11-18", "w9", 7),
  {
    date: "2026-11-19",
    weekKey: "w9",
    title: "Easy + strides",
    workout_type: "easy",
    distance_km: 8,
    paceText: "5:30/km",
    paceSeconds: 330,
    notes: "4 x 100m strides after the easy running.",
    is_rest_day: false,
    is_race: false,
    intervals: strides(4),
  },
  easyRun("2026-11-20", "w9", 5),
  restDay("2026-11-21", "w9"),
  {
    date: "2026-11-22",
    weekKey: "w9",
    title: "RACE — Allianz Ayudhya World Run, Khao Yai",
    workout_type: "race",
    distance_km: 21,
    paceText: null,
    paceSeconds: null,
    notes: "Tune-up race. Not the A-race — treat as a fitness check ahead of Nov 28.",
    is_rest_day: false,
    is_race: true,
    raceKey: "tune_up",
  },
  restDay("2026-11-23", "w9"),

  {
    date: "2026-11-24",
    weekKey: "w10",
    title: "Easy + strides",
    workout_type: "easy",
    distance_km: 6,
    paceText: "5:30/km",
    paceSeconds: 330,
    notes: "4 x 100m strides after the easy running.",
    is_rest_day: false,
    is_race: false,
    intervals: strides(4),
  },
  easyRun("2026-11-25", "w10", 5),
  {
    date: "2026-11-26",
    weekKey: "w10",
    title: "Easy + strides",
    workout_type: "easy",
    distance_km: 4,
    paceText: "5:30/km",
    paceSeconds: 330,
    notes: "3 x 100m strides after the easy running.",
    is_rest_day: false,
    is_race: false,
    intervals: strides(3),
  },
  restDay("2026-11-27", "w10"),
  {
    date: "2026-11-28",
    weekKey: "w10",
    title: "RACE — Amazing Thailand Half Marathon",
    workout_type: "race",
    distance_km: 21.1,
    paceText: "4:30/km",
    paceSeconds: 270,
    notes: "A-RACE. Goal 1:35:00. All-out effort — the primary fitness test of the block.",
    is_rest_day: false,
    is_race: true,
    raceKey: "a_race",
  },

  // --- Recovery Bridge: Nov 29 - Dec 6 ---
  restDay("2026-11-29", "bridge", "Full rest."),
  {
    date: "2026-11-30",
    weekKey: "bridge",
    title: "Rest or walk",
    workout_type: "recovery",
    distance_km: null,
    paceText: null,
    paceSeconds: null,
    notes: "0-2 km walking, very easy. Optional.",
    is_rest_day: true,
    is_race: false,
  },
  {
    date: "2026-12-01",
    weekKey: "bridge",
    title: "Rest or very easy jog",
    workout_type: "recovery",
    distance_km: null,
    paceText: "6:00/km or slower",
    paceSeconds: 360,
    notes: "0-4 km, only if legs feel normal. Entirely by feel — skip if not.",
    is_rest_day: true,
    is_race: false,
  },
  {
    date: "2026-12-02",
    weekKey: "bridge",
    title: "Easy shakeout",
    workout_type: "recovery",
    distance_km: 5,
    paceText: "5:45/km",
    paceSeconds: 345,
    notes: null,
    is_rest_day: false,
    is_race: false,
  },
  {
    date: "2026-12-03",
    weekKey: "bridge",
    title: "Rest or easy cross-training",
    workout_type: "rest",
    distance_km: null,
    paceText: null,
    paceSeconds: null,
    notes: "Low intensity only.",
    is_rest_day: true,
    is_race: false,
  },
  {
    date: "2026-12-04",
    weekKey: "bridge",
    title: "Easy + strides",
    workout_type: "recovery",
    distance_km: 4,
    paceText: "5:45/km",
    paceSeconds: 345,
    notes: "3-4 x 100m strides (range as given in the plan — no fixed rep structure recorded).",
    is_rest_day: false,
    is_race: false,
  },
  {
    date: "2026-12-05",
    weekKey: "bridge",
    title: "Rest",
    workout_type: "rest",
    distance_km: null,
    paceText: null,
    paceSeconds: null,
    notes: "Hydrate. Carbohydrate-focused pre-race nutrition.",
    is_rest_day: true,
    is_race: false,
  },
  {
    date: "2026-12-06",
    weekKey: "bridge",
    title: "RACE — BYD Singapore Marathon",
    workout_type: "race",
    distance_km: 42.2,
    paceText: "4:50-5:00/km (suggested, by feel)",
    paceSeconds: 290,
    notes:
      "RACE — BYD Singapore Marathon. Only 8 days after the A-race. Start conservative, run by feel, " +
      "slow down if legs aren't recovered. No 3:30 split chasing — recovery is the priority.",
    is_rest_day: false,
    is_race: true,
    raceKey: "secondary",
  },
];
