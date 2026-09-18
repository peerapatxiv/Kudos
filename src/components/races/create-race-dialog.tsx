"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRace } from "@/lib/training/actions";
import { parseDurationToSeconds, paceTextToSeconds } from "@/lib/training/pace";
import type { RacePriority } from "@/lib/training/types";
import { Plus } from "lucide-react";

export function CreateRaceDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [distance, setDistance] = useState("");
  const [priority, setPriority] = useState<RacePriority>("other");
  const [goalTime, setGoalTime] = useState("");
  const [goalPace, setGoalPace] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDate("");
    setDistance("");
    setPriority("other");
    setGoalTime("");
    setGoalPace("");
    setNotes("");
    setError(null);
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Race name can't be blank.");
        return;
      }
      if (!date) {
        setError("Pick a date.");
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

      const result = await createRace({
        name: trimmedName,
        date,
        distanceKm,
        priority,
        goalTimeSeconds,
        goalPaceSecondsPerKm,
        notes: notes || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not add this race.");
        return;
      }
      reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add race
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add race</DialogTitle>
            <DialogDescription>Any race on your calendar — including the A-race or Race of the Year.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-race-name">Name</Label>
              <Input
                id="new-race-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="10K Tune-up"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-race-date">Date</Label>
                <Input id="new-race-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-race-distance">Distance (km)</Label>
                <Input
                  id="new-race-distance"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-race-priority">Type</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RacePriority)}>
                <SelectTrigger id="new-race-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_race">A-Race</SelectItem>
                  <SelectItem value="secondary">Race of the Year</SelectItem>
                  <SelectItem value="tune_up">Tune-up race</SelectItem>
                  <SelectItem value="other">Other race</SelectItem>
                </SelectContent>
              </Select>
              {(priority === "a_race" || priority === "secondary") && (
                <p className="text-xs text-muted">
                  Any race currently set as {priority === "a_race" ? "the A-race" : "Race of the Year"} will switch
                  to &ldquo;Other race&rdquo;.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-race-goal-time">Goal time (h:mm:ss)</Label>
                <Input
                  id="new-race-goal-time"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  placeholder="1:45:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-race-goal-pace">Goal pace (m:ss/km)</Label>
                <Input
                  id="new-race-goal-pace"
                  value={goalPace}
                  onChange={(e) => setGoalPace(e.target.value)}
                  placeholder="4:58"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-race-notes">Notes</Label>
              <textarea
                id="new-race-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
                placeholder="Pacing plan, why you're doing this race, etc."
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleCreate} disabled={pending}>
                {pending ? "Adding…" : "Add race"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
