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

/** At most one race per user can hold "a_race" or "secondary" — demote whichever race currently
 * holds it (other than `keepRaceId`) to "other" so assigning it elsewhere never hits the DB's
 * partial unique index. No-op for "tune_up"/"other", which allow any number of races. */
async function demoteExistingHolder(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  userId: string,
  priority: RacePriority,
  keepRaceId: string | null,
): Promise<void> {
  if (priority !== "a_race" && priority !== "secondary") return;

  let query = supabase.from("races").update({ priority: "other" }).eq("user_id", userId).eq("priority", priority);
  if (keepRaceId) query = query.neq("id", keepRaceId);
  await query;
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

  await demoteExistingHolder(supabase, user.id, input.priority, input.raceId);

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

  await demoteExistingHolder(supabase, user.id, input.priority, null);

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

/** Never removes the A-race or secondary race — the app's routing and dashboard assume exactly one of each. */
export async function deleteRace(raceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: race } = await supabase
    .from("races")
    .select("priority")
    .eq("id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!race) return { ok: false, error: "Race not found." };
  if (race.priority === "a_race" || race.priority === "secondary") {
    return { ok: false, error: "Can't delete the A-race or secondary race." };
  }

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
