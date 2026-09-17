"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertDailyLog } from "@/lib/training/actions";
import type { DailyLog } from "@/lib/training/types";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS = [
  { key: "sleepQuality", label: "Sleep quality" },
  { key: "fatigue", label: "Fatigue" },
  { key: "soreness", label: "Soreness" },
  { key: "motivation", label: "Motivation" },
] as const;

export function DailyLogForm({ date, initial }: { date: string; initial: DailyLog | null }) {
  const [values, setValues] = useState({
    sleepQuality: initial?.sleep_quality ?? 0,
    fatigue: initial?.fatigue ?? 0,
    soreness: initial?.soreness ?? 0,
    motivation: initial?.motivation ?? 0,
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await upsertDailyLog({
        date,
        sleepQuality: values.sleepQuality || null,
        fatigue: values.fatigue || null,
        soreness: values.soreness || null,
        motivation: values.motivation || null,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you feeling today?</CardTitle>
        <CardDescription>Optional — 1 (low) to 5 (high). Never required to use the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{field.label}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [field.key]: n }))}
                  className={cn(
                    "h-7 w-7 rounded-full border text-xs font-medium transition-colors",
                    values[field.key] === n
                      ? "border-a-race bg-a-race text-a-race-foreground"
                      : "border-border text-muted hover:bg-surface-2",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

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
