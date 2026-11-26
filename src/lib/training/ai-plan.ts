/**
 * Round-trip for AI-written training plans: build a prompt from the athlete's
 * stats that asks an AI (ChatGPT, Claude, …) for a plan in a fixed JSON
 * format, then parse and validate the AI's reply into rows this app can save.
 *
 * Pure — no Supabase, no React — so the modal can preview a pasted plan and
 * the server action can re-validate the same text before writing anything.
 */
import { z } from "zod";
import { paceTextToSeconds } from "./pace";
import { estimateVo2max } from "./vo2max";
import type { PaceZone, Race, Workout, WorkoutType } from "./types";
import type { ResolvedHrZone } from "./zones";

export const AI_WORKOUT_TYPES = ["easy", "recovery", "tempo", "interval", "long_run", "race", "rest"] as const satisfies readonly WorkoutType[];
export const AI_PHASE_COLORS = ["easy", "tempo", "interval", "secondary-race", "rest", "recovery"] as const;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export interface PlanPromptContext {
  today: string;
  displayName: string | null;
  heightCm: number | null;
  weightKg: number | null;
  maxHr: number | null;
  vo2max: number | null;
  hrZones: ResolvedHrZone[] | null;
  paceZones: PaceZone[];
  upcomingRaces: { id: string; name: string; date: string; distanceKm: number; priority: string; goalTimeSeconds: number | null }[];
  recentRaces: { date: string; title: string; distanceKm: number; timeSeconds: number; vdot: number | null }[];
  /** Last 8 weeks (Mon–Sun), oldest first. */
  recentWeeks: { weekStart: string; km: number; runs: number; longestKm: number }[];
  /** Up to 12 most recent completed runs, newest first. */
  recentRuns: { date: string; type: string; distanceKm: number; paceSecondsPerKm: number | null; effort: number | null }[];
}

export interface PlanPromptInput {
  profile: { display_name?: string | null; height_cm?: number | null } | null;
  latestBodyMetric: { weight_kg: number | null; resting_hr: number | null; vo2max: number | null } | null;
  hrZones: ResolvedHrZone[] | null;
  paceZones: PaceZone[];
  races: Race[];
  workouts: Workout[];
  today: string;
}

/** Collect the stats the prompt talks about from what the app already stores. */
export function buildPlanContext(input: PlanPromptInput): PlanPromptContext {
  const { today, workouts } = input;
  const completedRuns = workouts
    .filter((w) => w.completed && !w.is_rest_day && w.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const thisMonday = mondayOf(today);
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = addDays(thisMonday, -7 * (7 - i));
    const weekEnd = addDays(weekStart, 6);
    const runs = completedRuns.filter((w) => w.date >= weekStart && w.date <= weekEnd);
    const kms = runs.map(runKm);
    return {
      weekStart,
      km: round1(kms.reduce((a, b) => a + b, 0)),
      runs: runs.length,
      longestKm: round1(Math.max(0, ...kms)),
    };
  });

  const recentRaces = completedRuns
    .filter((w) => w.is_race && w.actual_distance_km != null && w.actual_time_seconds != null)
    .slice(0, 5)
    .map((w) => ({
      date: w.date,
      title: w.title,
      distanceKm: w.actual_distance_km!,
      timeSeconds: w.actual_time_seconds!,
      vdot: estimateVo2max(w.actual_distance_km!, w.actual_time_seconds!),
    }));

  return {
    today,
    displayName: input.profile?.display_name ?? null,
    heightCm: input.profile?.height_cm ?? null,
    weightKg: input.latestBodyMetric?.weight_kg ?? null,
    // The body-metrics "Max HR" value is stored in resting_hr.
    maxHr: input.latestBodyMetric?.resting_hr ?? null,
    vo2max: input.latestBodyMetric?.vo2max ?? null,
    hrZones: input.hrZones,
    paceZones: input.paceZones,
    upcomingRaces: input.races
      .filter((r) => r.date >= today)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((r) => ({
        id: r.id,
        name: r.name,
        date: r.date,
        distanceKm: r.distance_km,
        priority: r.priority,
        goalTimeSeconds: r.goal_time_seconds,
      })),
    recentRaces,
    recentWeeks,
    recentRuns: completedRuns.slice(0, 12).map((w) => ({
      date: w.date,
      type: w.workout_type,
      distanceKm: runKm(w),
      paceSecondsPerKm: w.actual_pace_seconds_per_km ?? null,
      effort: w.perceived_effort,
    })),
  };
}

