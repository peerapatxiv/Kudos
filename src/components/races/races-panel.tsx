import { Flag } from "lucide-react";
import { RaceDetailDialog } from "@/components/races/race-detail-dialog";
import { CreateRaceDialog } from "@/components/races/create-race-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import type { Race, Workout } from "@/lib/training/types";

export function RacesPanel({ races, workouts }: { races: Race[]; workouts: Workout[] }) {
  const aRaceDate = races.find((r) => r.priority === "a_race")?.date;

  return (
    <div className="space-y-4">
      {races.length === 0 ? (
        <EmptyState icon={Flag} title="No races yet" description="Add a race to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {races.map((race) => (
            <RaceDetailDialog key={race.id} race={race} workouts={workouts} aRaceDate={aRaceDate} />
          ))}
        </div>
      )}

      <CreateRaceDialog />
    </div>
  );
}
