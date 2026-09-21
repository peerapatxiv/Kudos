"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/phases/color-picker";
import { createPhase } from "@/lib/training/actions";
import { Plus } from "lucide-react";

export function AddPhaseButton() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState({
    id: "",
    label: "",
    description: "",
    startDate: "",
    endDate: "",
    color: "rest",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleAdd = async () => {
    setError(null);

    if (!phase.id || !phase.label || !phase.startDate || !phase.endDate) {
      setError("All fields are required.");
      return;
    }

    if (phase.startDate > phase.endDate) {
      setError("Start date must be before end date.");
      return;
    }

    setPending(true);
    const result = await createPhase({
      id: phase.id,
      label: phase.label,
      description: phase.description,
      startDate: phase.startDate,
      endDate: phase.endDate,
      color: phase.color,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create phase.");
    } else {
      setOpen(false);
      setPhase({ id: "", label: "", description: "", startDate: "", endDate: "", color: "rest" });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Plus className="h-4 w-4" />
        Add phase
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add new phase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phase-id" className="text-sm font-medium">Phase ID</Label>
              <Input
                id="phase-id"
                value={phase.id}
                onChange={(e) => setPhase({ ...phase, id: e.target.value })}
                placeholder="e.g., base, build, peak"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase-label" className="text-sm font-medium">Phase name</Label>
              <Input
                id="phase-label"
                value={phase.label}
                onChange={(e) => setPhase({ ...phase, label: e.target.value })}
                placeholder="e.g., Base building"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">From</label>
                  <Input
                    type="date"
                    value={phase.startDate}
                    onChange={(e) => setPhase({ ...phase, startDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">To</label>
                  <Input
                    type="date"
                    value={phase.endDate}
                    onChange={(e) => setPhase({ ...phase, endDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase-desc" className="text-sm font-medium">Description</Label>
              <textarea
                id="phase-desc"
                value={phase.description}
                onChange={(e) => setPhase({ ...phase, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 resize-none"
                placeholder="Phase description..."
              />
            </div>

            <ColorPicker value={phase.color} onChange={(color) => setPhase({ ...phase, color })} />

            {error && (
              <div className="rounded-md bg-danger/10 border border-danger/20 p-3">
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 h-9"
                onClick={handleAdd}
                disabled={pending}
              >
                {pending ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