export const PRIORITY_LABELS: Record<string, string> = {
  a_race: "A-race (main goal)",
  secondary: "Secondary race",
  tune_up: "Tune-up race",
  other: "Other race",
};

export interface PlanPromptOptions {
  /** id of the upcoming race the plan builds towards. */
  targetRaceId?: string | null;
  extraInstructions?: string;
}

/** The full text the athlete copies into an AI chat. */
export function buildPlanPrompt(ctx: PlanPromptContext, options: PlanPromptOptions = {}): string {
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);
  const target = ctx.upcomingRaces.find((r) => r.id === options.targetRaceId) ?? null;
  const otherRaces = ctx.upcomingRaces.filter((r) => r !== target);

  push("You are an experienced running coach. Build me a personalised running training plan based on my data below.", "");
  if (target) {
    const goal = target.goalTimeSeconds
      ? ` My goal time is ${fmtDuration(target.goalTimeSeconds)} (${secondsToPace(target.goalTimeSeconds / target.distanceKm)}/km).`
      : " I have no goal time yet — suggest a realistic one from my recent results and train for it.";
    push(
      "## Target race",
      `${target.name} — ${target.distanceKm} km on ${target.date}.${goal}`,
      "",
      `Today is ${ctx.today}. Start the plan on or after today and end it on race day (${target.date}), with a taper in the final 1–2 weeks. The race day itself is a workout with workout_type "race".`,
    );
  } else {
    push(`Today is ${ctx.today}. The plan should start on or after today.`);
  }
  push("", "## About me");
  if (ctx.displayName) push(`- Name: ${ctx.displayName}`);
  push(`- Height: ${fmt(ctx.heightCm, " cm")}`);
  push(`- Weight: ${fmt(ctx.weightKg, " kg")}`);
  push(`- Max HR: ${fmt(ctx.maxHr, " bpm")}`);
  push(`- VO2max: ${fmt(ctx.vo2max)}`);

  push("", target ? "## Other races I've entered" : "## Upcoming races");
  if (otherRaces.length === 0) push(target ? "- None." : "- None registered. Pick a sensible goal, or follow my extra instructions.");
  else if (target) push("Fit these in if they fall inside the plan (e.g. as tune-ups or easy efforts), without compromising the target race:");
  for (const r of otherRaces) {
    const goal = r.goalTimeSeconds ? `, goal time ${fmtDuration(r.goalTimeSeconds)}` : "";
    push(`- ${r.date}: ${r.name} — ${r.distanceKm} km, ${PRIORITY_LABELS[r.priority] ?? r.priority}${goal}`);
  }

  push("", "## Recent race results");
  if (ctx.recentRaces.length === 0) push("- None logged.");
  for (const r of ctx.recentRaces) {
    const vdot = r.vdot ? ` (VDOT ≈ ${r.vdot.toFixed(1)})` : "";
    push(`- ${r.date}: ${r.title} — ${r.distanceKm} km in ${fmtDuration(r.timeSeconds)}${vdot}`);
  }

  push("", "## My training zones", "Pace zones (min:sec per km):");
  for (const z of ctx.paceZones) {
    push(`- ${z.label}: ${z.paceLow}${z.paceHigh ? `–${z.paceHigh}` : ""} — ${z.description}`);
  }
  if (ctx.hrZones) {
    push("Heart-rate zones (bpm):");
    for (const z of ctx.hrZones) push(`- ${z.label}: ${z.low}–${z.high}`);
  }

  push("", "## Last 8 weeks of training (completed runs)");
  for (const w of ctx.recentWeeks) {
    push(`- Week of ${w.weekStart}: ${w.km} km over ${w.runs} run${w.runs === 1 ? "" : "s"}, longest ${w.longestKm} km`);
  }

  push("", "## Most recent runs");
  if (ctx.recentRuns.length === 0) push("- None logged.");
  for (const r of ctx.recentRuns) {
    const pace = r.paceSecondsPerKm ? ` @ ${secondsToPace(r.paceSecondsPerKm)}/km` : "";
    const effort = r.effort ? `, RPE ${r.effort}/10` : "";
    push(`- ${r.date}: ${r.type}, ${r.distanceKm} km${pace}${effort}`);
  }

  const extra = (options.extraInstructions ?? "").trim();
  if (extra) push("", "## My extra instructions", extra);

  push(
    "",
    "## How to build the plan",
    "- Start from my current weekly volume and progress sensibly (no more than ~10% per week, with lighter weeks).",
    "- Use my pace zones for target paces, and schedule races on their exact dates.",
    "- Split the plan into consecutive phases (e.g. Base, Build, Peak, Taper, Recovery). Phases must not overlap.",
    "- Give exactly one entry for every calendar day from the first phase's start date to the last phase's end date, including rest days.",
    "",
    "## Output format (important)",
    "Reply with ONLY a single JSON object in one json code block — no other text. It must match this shape exactly:",
    "",
    "```json",
    JSON.stringify(EXAMPLE_PLAN, null, 2),
    "```",
    "",
    "Rules for the JSON:",
    "- Dates are \"YYYY-MM-DD\". Each workout's date must fall inside its phase's start_date..end_date.",
    `- \"workout_type\" is one of: ${AI_WORKOUT_TYPES.map((t) => `"${t}"`).join(", ")}.`,
    `- \"color\" is one of: ${AI_PHASE_COLORS.map((c) => `"${c}"`).join(", ")}.`,
    "- \"distance_km\" is a number (use 0 for rest days).",
    "- \"target_pace\" is a pace in min:sec per km such as \"5:30\" or a range \"5:15-5:45\", or null for rest days.",
    "- \"notes\" describes the session (warm-up, reps, recovery, cooldown) in one or two sentences. Use null if nothing to add.",
  );

  return lines.join("\n");
}

