"use client";

import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateTrainingZones, type ActionResult } from "@/lib/training/actions";
import type { HrZoneOverrides, PaceZoneOverrides } from "@/lib/training/zones";

export interface EditableZone {
  id: string;
  label: string;
  colorClass: string;
  low: string;
  high: string;
}

type Values = Record<string, { low: string; high: string }>;

function ZoneEditor({
  title,
  description,
  unit,
  zones,
  lowPlaceholder,
  highPlaceholder,
  onSave,
  onReset,
}: {
  title: string;
  description: string;
  unit: string;
  zones: EditableZone[];
  lowPlaceholder: string;
  highPlaceholder: string;
  onSave: (values: Values) => Promise<ActionResult>;
  onReset: () => Promise<ActionResult>;
}) {
  const initial = (): Values => Object.fromEntries(zones.map((z) => [z.id, { low: z.low, high: z.high }]));
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValues(initial());
      setError(null);
    }
    setOpen(next);
  };

  const update = (id: string, field: "low" | "high", value: string) =>
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Could not save zones.");
        return;
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title={title} aria-label={title}>
          <PencilLine className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => onSave(values));
          }}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
              <span>Zone</span>
              <span>Low</span>
              <span>High</span>
            </div>
            {zones.map((zone) => (
              <div key={zone.id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2">
                <label htmlFor={`zone-${zone.id}-low`} className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", zone.colorClass)} />
                  <span className="truncate">{zone.label}</span>
                </label>
                <Input
                  id={`zone-${zone.id}-low`}
                  aria-label={`${zone.label} low (${unit})`}
                  className="text-center tabular-nums"
                  value={values[zone.id]?.low ?? ""}
                  placeholder={lowPlaceholder}
                  disabled={pending}
                  onChange={(e) => update(zone.id, "low", e.target.value)}
                />
                <Input
                  aria-label={`${zone.label} high (${unit})`}
                  className="text-center tabular-nums"
                  value={values[zone.id]?.high ?? ""}
                  placeholder={highPlaceholder}
                  disabled={pending}
                  onChange={(e) => update(zone.id, "high", e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(onReset)}>
              Reset to default
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditHrZonesButton({ zones }: { zones: EditableZone[] }) {
  const save = async (values: Values) => {
    const overrides: HrZoneOverrides = {};
    for (const [id, { low, high }] of Object.entries(values)) {
      if (!low.trim() && !high.trim()) continue; // blank row = keep the default
      if (!low.trim() || !high.trim()) {
        return { ok: false, error: "Fill in both low and high, or leave the zone blank." };
      }
      overrides[id] = { low: Number(low), high: Number(high) };
    }
    return updateTrainingZones({ hrZones: overrides });
  };

  return (
    <ZoneEditor
      title="Edit heart rate zones"
      description="Set each zone in beats per minute. Leave a zone blank to use the default from your max HR."
      unit="bpm"
      zones={zones}
      lowPlaceholder="120"
      highPlaceholder="140"
      onSave={save}
      onReset={() => updateTrainingZones({ hrZones: null })}
    />
  );
}

export function EditPaceZonesButton({ zones }: { zones: EditableZone[] }) {
  const save = async (values: Values) => {
    const overrides: PaceZoneOverrides = {};
    for (const [id, { low, high }] of Object.entries(values)) {
      if (!low.trim()) {
        if (high.trim()) return { ok: false, error: "Fill in the low pace, or clear the zone." };
        continue;
      }
      overrides[id] = { low: low.trim(), high: high.trim() || null };
    }
    return updateTrainingZones({ paceZones: overrides });
  };

  return (
    <ZoneEditor
      title="Edit pace zones"
      description="Paces are min:sec per km, e.g. 5:15. Leave High blank for a single target pace."
      unit="/km"
      zones={zones}
      lowPlaceholder="5:15"
      highPlaceholder="—"
      onSave={save}
      onReset={() => updateTrainingZones({ paceZones: null })}
    />
  );
}
