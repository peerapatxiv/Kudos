import { Card, CardContent } from "@/components/ui/card";
import type { BodyMetric, Profile } from "@/lib/training/types";
import { format } from "date-fns";

export function BodyMetricsSummary({ metric, profile }: { metric: BodyMetric | null; profile: Profile | null }) {
  const heightCm = profile?.height_cm ?? null;
  const bmi =
    metric?.weight_kg != null && heightCm != null
      ? metric.weight_kg / (heightCm / 100) ** 2
      : null;

  const stats = [
    metric?.weight_kg != null && { label: "Weight", value: `${metric.weight_kg} kg` },
    heightCm != null && { label: "Height", value: `${heightCm} cm` },
    bmi != null && { label: "BMI", value: bmi.toFixed(1) },
    metric?.resting_hr != null && { label: "Resting HR", value: `${metric.resting_hr} bpm` },
    metric?.vo2max != null && { label: "VO2max", value: String(metric.vo2max) },
  ].filter((s): s is { label: string; value: string } => s !== false);

  if (stats.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex flex-wrap gap-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold tabular-nums text-foreground">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        {metric && (
          <p className="whitespace-nowrap text-xs text-muted">
            as of {format(new Date(`${metric.date}T00:00:00`), "MMM d")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
