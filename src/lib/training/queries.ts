import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BodyMetric, DailyLog, Race, TrainingWeek, Workout, WorkoutInterval, WorkoutWithIntervals } from "./types";
import type { PhaseDefinition } from "./phases";
import { PHASES } from "./phases";

export type QueryResult<T> =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "ok"; data: T };

async function client() {
  const supabase = await getSupabaseServerClient();
  return supabase;
}

export async function getCurrentUser() {
  const supabase = await client();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").maybeSingle();
  return data;
}

export async function getRaces(): Promise<QueryResult<Race[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase.from("races").select("*").order("date", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as Race[] };
}

export async function getRaceByPriority(priority: Race["priority"]): Promise<Race | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.from("races").select("*").eq("priority", priority).maybeSingle();
  return data as Race | null;
}

export async function getTrainingWeeks(): Promise<QueryResult<TrainingWeek[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase
    .from("training_weeks")
    .select("*")
    .order("week_number", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as TrainingWeek[] };
}

export async function getWorkoutsInRange(
  startDate: string,
  endDate: string,
): Promise<QueryResult<Workout[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as Workout[] };
}

export async function getAllWorkouts(): Promise<QueryResult<Workout[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase.from("workouts").select("*").order("date", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as Workout[] };
}

export async function getWorkoutByDate(date: string): Promise<QueryResult<WorkoutWithIntervals | null>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_intervals(*), race:races(*)")
    .eq("date", date)
    .maybeSingle();
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: data as WorkoutWithIntervals | null };
}

export async function getWorkoutById(id: string): Promise<QueryResult<WorkoutWithIntervals | null>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_intervals(*), race:races(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: data as WorkoutWithIntervals | null };
}

export async function getAllWorkoutIntervals(): Promise<QueryResult<WorkoutInterval[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase
    .from("workout_intervals")
    .select("*")
    .order("interval_number", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as WorkoutInterval[] };
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.from("daily_logs").select("*").eq("date", date).maybeSingle();
  return data as DailyLog | null;
}

export async function getBodyMetricByDate(date: string): Promise<BodyMetric | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.from("body_metrics").select("*").eq("date", date).maybeSingle();
  return data as BodyMetric | null;
}

export async function getBodyMetrics(): Promise<QueryResult<BodyMetric[]>> {
  const supabase = await client();
  if (!supabase) return { status: "unconfigured" };
  const { data, error } = await supabase.from("body_metrics").select("*").order("date", { ascending: true });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as BodyMetric[] };
}

/** Most recently logged body metric, regardless of date — weight/Max HR/VO2max change rarely, so callers use this to show or pre-fill "current" values instead of requiring a fresh entry every day. */
export async function getLatestBodyMetric(): Promise<BodyMetric | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase
    .from("body_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as BodyMetric | null;
}

export async function getPhases(): Promise<QueryResult<PhaseDefinition[]>> {
  try {
    const supabase = await client();
    if (!supabase) return { status: "unconfigured" };

    const { data, error } = await supabase
      .from("training_phases")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      return { status: "error", message: error.message };
    }

    const dbPhases = (data ?? []).map((row: any) => ({
      id: row.id,
      label: row.label,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description || "",
      color: row.color || "rest",
    }));

    return { status: "ok", data: dbPhases };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to fetch phases" };
  }
}
