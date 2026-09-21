export interface HrZone {
  id: string;
  label: string;
  percentLow: number;
  percentHigh: number;
  description: string;
}

export const HR_ZONES: HrZone[] = [
  {
    id: "recovery",
    label: "Recovery",
    percentLow: 50,
    percentHigh: 60,
    description: "Very light effort. Active recovery, walking, or easy spinning.",
  },
  {
    id: "easy",
    label: "Easy/Aerobic",
    percentLow: 60,
    percentHigh: 70,
    description: "Conversational, sustainable pace. Bulk of aerobic training.",
  },
  {
    id: "tempo",
    label: "Tempo/Threshold",
    percentLow: 70,
    percentHigh: 80,
    description: "Comfortably hard. Lactate threshold training zone.",
  },
  {
    id: "vo2max",
    label: "Interval/VO2max",
    percentLow: 80,
    percentHigh: 90,
    description: "Hard effort with intervals. Builds maximum aerobic capacity.",
  },
  {
    id: "maximum",
    label: "Maximum",
    percentLow: 90,
    percentHigh: 100,
    description: "All-out effort. Only used for short intervals and races.",
  },
];

export function calculateHrZoneRange(maxHr: number, zone: HrZone): { low: number; high: number } {
  return {
    low: Math.round(maxHr * (zone.percentLow / 100)),
    high: Math.round(maxHr * (zone.percentHigh / 100)),
  };
}
