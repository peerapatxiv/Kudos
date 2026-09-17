"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { WorkoutCard } from "@/components/workouts/workout-card";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import type { Workout } from "@/lib/training/types";

export function LogList({ workouts }: { workouts: Workout[] }) {
  const [active, setActive] = useState<Workout | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, Workout[]>();
    for (const w of workouts) {
      const label = format(new Date(`${w.date}T00:00:00`), "'Week of' MMM d");
      const list = groups.get(label) ?? [];
      list.push(w);
      groups.set(label, list);
    }
    return groups;
  }, [workouts]);

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([label, items]) => (
        <div key={label} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <div className="space-y-2">
            {items.map((w) =>
              w.is_rest_day ? (
                <WorkoutCard key={w.id} workout={w} dense />
              ) : (
                <button key={w.id} onClick={() => setActive(w)} className="block w-full text-left">
                  <WorkoutCard workout={w} dense />
                </button>
              ),
            )}
          </div>
        </div>
      ))}

      {active && <WorkoutLogger workout={active} open={!!active} onOpenChange={(open) => !open && setActive(null)} />}
    </div>
  );
}
