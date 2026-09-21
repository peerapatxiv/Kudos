"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/phases/color-picker";
import { createPhase, deletePhase } from "@/lib/training/actions";
import type { PhaseDefinition } from "@/lib/training/phases";
import { Plus, Trash2, AlertCircle } from "lucide-react";

export function PhaseManagement({ phases }: { phases: PhaseDefinition[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newPhase, setNewPhase] = useState({
    id: "",
    label: "",
    description: "",
    startDate: "",
    endDate: "",
    color: "rest",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const handleAddPhase = async () => {
    setError(null);

    if (!newPhase.id || !newPhase.label || !newPhase.startDate || !newPhase.endDate) {
      setError("All fields are required.");
      return;
    }

    if (newPhase.startDate > newPhase.endDate) {
      setError("Start date must be before end date.");
      return;
    }

    if (phases.some((p) => p.id === newPhase.id)) {
      setError("Phase ID already exists.");
      return;
    }

    setPending(true);
    const result = await createPhase({
      id: newPhase.id,
      label: newPhase.label,
      description: newPhase.description,
      startDate: newPhase.startDate,
      endDate: newPhase.endDate,
      color: newPhase.color,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create phase.");
    } else {
      setAddOpen(false);
      setNewPhase({ id: "", label: "", description: "", startDate: "", endDate: "", color: "rest" });
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    setPending(true);
    const result = await deletePhase(phaseId);
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to delete phase.");
    } else {
      setToDelete(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Phases</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add phase
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {phases.map((phase) => (
          <div key={phase.id} className="relative group">
            {/* Phase card content will be passed via children */}
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setToDelete(phase.id)}
                className="h-6 w-6 p-0 text-danger hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add phase dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create new phase</DialogTitle>
            <DialogDescription>Define a training phase with custom dates and color</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Phase basics */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phase-id" className="text-sm font-medium">Phase ID</Label>
                  <Input
                    id="phase-id"
                    value={newPhase.id}
                    onChange={(e) => setNewPhase({ ...newPhase, id: e.target.value })}
                    placeholder="e.g., base"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phase-label" className="text-sm font-medium">Phase name</Label>
                  <Input
                    id="phase-label"
                    value={newPhase.label}
                    onChange={(e) => setNewPhase({ ...newPhase, label: e.target.value })}
                    placeholder="e.g., Base building"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Duration</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Start date</label>
                  <Input
                    type="date"
                    value={newPhase.startDate}
                    onChange={(e) => setNewPhase({ ...newPhase, startDate: e.target.value })}
                    className="h-10 rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 focus-visible:border-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">End date</label>
                  <Input
                    type="date"
                    value={newPhase.endDate}
                    onChange={(e) => setNewPhase({ ...newPhase, endDate: e.target.value })}
                    className="h-10 rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 focus-visible:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="phase-desc" className="text-sm font-medium">Description</Label>
              <textarea
                id="phase-desc"
                value={newPhase.description}
                onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 resize-none"
                placeholder="Describe the focus of this training phase..."
              />
            </div>

            {/* Color picker */}
            <ColorPicker value={newPhase.color} onChange={(color) => setNewPhase({ ...newPhase, color })} />

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-10"
                onClick={() => setAddOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 h-10"
                onClick={handleAddPhase}
                disabled={pending}
              >
                {pending ? "Creating…" : "Create phase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete phase</DialogTitle>
            <DialogDescription>This action cannot be undone</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted">
            Are you sure you want to delete this phase? All workouts and weeks associated with it will be affected.
          </p>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => setToDelete(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 h-10"
              onClick={() => toDelete && handleDeletePhase(toDelete)}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
