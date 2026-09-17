import { getAllWorkouts, getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecoveryBridge } from "@/components/races/recovery-bridge";
import { daysUntil, daysBetween } from "@/lib/training/dates";
import { format } from "date-fns";
import { Flag, CheckCircle2 } from "lucide-react";

const GUIDANCE = [
  "Start conservative",
  "Run by feel",
  "Slow down if legs are not recovered",
  "No 3:30 split chasing",
  "Recovery is the priority",
];

export default async function SingaporePage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [race, workoutsResult] = await Promise.all([getRaceByPriority("secondary"), getAllWorkouts()]);
  if (!race) {
    return <EmptyState icon={Flag} title="Race not found" description="Run the seed script to import the plan." />;
  }

  const days = daysUntil(race.date);
  const gap = daysBetween("2026-11-28", race.date);
  const workouts = workoutsResult.status === "ok" ? workoutsResult.data : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">SECONDARY / RECOVERY EFFORT</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{race.name}</h1>
        <p className="text-sm text-muted">{format(new Date(`${race.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <Card className="border-secondary-race/30 bg-secondary-race/5">
        <CardContent className="pt-5 space-y-2">
          <p className="text-sm text-foreground">
            This race comes only <strong>{gap} days</strong> after the half marathon. Treat it as a recovery-pace
            effort rather than another fresh marathon performance attempt.
          </p>
          <div className="flex items-baseline gap-4 pt-1">
            <span className="text-sm text-muted">
              Distance <strong className="text-foreground">{race.distance_km} km</strong>
            </span>
            <span className="text-sm text-muted">
              Suggested start <strong className="text-foreground">4:50–5:00/km</strong>
            </span>
          </div>
          <p className="text-xs text-muted">Guidance, not a strict target — run by feel from the gun.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">On race day</p>
          <ul className="space-y-2">
            {GUIDANCE.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-race" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Recovery Bridge</h2>
        <RecoveryBridge workouts={workouts} />
      </div>
    </div>
  );
}
