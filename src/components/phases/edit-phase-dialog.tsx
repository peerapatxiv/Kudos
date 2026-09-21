"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePhase } from "@/lib/training/actions";
import type { PhaseDefinition } from "@/lib/training/phases";
import { format, parse } from "date-fns";

export function EditPhaseDialog({
  phase,
  open,
  onOpenChange,
}: {
  phase: PhaseDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState(phase.label);
  const [description, setDescription] = useState(phase.description);
  const [startDate, setStartDate] = useState(phase.startDate);
  const [endDate, setEndDate] = useState(phase.endDate);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    if (!startDate || !endDate) {
      setError("Both start and end dates are required.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date must be before end date.");
      return;
    }

    startTransition(async () => {
      const result = await updatePhase({
        id: phase.id,
        label,
        description,
        startDate,
        endDate,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not save changes.");
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit phase</DialogTitle>
          <DialogDescription>{phase.label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phase-label">Label</Label>
            <Input
              id="phase-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Phase label"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phase-start">Start date</Label>
              <Input
                id="phase-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phase-end">End date</Label>
              <Input
                id="phase-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phase-desc">Description</Label>
            <textarea
              id="phase-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
              placeholder="Phase description"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
