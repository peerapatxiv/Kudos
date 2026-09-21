/**
 * Repeatable seed script: imports the full supplied training plan into
 * Supabase for one athlete account.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_EMAIL=you@example.com \
 *     npx tsx scripts/seed.ts
 *
 * The service-role key never ships to the client — this script only runs
 * locally / in CI, never in the browser or an edge/client bundle.
 *
 * Idempotent: clears this user's existing races/training_weeks/workouts
 * before re-inserting, so it's safe to re-run after editing plan-data.ts.
 */

import { createClient } from "@supabase/supabase-js";
import { SEED_RACES, SEED_WEEKS, SEED_WORKOUTS } from "../src/lib/training/plan-data";
import { PHASES } from "../src/lib/training/phases";
import { dayOfWeekLabel } from "../src/lib/training/dates";
import type { Database } from "../src/lib/supabase/database.types";

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_USER_EMAIL;

  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }
  if (!email) {
    console.error("Missing SEED_USER_EMAIL — the email of the athlete account to seed.");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersPage, error: userError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (userError) {
    console.error("Failed to list users:", userError.message);
    process.exit(1);
  }
  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(
      `No auth user found for ${email}. Sign up in the app first (or create the user in the Supabase dashboard), then re-run this script.`,
    );
    process.exit(1);
  }

  console.log(`Seeding training plan for ${email} (${user.id})...`);

  // Clear existing plan data for a clean, repeatable re-seed.
  await supabase.from("workouts").delete().eq("user_id", user.id);
  await supabase.from("training_weeks").delete().eq("user_id", user.id);
  await supabase.from("races").delete().eq("user_id", user.id);
  // Note: training_phases is app-managed (not seeded), but clear user's phases if reseeding
  try {
    await supabase.from("training_phases").delete().eq("user_id", user.id);
  } catch {
    // Table may not exist yet; that's ok, phases will fall back to hardcoded values
  }

  const raceIdByKey = new Map<string, string>();
  for (const race of SEED_RACES) {
    const { data, error } = await supabase
      .from("races")
      .insert({
        user_id: user.id,
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
    if (error) throw error;
    raceIdByKey.set(race.key, data.id);
  }
  console.log(`  inserted ${SEED_RACES.length} races`);

  // Seed training phases (if table exists)
  try {
    for (const phase of PHASES) {
      await supabase.from("training_phases").upsert(
        {
          id: phase.id,
          user_id: user.id,
          label: phase.label,
          description: phase.description,
          start_date: phase.startDate,
          end_date: phase.endDate,
        },
        { onConflict: "id,user_id" },
      );
    }
    console.log(`  inserted ${PHASES.length} training phases`);
  } catch (error) {
    // training_phases table may not exist; that's fine, phases will use hardcoded values
    console.log("  (skipped training phases — table may not exist yet)");
  }

  const weekIdByKey = new Map<string, string>();
  for (const week of SEED_WEEKS) {
    const { data, error } = await supabase
      .from("training_weeks")
      .insert({
        user_id: user.id,
        week_number: week.week_number,
        phase: week.phase,
        start_date: week.start_date,
        end_date: week.end_date,
        notes: week.notes,
      })
      .select("id")
      .single();
    if (error) throw error;
    weekIdByKey.set(week.key, data.id);
  }
  console.log(`  inserted ${SEED_WEEKS.length} training weeks`);

  let intervalCount = 0;
  for (const workout of SEED_WORKOUTS) {
    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
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
    if (error) throw error;

    if (workout.intervals?.length) {
      const { error: intervalError } = await supabase.from("workout_intervals").insert(
        workout.intervals.map((interval) => ({
          workout_id: data.id,
          interval_number: interval.interval_number,
          distance_m: interval.distance_m,
          target_pace_seconds_per_km: interval.target_pace_seconds_per_km,
          recovery_seconds: interval.recovery_seconds,
          recovery_type: interval.recovery_type,
        })),
      );
      if (intervalError) throw intervalError;
      intervalCount += workout.intervals.length;
    }
  }
  console.log(`  inserted ${SEED_WORKOUTS.length} workouts (${intervalCount} interval rows)`);

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
