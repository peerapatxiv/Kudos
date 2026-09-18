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
  const [vo2max, setVo2max] = useState(initial?.vo2max != null ? String(initial.vo2max) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedWeight = weight.trim();
      const weightKg = trimmedWeight === "" ? null : Number(trimmedWeight);
      if (weightKg !== null && Number.isNaN(weightKg)) {
        setError("Enter a valid weight, or leave it blank.");
        return;
      }

      const trimmedHr = restingHr.trim();
      const restingHrValue = trimmedHr === "" ? null : Number(trimmedHr);
      if (restingHrValue !== null && Number.isNaN(restingHrValue)) {
        setError("Enter a valid resting HR, or leave it blank.");
        return;
      }

      const trimmedVo2max = vo2max.trim();
      const vo2maxValue = trimmedVo2max === "" ? null : Number(trimmedVo2max);
      if (vo2maxValue !== null && Number.isNaN(vo2maxValue)) {
        setError("Enter a valid VO2max, or leave it blank.");
        return;
      }

      const result = await upsertBodyMetric({
        date,
        weightKg,
        restingHr: restingHrValue,
        vo2max: vo2maxValue,
        notes: notes || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save body metrics.");
        return;
      }
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="vo2max">VO2max</Label>
            <Input
              id="vo2max"
              inputMode="decimal"
              value={vo2max}
              onChange={(e) => setVo2max(e.target.value)}
              placeholder="52.0"
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

        {error && <p className="text-xs text-danger">{error}</p>}

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
