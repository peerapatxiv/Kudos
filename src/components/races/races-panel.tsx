import { Flag } from "lucide-react";
import { RaceDetailDialog } from "@/components/races/race-detail-dialog";
import { CreateRaceDialog } from "@/components/races/create-race-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import type { Race } from "@/lib/training/types";

export function RacesPanel({ races }: { races: Race[] }) {
  return (
    <div className="space-y-4">
      {races.length === 0 ? (
        <EmptyState icon={Flag} title="No races yet" description="Add a race to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {races.map((race) => (
            <RaceDetailDialog key={race.id} race={race} />
          ))}
        </div>
      )}

      <CreateRaceDialog />
    </div>
  );
}
