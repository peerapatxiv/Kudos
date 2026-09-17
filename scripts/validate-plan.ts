/**
 * Validates src/lib/training/plan-data.ts against the supplied training
 * plan before it's trusted for seeding. Prints a pass/fail report and exits
 * non-zero on any failure — run via `npm run validate:plan`.
 */

import { SEED_RACES, SEED_WORKOUTS } from "../src/lib/training/plan-data";

const REQUIRED_DATES = buildRequiredDates();

function buildRequiredDates(): string[] {
  const dates: string[] = [];
  const start = new Date("2026-09-16T00:00:00Z");
  const end = new Date("2026-12-06T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const checks: Check[] = [];

function check(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
}

// 1. Every supplied workout date exists.
const presentDates = new Set(SEED_WORKOUTS.map((w) => w.date));
const missing = REQUIRED_DATES.filter((d) => !presentDates.has(d));
check("Every plan date (2026-09-16 .. 2026-12-06) has a workout entry", missing.length === 0, missing.join(", "));

// 2. No duplicate dates.
const dateCounts = new Map<string, number>();
for (const w of SEED_WORKOUTS) dateCounts.set(w.date, (dateCounts.get(w.date) ?? 0) + 1);
const duplicates = [...dateCounts.entries()].filter(([, count]) => count > 1).map(([date]) => date);
check("No duplicate workout dates", duplicates.length === 0, duplicates.join(", "));

// 3. Race dates correct.
const aRace = SEED_RACES.find((r) => r.key === "a_race");
const secondary = SEED_RACES.find((r) => r.key === "secondary");
const tuneUp = SEED_RACES.find((r) => r.key === "tune_up");
check("A-race date is 2026-11-28", aRace?.date === "2026-11-28");
check("Secondary race date is 2026-12-06", secondary?.date === "2026-12-06");
check("Tune-up race date is 2026-11-22", tuneUp?.date === "2026-11-22");

// 4. Race distances correct.
check("A-race distance is 21.1 km", aRace?.distance_km === 21.1);
check("Secondary race distance is 42.2 km", secondary?.distance_km === 42.2);
check("Tune-up race distance is 21 km", tuneUp?.distance_km === 21);

// 5. Target paces correct.
check("A-race goal time is 1:35:00 (5700s)", aRace?.goal_time_seconds === 5700);
check("A-race goal pace is 4:30/km (270s)", aRace?.goal_pace_seconds_per_km === 270);
check("Secondary race has no goal time (recovery effort, not a target)", secondary?.goal_time_seconds === null);

// 6. Recovery bridge exists (Nov 29 - Dec 6, 8 days).
const bridgeDates = REQUIRED_DATES.filter((d) => d >= "2026-11-29" && d <= "2026-12-06");
check("Recovery bridge spans exactly 8 days (Nov 29 - Dec 6)", bridgeDates.length === 8);
const bridgeWorkouts = SEED_WORKOUTS.filter((w) => bridgeDates.includes(w.date));
check("Every recovery bridge day has an entry", bridgeWorkouts.length === 8);

// 7. Nov 28 marked A-race; Dec 6 marked secondary; Nov 22 marked tune-up.
const nov28 = SEED_WORKOUTS.find((w) => w.date === "2026-11-28");
const dec6 = SEED_WORKOUTS.find((w) => w.date === "2026-12-06");
const nov22 = SEED_WORKOUTS.find((w) => w.date === "2026-11-22");
check("Nov 28 is marked as a race linked to the A-race", nov28?.is_race === true && nov28?.raceKey === "a_race");
check("Dec 6 is marked as a race linked to the secondary race", dec6?.is_race === true && dec6?.raceKey === "secondary");
check("Nov 22 is marked as a race linked to the tune-up race", nov22?.is_race === true && nov22?.raceKey === "tune_up");

// 8. Nov 28 -> Dec 6 gap is 8 days.
const gapMs =
  new Date("2026-12-06T00:00:00Z").getTime() - new Date("2026-11-28T00:00:00Z").getTime();
check("Nov 28 -> Dec 6 gap is 8 days", gapMs / (24 * 60 * 60 * 1000) === 8);

const failed = checks.filter((c) => !c.pass);

console.log("Seed-data validation report");
console.log("============================");
for (const c of checks) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
}
console.log("============================");
console.log(`${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
