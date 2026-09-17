import { getRaces } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RaceCountdownCard } from "@/components/dashboard/race-countdown";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Flag } from "lucide-react";
import { format } from "date-fns";

const HREF: Record<string, string> = { a_race: "/races/a-race", secondary: "/races/singapore" };

export default async function RacesPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const racesResult = await getRaces();
  if (racesResult.status !== "ok") {
    return <EmptyState title="Couldn't load races" description="Refresh to try again." />;
  }
  const races = racesResult.data;
  if (races.length === 0) {
    return <EmptyState icon={Flag} title="No races yet" description="Run the seed script to import the plan." />;
  }

  const tuneUp = races.find((r) => r.priority === "tune_up");

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Races</h1>
        <p className="text-sm text-muted">Two-race block, 8 days apart.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {races
          .filter((r) => r.priority !== "tune_up")
          .map((race) => (
            <RaceCountdownCard key={race.id} race={race} href={HREF[race.priority] ?? "/races"} />
          ))}
      </div>

      {tuneUp && (
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-tune-up">Tune-up race</p>
              <p className="text-sm font-medium text-foreground">{tuneUp.name}</p>
              <p className="text-xs text-muted">
                {format(new Date(`${tuneUp.date}T00:00:00`), "MMM d, yyyy")} · {tuneUp.distance_km} km
              </p>
            </div>
            <Link href="/calendar" className="text-xs font-medium text-a-race underline underline-offset-2">
              View on calendar
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
