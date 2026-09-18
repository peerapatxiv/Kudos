import { Card, CardContent } from "@/components/ui/card";
import type { BodyMetric } from "@/lib/training/types";
import { format } from "date-fns";

export function BodyMetricsSummary({ metric }: { metric: BodyMetric }) {
  const stats = [
    metric.weight_kg != null && { label: "Weight", value: `${metric.weight_kg} kg` },
    metric.resting_hr != null && { label: "Resting HR", value: `${metric.resting_hr} bpm` },
    metric.vo2max != null && { label: "VO2max", value: String(metric.vo2max) },
  ].filter((s): s is { label: string; value: string } => s !== false);

  if (stats.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div className="flex gap-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold tabular-nums text-foreground">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="whitespace-nowrap text-xs text-muted">
          as of {format(new Date(`${metric.date}T00:00:00`), "MMM d")}
        </p>
      </CardContent>
    </Card>
  );
}
