"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRace } from "@/lib/training/actions";
import { formatDuration, parseDurationToSeconds, paceTextToSeconds, secondsToPaceText } from "@/lib/training/pace";
import type { Race } from "@/lib/training/types";
import { PencilLine } from "lucide-react";

export function EditRaceDialog({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(race.name);
  const [date, setDate] = useState(race.date);
  const [distance, setDistance] = useState(String(race.distance_km));
  const [goalTime, setGoalTime] = useState(
    race.goal_time_seconds != null ? formatDuration(race.goal_time_seconds) : "",
  );
  const [goalPace, setGoalPace] = useState(
    race.goal_pace_seconds_per_km != null ? secondsToPaceText(race.goal_pace_seconds_per_km) : "",
  );
  const [notes, setNotes] = useState(race.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Race name can't be blank.");
        return;
      }

      const distanceKm = Number(distance);
      if (Number.isNaN(distanceKm) || distanceKm <= 0) {
        setError("Enter a distance greater than 0.");
        return;
      }

      const trimmedGoalTime = goalTime.trim();
      const goalTimeSeconds = trimmedGoalTime === "" ? null : parseDurationToSeconds(trimmedGoalTime);
      if (trimmedGoalTime !== "" && goalTimeSeconds === null) {
        setError("Enter goal time as mm:ss or h:mm:ss.");
        return;
      }
      if (goalTimeSeconds !== null && goalTimeSeconds <= 0) {
        setError("Goal time must be greater than 0.");
        return;
      }

      const trimmedGoalPace = goalPace.trim();
      const goalPaceSecondsPerKm = trimmedGoalPace === "" ? null : paceTextToSeconds(trimmedGoalPace);
      if (trimmedGoalPace !== "" && goalPaceSecondsPerKm === null) {
        setError("Enter goal pace as m:ss.");
        return;
      }
      if (goalPaceSecondsPerKm !== null && goalPaceSecondsPerKm <= 0) {
        setError("Goal pace must be greater than 0.");
        return;
      }

      const result = await updateRace({
        raceId: race.id,
        name: trimmedName,
        date,
        distanceKm,
        goalTimeSeconds,
        goalPaceSecondsPerKm,
        notes: notes || null,
      });
      if (!result.ok) setError(result.error ?? "Could not save changes.");
      else setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="Edit race">
        <PencilLine className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit race</DialogTitle>
            <DialogDescription>{race.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="race-name">Name</Label>
              <Input id="race-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="race-date">Date</Label>
                <Input id="race-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="race-distance">Distance (km)</Label>
                <Input
                  id="race-distance"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="race-goal-time">Goal time (h:mm:ss)</Label>
                <Input
                  id="race-goal-time"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  placeholder="1:45:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="race-goal-pace">Goal pace (m:ss/km)</Label>
                <Input
                  id="race-goal-pace"
                  value={goalPace}
                  onChange={(e) => setGoalPace(e.target.value)}
                  placeholder="4:58"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="race-notes">Race plan notes</Label>
              <textarea
                id="race-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="Pacing plan, fueling notes, etc."
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSave} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
