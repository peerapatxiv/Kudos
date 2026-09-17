import { Wind, Flame, Zap, Route, Bed, Trophy, Leaf, type LucideIcon } from "lucide-react";
import type { WorkoutType } from "@/lib/training/types";
import type { BadgeProps } from "@/components/ui/badge";

interface WorkoutTypeMeta {
  label: string;
  icon: LucideIcon;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  colorVar: string;
}

export const WORKOUT_TYPE_META: Record<WorkoutType, WorkoutTypeMeta> = {
  easy: { label: "Easy", icon: Wind, badgeVariant: "easy", colorVar: "var(--easy)" },
  tempo: { label: "Tempo", icon: Flame, badgeVariant: "tempo", colorVar: "var(--tempo)" },
  interval: { label: "Intervals", icon: Zap, badgeVariant: "interval", colorVar: "var(--interval)" },
  long_run: { label: "Long Run", icon: Route, badgeVariant: "long_run", colorVar: "var(--long-run)" },
  rest: { label: "Rest", icon: Bed, badgeVariant: "rest", colorVar: "var(--rest)" },
  race: { label: "Race", icon: Trophy, badgeVariant: "race", colorVar: "var(--race)" },
  recovery: { label: "Recovery", icon: Leaf, badgeVariant: "recovery", colorVar: "var(--recovery)" },
};

export function workoutTypeMeta(type: WorkoutType): WorkoutTypeMeta {
  return WORKOUT_TYPE_META[type] ?? WORKOUT_TYPE_META.easy;
}
