"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/phases/color-picker";
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
  const [color, setColor] = useState(phase.color || "rest");
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
        color,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit phase</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="phase-label" className="text-sm font-medium">Phase name</Label>
            <Input
              id="phase-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Build"
              className="h-9"
            />
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duration</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">From</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">To</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="phase-desc" className="text-sm font-medium">Description</Label>
            <textarea
              id="phase-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 resize-none"
              placeholder="What's the focus of this phase?"
            />
          </div>

          {/* Color */}
          <ColorPicker value={color} onChange={setColor} />

          {/* Error */}
          {error && (
            <div className="rounded-md bg-danger/10 border border-danger/20 p-3">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 h-9"
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
