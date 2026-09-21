import type { RacePriority } from "@/lib/training/types";

interface RaceTypeMeta {
  label: string;
  badgeVariant: "a-race" | "secondary" | "tune-up" | "other-race";
  colorVar: string;
}

export const RACE_TYPE_META: Record<RacePriority, RaceTypeMeta> = {
  a_race: { label: "A-RACE", badgeVariant: "a-race", colorVar: "var(--a-race)" },
  secondary: { label: "RACE OF THE YEAR", badgeVariant: "secondary", colorVar: "var(--secondary-race)" },
  tune_up: { label: "TUNE-UP", badgeVariant: "tune-up", colorVar: "var(--tune-up)" },
  other: { label: "RACE", badgeVariant: "other-race", colorVar: "var(--other-race)" },
};

export function raceTypeMeta(priority: RacePriority): RaceTypeMeta {
  return RACE_TYPE_META[priority] ?? RACE_TYPE_META.other;
}
