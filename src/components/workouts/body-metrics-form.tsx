"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { upsertBodyMetric } from "@/lib/training/actions";
import type { BodyMetric } from "@/lib/training/types";
import { CheckCircle2 } from "lucide-react";

export function BodyMetricsForm({ date, initial }: { date: string; initial: BodyMetric | null }) {
  const [weight, setWeight] = useState(initial?.weight_kg != null ? String(initial.weight_kg) : "");
  const [restingHr, setRestingHr] = useState(initial?.resting_hr != null ? String(initial.resting_hr) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await upsertBodyMetric({
        date,
        weightKg: weight.trim() === "" ? null : Number(weight),
        restingHr: restingHr.trim() === "" ? null : Number(restingHr),
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body metrics</CardTitle>
        <CardDescription>Optional — never required to use the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="weight-kg">Weight (kg)</Label>
            <Input
              id="weight-kg"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="68.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resting-hr">Resting HR</Label>
            <Input
              id="resting-hr"
              inputMode="numeric"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="52"
            />
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything else worth noting?"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40"
        />

        <Button variant="outline" className="w-full" onClick={handleSave} disabled={pending}>
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" /> Saved
            </>
          ) : pending ? (
            "Saving…"
          ) : (
            "Save"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
