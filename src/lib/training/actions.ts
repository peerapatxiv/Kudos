"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { paceFromDistanceAndTime } from "@/lib/training/pace";
import type { RacePriority } from "@/lib/training/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CompleteWorkoutInput {
  workoutId: string;
  actualDistanceKm?: number | null;
  actualTimeSeconds?: number | null;
  perceivedEffort?: number | null;
  athleteNotes?: string | null;
}

/** Marks a workout completed, computing average pace from distance + time when both are present. */
export async function completeWorkout(input: CompleteWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const actualPace =
    input.actualDistanceKm && input.actualTimeSeconds
      ? paceFromDistanceAndTime(input.actualDistanceKm, input.actualTimeSeconds)
      : null;

  const { error } = await supabase
    .from("workouts")
    .update({
      completed: true,
      status: "completed",
      completed_at: new Date().toISOString(),
      actual_distance_km: input.actualDistanceKm ?? null,
      actual_time_seconds: input.actualTimeSeconds ?? null,
      actual_pace_seconds_per_km: actualPace ? Math.round(actualPace) : null,
      perceived_effort: input.perceivedEffort ?? null,
      athlete_notes: input.athleteNotes ?? null,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/plan");
  revalidatePath("/progress");
  return { ok: true };
}

export async function skipWorkout(workoutId: string, note?: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({
      completed: false,
      status: "skipped",
      completed_at: null,
      athlete_notes: note ?? null,
    })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/progress");
  return { ok: true };
}

export async function resetWorkout(workoutId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({
      completed: false,
      status: "planned",
      completed_at: null,
      actual_distance_km: null,
      actual_time_seconds: null,
      actual_pace_seconds_per_km: null,
      perceived_effort: null,
      athlete_notes: null,
    })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/progress");
  return { ok: true };
}

export interface ModifyWorkoutInput {
  workoutId: string;
  distanceKm?: number | null;
  notes?: string | null;
}

export async function modifyWorkout(input: ModifyWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({
      status: "modified",
      distance_km: input.distanceKm ?? null,
      athlete_notes: input.notes ?? null,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface DailyLogInput {
  date: string;
  sleepQuality?: number | null;
  fatigue?: number | null;
  soreness?: number | null;
  motivation?: number | null;
  notes?: string | null;
}

export async function upsertDailyLog(input: DailyLogInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: user.id,
      date: input.date,
      sleep_quality: input.sleepQuality ?? null,
      fatigue: input.fatigue ?? null,
      soreness: input.soreness ?? null,
      motivation: input.motivation ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export interface UpdateProfileInput {
  displayName: string;
  heightCm?: number | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, display_name: input.displayName, height_cm: input.heightCm ?? null },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface BodyMetricInput {
  date: string;
  weightKg?: number | null;
  restingHr?: number | null;
  vo2max?: number | null;
  notes?: string | null;
}

export async function upsertBodyMetric(input: BodyMetricInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      date: input.date,
      weight_kg: input.weightKg ?? null,
      resting_hr: input.restingHr ?? null,
      vo2max: input.vo2max ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  return { ok: true };
}

export interface UpdateRaceInput {
  raceId: string;
  name: string;
  date: string;
  distanceKm: number;
  priority: RacePriority;
  goalTimeSeconds?: number | null;
  goalPaceSecondsPerKm?: number | null;
  notes?: string | null;
}

export async function updateRace(input: UpdateRaceInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("races")
    .update({
      name: input.name,
      date: input.date,
      distance_km: input.distanceKm,
      priority: input.priority,
      goal_time_seconds: input.goalTimeSeconds ?? null,
      goal_pace_seconds_per_km: input.goalPaceSecondsPerKm ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.raceId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface CreateRaceInput {
  name: string;
  date: string;
  distanceKm: number;
  priority: RacePriority;
  goalTimeSeconds?: number | null;
  goalPaceSecondsPerKm?: number | null;
  notes?: string | null;
}

export async function createRace(input: CreateRaceInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("races").insert({
    user_id: user.id,
    name: input.name,
    race_type: "race",
    date: input.date,
    distance_km: input.distanceKm,
    priority: input.priority,
    goal_time_seconds: input.goalTimeSeconds ?? null,
    goal_pace_seconds_per_km: input.goalPaceSecondsPerKm ?? null,
    notes: input.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteRace(raceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("races").delete().eq("id", raceId).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface EditCompletedWorkoutInput {
  workoutId: string;
  actualDistanceKm?: number | null;
  actualTimeSeconds?: number | null;
  perceivedEffort?: number | null;
  athleteNotes?: string | null;
}

/** Corrects a completed workout's logged numbers in place, without touching its "completed" status. */
export async function editCompletedWorkout(input: EditCompletedWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const actualPace =
    input.actualDistanceKm && input.actualTimeSeconds
      ? paceFromDistanceAndTime(input.actualDistanceKm, input.actualTimeSeconds)
      : null;

  const { error } = await supabase
    .from("workouts")
    .update({
      actual_distance_km: input.actualDistanceKm ?? null,
      actual_time_seconds: input.actualTimeSeconds ?? null,
      actual_pace_seconds_per_km: actualPace ? Math.round(actualPace) : null,
      perceived_effort: input.perceivedEffort ?? null,
      athlete_notes: input.athleteNotes ?? null,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id)
    .eq("completed", true);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/plan");
  revalidatePath("/progress");
  return { ok: true };
}

export async function fetchWorkoutDetails(date: string): Promise<{ status: "ok" | "error"; data?: any; races?: any[]; message?: string }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };

  const [workoutResult, racesResult] = await Promise.all([
    supabase
      .from("workouts")
      .select("*, workout_intervals(*), race:races(*)")
      .eq("date", date)
      .maybeSingle(),
    supabase.from("races").select("*"),
  ]);

  if (workoutResult.error) return { status: "error", message: workoutResult.error.message };

  return { status: "ok", data: workoutResult.data, races: racesResult.data || [] };
}

export interface UpdateWorkoutMetadataInput {
  workoutId: string;
  title?: string;
  workoutType?: string;
  distanceKm?: number | null;
  targetPaceMinSecPerKm?: string | null;
  notes?: string | null;
}

export async function updateWorkoutMetadata(input: UpdateWorkoutMetadataInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({
      title: input.title,
      workout_type: input.workoutType,
      distance_km: input.distanceKm ?? null,
      target_pace_min_sec_per_km: input.targetPaceMinSecPerKm ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/plan");
  return { ok: true };
}

export interface CreateWorkoutIntervalInput {
  workoutId: string;
  intervalNumber: number;
  distanceM: number;
  targetPaceSecondsPerKm?: number | null;
  recoverySeconds?: number | null;
  recoveryType?: string | null;
}

export async function createWorkoutInterval(input: CreateWorkoutIntervalInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("workout_intervals").insert([
    {
      workout_id: input.workoutId,
      interval_number: input.intervalNumber,
      distance_m: input.distanceM,
      target_pace_seconds_per_km: input.targetPaceSecondsPerKm ?? null,
      recovery_seconds: input.recoverySeconds ?? null,
      recovery_type: input.recoveryType ?? null,
    },
  ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface UpdateWorkoutIntervalInput {
  intervalId: string;
  distanceM?: number;
  targetPaceSecondsPerKm?: number | null;
  recoverySeconds?: number | null;
  recoveryType?: string | null;
}

export async function updateWorkoutInterval(input: UpdateWorkoutIntervalInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase
    .from("workout_intervals")
    .update({
      distance_m: input.distanceM,
      target_pace_seconds_per_km: input.targetPaceSecondsPerKm ?? null,
      recovery_seconds: input.recoverySeconds ?? null,
      recovery_type: input.recoveryType ?? null,
    })
    .eq("id", input.intervalId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteWorkoutInterval(intervalId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("workout_intervals").delete().eq("id", intervalId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface LinkWorkoutRaceInput {
  workoutId: string;
  raceId: string;
}

export async function linkWorkoutRace(input: LinkWorkoutRaceInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({ race_id: input.raceId })
    .eq("id", input.workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function unlinkWorkoutRace(workoutId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({ race_id: null })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export interface UpdatePhaseInput {
  id: string;
  label: string;
  description: string;
  startDate: string;
  endDate: string;
}

export async function updatePhase(input: UpdatePhaseInput): Promise<ActionResult> {
  // Phase editing requires the training_phases table in Supabase.
  // To enable this, create the table with:
  // CREATE TABLE public.training_phases (
  //   id TEXT PRIMARY KEY,
  //   label TEXT NOT NULL,
  //   description TEXT,
  //   start_date DATE NOT NULL,
  //   end_date DATE NOT NULL
  // );

  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const updateResponse = await supabase
      .from("training_phases")
      // @ts-ignore - training_phases table typing
      .update({
        label: input.label,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
      })
      .eq("id", input.id);

    const error = updateResponse.error;

    if (error) {
      // If table doesn't exist, return friendly error
      if (error.message?.includes("does not exist") || error.message?.includes("schema cache")) {
        return {
          ok: false,
          error: "Run migrations to enable phase editing: supabase db push"
        };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath("/plan");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: "Phase editing is not available. Edit phases in src/lib/training/phases.ts directly."
    };
  }
}

export interface CreateQuickWorkoutInput {
  date: string;
  title: string;
  workoutType: string;
  distanceKm?: number | null;
  targetPace?: string;
  isCompleted?: boolean;
}

export async function createQuickWorkout(input: CreateQuickWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("workouts").insert([
    {
      user_id: user.id,
      date: input.date,
      title: input.title,
      workout_type: input.workoutType,
      distance_km: input.distanceKm ?? null,
      target_pace_min_sec_per_km: input.targetPace ?? null,
      is_rest_day: false,
      is_race: false,
      completed: input.isCompleted ? true : false,
      status: input.isCompleted ? "completed" : "planned",
      day_of_week: new Date(`${input.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
    },
  ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return { ok: true };
}

export async function deleteWorkout(workoutId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return { ok: true };
}

export interface CreatePhaseInput {
  id: string;
  label: string;
  description: string;
  startDate: string;
  endDate: string;
}

export async function createPhase(input: CreatePhaseInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // @ts-ignore - training_phases table may not exist in types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = (await (supabase.from("training_phases") as any).insert({
    id: input.id,
    user_id: user.id,
    label: input.label,
    description: input.description,
    start_date: input.startDate,
    end_date: input.endDate,
  } as any)) as any;

  if (error) return { ok: false, error: error.message };

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deletePhase(phaseId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("training_phases")
    .delete()
    .eq("id", phaseId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface MoveWorkoutInput {
  workoutId: string;
  newDate: string;
}

export async function moveWorkout(input: MoveWorkoutInput): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const newDayOfWeek = new Date(`${input.newDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });

  const { error } = await supabase
    .from("workouts")
    .update({
      date: input.newDate,
      day_of_week: newDayOfWeek,
    })
    .eq("id", input.workoutId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return { ok: true };
}
