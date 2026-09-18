"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SEED_RACES, SEED_WEEKS, SEED_WORKOUTS } from "@/lib/training/plan-data";
import { dayOfWeekLabel } from "@/lib/training/dates";

export interface AuthResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  if (data.user && data.session) {
    await seedPlanForUser(data.user.id);
    redirect("/dashboard");
  }

  return { ok: true, message: "Check your inbox to confirm your account." };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  redirect("/dashboard");
}

export async function sendMagicLink(email: string, redirectTo: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Check your inbox for a magic sign-in link." };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Seeds the supplied training plan for a brand-new user on first sign-up, so
 * onboarding always lands on a fully populated dashboard. Idempotent: skips
 * if this user already has races (e.g. re-running seed manually).
 */
export async function seedPlanForUser(userId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { count } = await supabase
    .from("races")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (count && count > 0) return;

  const raceIdByKey = new Map<string, string>();
  for (const race of SEED_RACES) {
    const { data } = await supabase
      .from("races")
      .insert({
        user_id: userId,
        name: race.name,
        race_type: race.race_type,
        date: race.date,
        distance_km: race.distance_km,
        goal_time_seconds: race.goal_time_seconds,
        goal_pace_seconds_per_km: race.goal_pace_seconds_per_km,
        priority: race.priority,
        notes: race.notes,
      })
      .select("id")
      .single();
    if (data) raceIdByKey.set(race.key, data.id);
  }

  const weekIdByKey = new Map<string, string>();
  for (const week of SEED_WEEKS) {
    const { data } = await supabase
      .from("training_weeks")
      .insert({
        user_id: userId,
        week_number: week.week_number,
        phase: week.phase,
        start_date: week.start_date,
        end_date: week.end_date,
        notes: week.notes,
      })
      .select("id")
      .single();
    if (data) weekIdByKey.set(week.key, data.id);
  }

  for (const workout of SEED_WORKOUTS) {
    const { data } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        training_week_id: weekIdByKey.get(workout.weekKey) ?? null,
        date: workout.date,
        day_of_week: dayOfWeekLabel(workout.date),
        title: workout.title,
        workout_type: workout.workout_type,
        distance_km: workout.distance_km,
        target_pace_min_sec_per_km: workout.paceText,
        pace_min_sec_per_km: workout.paceSeconds,
        notes: workout.notes,
        is_rest_day: workout.is_rest_day,
        is_race: workout.is_race,
        race_id: workout.raceKey ? raceIdByKey.get(workout.raceKey) ?? null : null,
      })
      .select("id")
      .single();

    if (data && workout.intervals?.length) {
      await supabase.from("workout_intervals").insert(
        workout.intervals.map((interval) => ({
          workout_id: data.id,
          interval_number: interval.interval_number,
          distance_m: interval.distance_m,
          target_pace_seconds_per_km: interval.target_pace_seconds_per_km,
          recovery_seconds: interval.recovery_seconds,
          recovery_type: interval.recovery_type,
        })),
      );
    }
  }
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Check your inbox for a password reset link." };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one from the sign-in page." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };

  redirect("/dashboard");
}
