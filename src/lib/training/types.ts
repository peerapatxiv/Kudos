export type RacePriority = "a_race" | "secondary" | "tune_up";

export type WorkoutType =
  | "easy"
  | "tempo"
  | "interval"
  | "long_run"
  | "rest"
  | "race"
  | "recovery";

export type TrainingPhaseId =
  | "lead_in"
  | "base"
  | "build"
  | "peak"
  | "taper"
  | "recovery_bridge"
  | "pre_plan";

export type WorkoutStatus = "planned" | "completed" | "skipped" | "modified";

export type RecoveryType = "jog" | "walk" | "easy_pace" | "stand" | null;

export interface Race {
  id: string;
  user_id: string;
  name: string;
  race_type: string;
  date: string;
  distance_km: number;
  goal_time_seconds: number | null;
  goal_pace_seconds_per_km: number | null;
  priority: RacePriority;
  notes: string | null;
  created_at: string;
}

export interface TrainingWeek {
  id: string;
  user_id: string;
  week_number: number;
  phase: TrainingPhaseId;
  start_date: string;
  end_date: string;
  notes: string | null;
}

export interface WorkoutInterval {
  id: string;
  workout_id: string;
  interval_number: number;
  distance_m: number;
  target_pace_seconds_per_km: number | null;
  recovery_seconds: number | null;
  recovery_type: RecoveryType;
}

export interface Workout {
  id: string;
  user_id: string;
  training_week_id: string | null;
  date: string;
  day_of_week: string;
  title: string;
  workout_type: WorkoutType;
  distance_km: number | null;
  target_pace_min_sec_per_km: string | null;
  pace_min_sec_per_km: number | null;
  notes: string | null;
  is_rest_day: boolean;
  is_race: boolean;
  race_id: string | null;
  completed: boolean;
  status: WorkoutStatus;
  completed_at: string | null;
  actual_distance_km: number | null;
  actual_time_seconds: number | null;
  actual_pace_seconds_per_km: number | null;
  perceived_effort: number | null;
  athlete_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutWithIntervals extends Workout {
  workout_intervals: WorkoutInterval[];
  race: Race | null;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  sleep_quality: number | null;
  fatigue: number | null;
  soreness: number | null;
  motivation: number | null;
  notes: string | null;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  resting_hr: number | null;
  vo2max: number | null;
  notes: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaceZone {
  id: string;
  label: string;
  paceLow: string;
  paceHigh: string | null;
  description: string;
}
