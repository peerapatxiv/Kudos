import { getRaceByPriority } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaceCalculator } from "@/components/pace/pace-calculator";
import { PaceZoneCard } from "@/components/pace/pace-zone-card";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { daysUntil } from "@/lib/training/dates";
import { secondsToPaceText, formatDuration } from "@/lib/training/pace";
import { format } from "date-fns";
import { Flag } from "lucide-react";

export default async function ARacePage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const race = await getRaceByPriority("a_race");
  if (!race) {
    return <EmptyState icon={Flag} title="A-race not found" description="Run the seed script to import the plan." />;
  }

  const days = daysUntil(race.date);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Badge variant="a-race">A-RACE</Badge>
        <span className="text-xs text-muted">{days} days to go</span>
        <div className="ml-auto">
          <EditRaceDialog race={race} />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{race.name}</h1>
        <p className="text-sm text-muted">{format(new Date(`${race.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <Card className="border-a-race/30">
        <CardContent className="grid grid-cols-3 gap-3 pt-5 text-center">
          <Metric label="Distance" value={`${race.distance_km} km`} />
          <Metric label="Goal" value={race.goal_time_seconds ? formatDuration(race.goal_time_seconds) : "—"} accent />
          <Metric
            label="Goal pace"
            value={race.goal_pace_seconds_per_km ? `${secondsToPaceText(race.goal_pace_seconds_per_km)}/km` : "—"}
            accent
          />
        </CardContent>
      </Card>

      {race.notes && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Race plan</p>
            <p className="mt-1 text-sm text-foreground">{race.notes}</p>
          </CardContent>
        </Card>
      )}

      <PaceCalculator
        defaultDistanceKm={race.distance_km}
        defaultPaceText={race.goal_pace_seconds_per_km ? secondsToPaceText(race.goal_pace_seconds_per_km) : "4:30"}
        markers={[5, 10, 15, 20, race.distance_km]}
      />

      <PaceZoneCard />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${accent ? "text-a-race" : "text-foreground"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