const EXAMPLE_PLAN = {
  plan_name: "Half marathon build",
  phases: [
    {
      label: "Base",
      description: "Aerobic foundation and gradual volume increase.",
      start_date: "2026-01-05",
      end_date: "2026-01-25",
      color: "easy",
      workouts: [
        {
          date: "2026-01-05",
          title: "Rest",
          workout_type: "rest",
          distance_km: 0,
          target_pace: null,
          notes: null,
        },
        {
          date: "2026-01-06",
          title: "Easy run",
          workout_type: "easy",
          distance_km: 8,
          target_pace: "5:15-5:45",
          notes: "Conversational effort.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "is not a real date");

const workoutSchema = z.object({
  date: isoDate,
  title: z.string().trim().min(1, "title is required").max(120),
  workout_type: z.enum(AI_WORKOUT_TYPES),
  distance_km: z.number().min(0).max(250).nullable().optional(),
  target_pace: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const phaseSchema = z.object({
  label: z.string().trim().min(1, "label is required").max(60),
  description: z.string().trim().max(500).nullable().optional(),
  start_date: isoDate,
  end_date: isoDate,
  color: z.enum(AI_PHASE_COLORS).catch("rest"),
  workouts: z.array(workoutSchema).max(400),
});

const planSchema = z.object({
  plan_name: z.string().trim().max(120).nullable().optional(),
  phases: z.array(phaseSchema).min(1, "the plan needs at least one phase").max(20),
});

export interface ParsedPhase {
  id: string;
  label: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
}

export interface ParsedWeek {
  key: string;
  weekNumber: number;
  phaseId: string;
  startDate: string;
  endDate: string;
}

export interface ParsedWorkout {
  date: string;
  weekKey: string;
  title: string;
  workoutType: WorkoutType;
  distanceKm: number | null;
  paceText: string | null;
  paceSeconds: number | null;
  notes: string | null;
  isRest: boolean;
  isRace: boolean;
}

export interface ParsedPlan {
  name: string | null;
  startDate: string;
  endDate: string;
  phases: ParsedPhase[];
  weeks: ParsedWeek[];
  workouts: ParsedWorkout[];
  totalKm: number;
}

export type ParseResult = { ok: true; plan: ParsedPlan; warnings: string[] } | { ok: false; errors: string[] };

/**
 * Parse an AI reply (raw JSON, or JSON wrapped in a ```json block and chatter)
 * into phases, weeks, and workouts. `existingPhaseIds` keeps new phase ids from
 * colliding with phases already saved.
 */
export function parseAiPlan(text: string, existingPhaseIds: Iterable<string> = []): ParseResult {
  const json = extractJson(text);
  if (json === null) return { ok: false, errors: ["Couldn't find a JSON object in the pasted text."] };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    return { ok: false, errors: [`The JSON is malformed: ${err instanceof Error ? err.message : String(err)}`] };
  }

  const result = planSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.slice(0, 8).map((i) => `${formatPath(i.path)}: ${i.message}`),
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const phasesIn = [...result.data.phases].sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  phasesIn.forEach((p, i) => {
    if (p.start_date > p.end_date) errors.push(`Phase "${p.label}": start_date is after end_date.`);
    const next = phasesIn[i + 1];
    if (next && next.start_date <= p.end_date) errors.push(`Phases "${p.label}" and "${next.label}" overlap.`);
  });

  const usedIds = new Set(existingPhaseIds);
  const phases: ParsedPhase[] = [];
  const weeks: ParsedWeek[] = [];
  const workouts: ParsedWorkout[] = [];
  const seenDates = new Set<string>();
  let weekNumber = 0;

  for (const p of phasesIn) {
    const id = uniqueId(slug(p.label), usedIds);
    usedIds.add(id);
    phases.push({
      id,
      label: p.label,
      description: p.description ?? "",
      startDate: p.start_date,
      endDate: p.end_date,
      color: p.color,
    });

    // Weeks are 7-day blocks counted from the phase start, so phase stats can group workouts.
    const phaseWeeks: ParsedWeek[] = [];
    for (let start = p.start_date; start <= p.end_date; start = addDays(start, 7)) {
      weekNumber += 1;
      const end = addDays(start, 6) < p.end_date ? addDays(start, 6) : p.end_date;
      phaseWeeks.push({ key: `${id}_w${weekNumber}`, weekNumber, phaseId: id, startDate: start, endDate: end });
    }
    weeks.push(...phaseWeeks);

    for (const w of p.workouts) {
      if (w.date < p.start_date || w.date > p.end_date) {
        errors.push(`"${w.title}" on ${w.date} is outside phase "${p.label}" (${p.start_date}..${p.end_date}).`);
        continue;
      }
      if (seenDates.has(w.date)) {
        errors.push(`More than one workout on ${w.date}. Ask the AI for one entry per day.`);
        continue;
      }
      seenDates.add(w.date);

      const week = phaseWeeks.find((wk) => w.date >= wk.startDate && w.date <= wk.endDate)!;
      const isRest = w.workout_type === "rest";
      const paceText = isRest ? null : (w.target_pace?.trim() || null);
      const paceSeconds = paceText ? firstPaceSeconds(paceText) : null;
      if (paceText && paceSeconds === null) warnings.push(`Pace "${paceText}" on ${w.date} isn't min:sec — kept as text only.`);

      workouts.push({
        date: w.date,
        weekKey: week.key,
        title: w.title,
        workoutType: w.workout_type,
        distanceKm: isRest ? null : (w.distance_km ?? null),
        paceText,
        paceSeconds,
        notes: w.notes?.trim() || null,
        isRest,
        isRace: w.workout_type === "race",
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 8) };
  if (workouts.length === 0) return { ok: false, errors: ["The plan has no workouts."] };

  workouts.sort((a, b) => (a.date < b.date ? -1 : 1));
  const startDate = phases[0].startDate;
  const endDate = phases[phases.length - 1].endDate;
  const missingDays = daysInclusive(startDate, endDate) - workouts.length;
  if (missingDays > 0) warnings.push(`${missingDays} day${missingDays === 1 ? " has" : "s have"} no entry — they'll stay empty in the calendar.`);

  return {
    ok: true,
    warnings,
    plan: {
      name: result.data.plan_name ?? null,
      startDate,
      endDate,
      phases,
      weeks,
      workouts,
      totalKm: round1(workouts.reduce((sum, w) => sum + (w.distanceKm ?? 0), 0)),
    },
  };
}

/** Pull the JSON object out of an AI reply: prefer a fenced block, else the outermost braces. */
export function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstPaceSeconds(text: string): number | null {
  const match = text.match(/\d{1,2}:[0-5]\d/);
  return match ? paceTextToSeconds(match[0]) : null;
}

function slug(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "phase";
}

function uniqueId(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}_${n}`)) return `${base}_${n}`;
}

function formatPath(path: PropertyKey[]): string {
  return path.length === 0 ? "plan" : path.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("").replace(/^\./, "");
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayOf(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7));
}

function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

function runKm(w: Workout): number {
  return w.actual_distance_km ?? w.distance_km ?? 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmt(value: number | null, unit = ""): string {
  return value == null ? "unknown" : `${value}${unit}`;
}

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function secondsToPace(seconds: number): string {
  const r = Math.round(seconds);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
}
