import { describe, expect, it } from "vitest";
import { buildPlanContext, buildPlanPrompt, extractJson, parseAiPlan } from "@/lib/training/ai-plan";
import { PACE_ZONES } from "@/lib/training/pace-zones";
import type { Workout } from "@/lib/training/types";

function day(date: string, type = "easy", km = 8, pace: string | null = "5:30") {
  return { date, title: type === "rest" ? "Rest" : "Run", workout_type: type, distance_km: type === "rest" ? 0 : km, target_pace: type === "rest" ? null : pace, notes: null };
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    plan_name: "Test plan",
    phases: [
      {
        label: "Base",
        description: "Easy miles",
        start_date: "2026-12-01",
        end_date: "2026-12-10",
        color: "easy",
        workouts: Array.from({ length: 10 }, (_, i) => day(`2026-12-${String(i + 1).padStart(2, "0")}`, i % 3 === 0 ? "rest" : "easy")),
      },
      {
        label: "Taper",
        description: "",
        start_date: "2026-12-11",
        end_date: "2026-12-13",
        color: "rest",
        workouts: [day("2026-12-11", "easy", 5, "5:15-5:45"), day("2026-12-12", "rest"), day("2026-12-13", "race", 21.1, "4:30")],
      },
    ],
    ...overrides,
  };
}

