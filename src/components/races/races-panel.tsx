import { format } from "date-fns";
import { Flag } from "lucide-react";
import { RaceCountdownCard } from "@/components/dashboard/race-countdown";
import { EditRaceDialog } from "@/components/races/edit-race-dialog";
import { CreateRaceDialog } from "@/components/races/create-race-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import type { Race } from "@/lib/training/types";

const HREF: Record<string, string> = { a_race: "/races/a-race", secondary: "/races/singapore" };

export function RacesPanel({ races }: { races: Race[] }) {
  const primary = races.filter((r) => r.priority === "a_race" || r.priority === "secondary");
  const manageable = races.filter((r) => r.priority !== "a_race" && r.priority !== "secondary");

  return (
    <div className="space-y-4">
      {primary.length === 0 && manageable.length === 0 ? (
        <EmptyState icon={Flag} title="No races yet" description="Add a race to get started." />
      ) : (
        <>
          {primary.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {primary.map((race) => (
                <RaceCountdownCard key={race.id} race={race} href={HREF[race.priority] ?? "/calendar"} />
              ))}
            </div>
          )}

          {manageable.map((race) => (
            <Card key={race.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-tune-up">
                    {race.priority === "tune_up" ? "Tune-up race" : "Race"}
                  </p>
                  <p className="text-sm font-medium text-foreground">{race.name}</p>
                  <p className="text-xs text-muted">
                    {format(new Date(`${race.date}T00:00:00`), "MMM d, yyyy")} · {race.distance_km} km
                  </p>
                </div>
                <EditRaceDialog race={race} />
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <CreateRaceDialog />
    </div>
  );
}
