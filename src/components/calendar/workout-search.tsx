"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import type { Workout } from "@/lib/training/types";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import { secondsToPaceText } from "@/lib/training/pace";
import { format } from "date-fns";

interface WorkoutSearchProps {
  workouts: Workout[];
  onSelectDate?: (date: string) => void;
}

export function WorkoutSearch({ workouts, onSelectDate }: WorkoutSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    return workouts
      .filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.notes?.toLowerCase().includes(q) ||
          workoutTypeMeta(w.workout_type).label.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [query, workouts]);

  const handleSelect = (date: string) => {
    router.push(`/calendar?date=${date}`);
    onSelectDate?.(date);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search workouts..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && query && filtered.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {filtered.map((w) => {
                const meta = workoutTypeMeta(w.workout_type);
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelect(w.date)}
                    className="w-full border-b border-border px-4 py-2.5 text-left hover:bg-surface/50 transition-colors last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      <meta.icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: meta.colorVar }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{w.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted">{format(new Date(`${w.date}T00:00:00`), "MMM d")}</p>
                          {w.distance_km && <p className="text-xs text-muted">{w.distance_km} km</p>}
                          {w.actual_pace_seconds_per_km && (
                            <p className="text-xs text-muted">{secondsToPaceText(w.actual_pace_seconds_per_km)}/km</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {open && query && filtered.length === 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <CardContent className="p-4 text-center text-sm text-muted">No workouts found</CardContent>
        </Card>
      )}
    </div>
  );
}