describe("extractJson", () => {
  it("pulls JSON out of a fenced block surrounded by chatter", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```\nGood luck!')).toBe('{"a":1}');
  });

  it("accepts bare JSON", () => {
    expect(extractJson('  {"a":{"b":2}} ')).toBe('{"a":{"b":2}}');
  });

  it("returns null when there's no object", () => {
    expect(extractJson("sorry, I can't")).toBeNull();
  });
});

describe("parseAiPlan", () => {
  it("parses phases, derives 7-day weeks, and maps workouts", () => {
    const result = parseAiPlan("```json\n" + JSON.stringify(plan()) + "\n```");
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const { plan: p } = result;

    expect(p.phases.map((ph) => ph.id)).toEqual(["base", "taper"]);
    expect(p.startDate).toBe("2026-12-01");
    expect(p.endDate).toBe("2026-12-13");
    expect(p.weeks.map((w) => [w.weekNumber, w.phaseId, w.startDate, w.endDate])).toEqual([
      [1, "base", "2026-12-01", "2026-12-07"],
      [2, "base", "2026-12-08", "2026-12-10"],
      [3, "taper", "2026-12-11", "2026-12-13"],
    ]);
    expect(p.workouts).toHaveLength(13);

    const race = p.workouts.find((w) => w.date === "2026-12-13")!;
    expect(race).toMatchObject({ isRace: true, isRest: false, paceSeconds: 270, weekKey: "taper_w3" });

    const ranged = p.workouts.find((w) => w.date === "2026-12-11")!;
    expect(ranged).toMatchObject({ paceText: "5:15-5:45", paceSeconds: 315 });

    const rest = p.workouts.find((w) => w.date === "2026-12-01")!;
    expect(rest).toMatchObject({ isRest: true, distanceKm: null, paceText: null });
    expect(result.warnings).toEqual([]);
  });

  it("avoids colliding with existing phase ids", () => {
    const result = parseAiPlan(JSON.stringify(plan()), ["base", "base_2"]);
    expect(result.ok && result.plan.phases[0].id).toBe("base_3");
  });

  it("rejects overlapping phases", () => {
    const p = plan();
    p.phases[1].start_date = "2026-12-10";
    const result = parseAiPlan(JSON.stringify(p));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join()).toMatch(/overlap/);
  });

  it("rejects workouts outside their phase and duplicate days", () => {
    const p = plan();
    p.phases[1].workouts.push(day("2026-12-20"), day("2026-12-13"));
    const result = parseAiPlan(JSON.stringify(p));
    expect(result.ok).toBe(false);
    const errors = !result.ok ? result.errors.join("\n") : "";
    expect(errors).toMatch(/outside phase/);
    expect(errors).toMatch(/More than one workout on 2026-12-13/);
  });

  it("reports schema problems with a path", () => {
    const p = plan();
    (p.phases[0].workouts[1] as { workout_type: string }).workout_type = "jog";
    const result = parseAiPlan(JSON.stringify(p));
    expect(!result.ok && result.errors[0]).toMatch(/^phases\[0\]\.workouts\[1\]\.workout_type/);
  });

  it("rejects impossible dates and malformed JSON", () => {
    const p = plan();
    p.phases[0].end_date = "2026-02-30";
    expect(parseAiPlan(JSON.stringify(p)).ok).toBe(false);
    expect(parseAiPlan("{ phases: [ }").ok).toBe(false);
  });

  it("warns about missing days and non-numeric paces", () => {
    const p = plan();
    p.phases[0].workouts.splice(4, 1);
    p.phases[0].workouts[1].target_pace = "easy effort";
    const result = parseAiPlan(JSON.stringify(p));
    expect(result.ok).toBe(true);
    expect(result.ok && result.warnings.join("\n")).toMatch(/1 day has no entry/);
    expect(result.ok && result.warnings.join("\n")).toMatch(/easy effort/);
  });
});

describe("buildPlanContext + buildPlanPrompt", () => {
  const run = (date: string, km: number, extra: Partial<Workout> = {}): Workout =>
    ({
      date,
      title: "Run",
      workout_type: "easy",
      completed: true,
      is_rest_day: false,
      is_race: false,
      distance_km: km,
      actual_distance_km: km,
      actual_time_seconds: null,
      actual_pace_seconds_per_km: 330,
      perceived_effort: 4,
      ...extra,
    }) as Workout;

  const ctx = buildPlanContext({
    today: "2026-11-26",
    profile: { display_name: "Runner", height_cm: 175 },
    latestBodyMetric: { weight_kg: 68, resting_hr: 190, vo2max: 52 },
    hrZones: null,
    paceZones: PACE_ZONES,
    races: [
      { id: "r1", name: "City Half", date: "2027-02-01", distance_km: 21.1, priority: "a_race", goal_time_seconds: 5400 } as never,
      { id: "r0", name: "Old race", date: "2026-01-01", distance_km: 10, priority: "other", goal_time_seconds: null } as never,
    ],
    workouts: [
      run("2026-11-24", 10),
      run("2026-11-22", 21.1, { is_race: true, title: "Tune-up half", actual_time_seconds: 5700 }),
      run("2026-11-27", 99), // future: ignored
      run("2026-11-20", 5, { completed: false }),
    ],
  });

  it("summarises the last 8 weeks, ending with the current week", () => {
    expect(ctx.recentWeeks).toHaveLength(8);
    expect(ctx.recentWeeks[7]).toEqual({ weekStart: "2026-11-23", km: 10, runs: 1, longestKm: 10 });
    expect(ctx.recentWeeks[6]).toEqual({ weekStart: "2026-11-16", km: 21.1, runs: 1, longestKm: 21.1 });
  });

  it("keeps only upcoming races and completed race results", () => {
    expect(ctx.upcomingRaces.map((r) => r.name)).toEqual(["City Half"]);
    expect(ctx.recentRaces).toHaveLength(1);
    expect(ctx.recentRaces[0].vdot).toBeGreaterThan(40);
    expect(ctx.maxHr).toBe(190);
  });

  it("builds the prompt around the selected target race", () => {
    const prompt = buildPlanPrompt(ctx, { targetRaceId: "r1", extraInstructions: "I can run 5 days a week." });
    expect(prompt).toContain("## Target race\nCity Half — 21.1 km on 2027-02-01. My goal time is 1:30:00 (4:16/km).");
    expect(prompt).toContain("end it on race day (2027-02-01)");
    expect(prompt).toContain("## Other races I've entered\n- None.");
    expect(prompt).toContain("Tune-up half — 21.1 km in 1:35:00");
    expect(prompt).toContain("I can run 5 days a week.");
    expect(prompt).toContain('"workout_type"');
    expect(prompt).not.toContain("Old race");
  });

  it("lists all upcoming races when no target is selected", () => {
    const prompt = buildPlanPrompt(ctx);
    expect(prompt).not.toContain("## Target race");
    expect(prompt).toContain("2027-02-01: City Half — 21.1 km, A-race (main goal), goal time 1:30:00");
  });

  it("produces an example the parser accepts", () => {
    const example = extractJson(buildPlanPrompt(ctx).split("## Output format")[1])!;
    expect(parseAiPlan(example).ok).toBe(true);
  });
});
