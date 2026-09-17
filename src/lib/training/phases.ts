import type { TrainingPhaseId } from "./types";
import { daysBetween } from "./dates";

export interface PhaseDefinition {
  id: TrainingPhaseId;
  label: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const PHASES: PhaseDefinition[] = [
  {
    id: "lead_in",
    label: "Lead-in",
    startDate: "2026-09-17",
    endDate: "2026-09-21",
    description:
      "Easing into the plan. Controlled MP-pace and easy running — not yet race preparation.",
  },
  {
    id: "base",
    label: "Base",
    startDate: "2026-09-22",
    endDate: "2026-10-05",
    description:
      "Aerobic foundation: speed touches, tempo, and a steadily growing long run.",
  },
  {
    id: "build",
    label: "Build",
    startDate: "2026-10-06",
    endDate: "2026-11-02",
    description:
      "Half-marathon-pace repeats and longer tempos layered onto a growing long run.",
  },
  {
    id: "peak",
    label: "Peak",
    startDate: "2026-11-03",
    endDate: "2026-11-16",
    description:
      "Highest training load of the block — longest runs and sharpest race-pace work.",
  },
  {
    id: "taper",
    label: "Taper",
    startDate: "2026-11-17",
    endDate: "2026-11-28",
    description:
      "Volume drops, intensity stays sharp. Includes the Khao Yai tune-up race before the A-race.",
  },
  {
    id: "recovery_bridge",
    label: "Recovery Bridge",
    startDate: "2026-11-29",
    endDate: "2026-12-06",
    description:
      "8 days between the half marathon and the full marathon. Do not add fitness here — recover.",
  },
];

export function phaseForDate(isoDate: string): PhaseDefinition | null {
  return (
    PHASES.find(
      (phase) => daysBetween(phase.startDate, isoDate) >= 0 && daysBetween(isoDate, phase.endDate) >= 0,
    ) ?? null
  );
}

export function phaseById(id: TrainingPhaseId): PhaseDefinition | undefined {
  return PHASES.find((phase) => phase.id === id);
}
