"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { WorkoutDetailContent } from "@/components/workouts/workout-detail-content";
import { QuickAddWorkoutDialog } from "@/components/calendar/quick-add-workout-dialog";
import { createQuickWorkout, moveWorkout } from "@/lib/training/actions";
import { workoutTypeMeta } from "@/components/workouts/workout-meta";
import type { Race, Workout, WorkoutInterval } from "@/lib/training/types";
import { todayIso } from "@/lib/training/dates";
import { cn } from "@/lib/utils";
import { CalendarX2 } from "lucide-react";
import { DRAG_DATA_TYPE, getDragData, allowDrop } from "@/lib/training/drag-drop";

type View = "month" | "week";

export function TrainingCalendar({
  workouts,
  intervalsByWorkout,
  racesById,
}: {
  workouts: Workout[];
  intervalsByWorkout: Map<string, WorkoutInterval[]>;
  racesById: Map<string, Race>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = todayIso();

  const initialDate = searchParams.get("date") ?? today;
  const [view, setView] = useState<View>("month");
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [cursor, setCursor] = useState(new Date(`${initialDate}T00:00:00`));
  const [movingWorkoutId, setMovingWorkoutId] = useState<string | null>(null);
  const [showQuickAddForSelectedDate, setShowQuickAddForSelectedDate] = useState(false);

  // The URL is the source of truth for which day's dialog is open, so it
  // survives back/forward navigation and deep links (e.g. from the dashboard).
  const selectedDate = searchParams.get("date");

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const list = map.get(w.date) ?? [];
      list.push(w);
      map.set(w.date, list);
    }
    return map;
  }, [workouts]);

  const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) ?? [] : [];
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const selectedWorkout = selectedWorkouts[selectedWorkoutIndex] ?? null;

  function selectDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.replace(`/calendar?${params.toString()}`, { scroll: false });
  }

  function closeDialog() {
    router.replace("/calendar", { scroll: false });
  }

  function handleDropWorkout(e: React.DragEvent<HTMLButtonElement>, targetDate: string) {
    e.preventDefault();
    e.stopPropagation();

    const workoutId = getDragData(e);
    if (!workoutId) return;

    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    // Don't move if dropping on same day
    if (workout.date === targetDate) {
      setDragOverDate(null);
      setMovingWorkoutId(null);
      return;
    }

    setMovingWorkoutId(workoutId);
    moveWorkout({ workoutId, newDate: targetDate }).then(() => {
      setMovingWorkoutId(null);
      setDragOverDate(null);
    });
  }

  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (view === "week") setCursor((c) => (delta > 0 ? subWeeks(c, 1) : addWeeks(c, 1)));
      else setCursor((c) => (delta > 0 ? subMonths(c, 1) : addMonths(c, 1)));
    }
    touchStartX.current = null;
  }

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    const result: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) result.push(d);
    return result;
  }, [cursor, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => (view === "week" ? subWeeks(c, 1) : subMonths(c, 1)))}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[7rem] text-center text-sm font-semibold text-foreground sm:min-w-[9rem]">
            {format(cursor, view === "week" ? "'Week of' MMM d" : "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => (view === "week" ? addWeeks(c, 1) : addMonths(c, 1)))}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="grid grid-cols-7 gap-1.5 select-none"
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}

        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const workoutsForDay = workoutsByDate.get(iso) ?? [];
          const inMonth = view === "week" || isSameMonth(day, cursor);
          const isToday = iso === today;
          const isDragOver = dragOverDate === iso;

          return (
            <button
              key={iso}
              draggable={workoutsForDay.length > 0}
              onDragStart={(e) => {
                if (workoutsForDay.length > 0) {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData(DRAG_DATA_TYPE, workoutsForDay[0].id);
                  setMovingWorkoutId(workoutsForDay[0].id);
                }
              }}
              onDragOver={(e) => {
                if (workoutsForDay.length > 0) {
                  allowDrop(e);
                  setDragOverDate(iso);
                }
              }}
              onDragLeave={() => {
                setDragOverDate(null);
              }}
              onDrop={(e) => {
                handleDropWorkout(e, iso);
              }}
              onClick={() => {
                if (workoutsForDay.length > 0) {
                  setSelectedWorkoutIndex(0);
                  selectDate(iso);
                } else {
                  setQuickAddDate(iso);
                }
              }}
              className={cn(
                workoutsForDay.length === 0 && "cursor-pointer hover:border-foreground/30",
                "flex flex-col items-center gap-1 rounded-lg border p-1.5 text-center transition-colors",
                view === "week" ? "min-h-24" : "min-h-16",
                inMonth ? "bg-surface" : "bg-surface/40 opacity-40",
                isToday ? "border-a-race" : "border-border",
                workoutsForDay.some(w => w.is_race) && "ring-1 ring-race/50",
                workoutsForDay.length > 0 && "hover:border-foreground/30 cursor-pointer",
                isDragOver && "bg-primary/10 border-primary",
                movingWorkoutId && workoutsForDay.some(w => w.id === movingWorkoutId) && "opacity-50",
              )}
            >
              <span className={cn("text-xs tabular-nums", isToday ? "font-bold text-a-race" : "text-foreground")}>
                {format(day, "d")}
              </span>
              {workoutsForDay.length > 0 && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {workoutsForDay.map((workout) => {
                    const meta = workoutTypeMeta(workout.workout_type);
                    return (
                      <span
                        key={workout.id}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-xs"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`,
                          color: meta.colorVar,
                        }}
                      >
                        <meta.icon className="h-2.5 w-2.5" />
                      </span>
                    );
                  })}
                </div>
              )}
              {workoutsForDay.length > 1 && (
                <span className="text-xs text-muted">{workoutsForDay.length} workouts</span>
              )}
              {workoutsForDay.some(w => w.completed) && <span className="h-0.5 w-1 rounded-full bg-completed" />}
            </button>
          );
        })}
      </div>

      <QuickAddWorkoutDialog
        date={quickAddDate ?? ""}
        open={!!quickAddDate}
        onOpenChange={(open) => !open && setQuickAddDate(null)}
        onSubmit={async (data) => {
          const result = await createQuickWorkout(data);
          if (!result.ok) {
            alert("Failed to add workout: " + result.error);
          }
        }}
      />

      <Dialog open={!!selectedWorkout} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {selectedWorkout && (
            <div className="space-y-4">
              <WorkoutDetailContent
                workout={selectedWorkout}
                intervals={intervalsByWorkout.get(selectedWorkout.id) ?? []}
                race={selectedWorkout.race_id ? racesById.get(selectedWorkout.race_id) ?? null : null}
                availableRaces={Array.from(racesById.values())}
              />
              {selectedWorkouts.length > 1 && (
                <div className="flex items-center justify-center gap-8 pt-3 border-t border-border">
                  <button
                    onClick={() => setSelectedWorkoutIndex((i) => (i - 1 + selectedWorkouts.length) % selectedWorkouts.length)}
                    className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-medium hover:underline underline-offset-2"
                  >
                    <span>←</span>
                    <span>Prev</span>
                  </button>
                  <span className="text-xs text-muted/60 font-medium tracking-wide">
                    {selectedWorkoutIndex + 1} / {selectedWorkouts.length}
                  </span>
                  <button
                    onClick={() => setSelectedWorkoutIndex((i) => (i + 1) % selectedWorkouts.length)}
                    className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-medium hover:underline underline-offset-2"
                  >
                    <span>Next</span>
                    <span>→</span>
                  </button>
                </div>
              )}
              {selectedDate && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowQuickAddForSelectedDate(true)}
                  >
                    Add another workout
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <QuickAddWorkoutDialog
        date={showQuickAddForSelectedDate && selectedDate ? selectedDate : ""}
        open={showQuickAddForSelectedDate}
        onOpenChange={(open) => !open && setShowQuickAddForSelectedDate(false)}
        onSubmit={async (data) => {
          const result = await createQuickWorkout(data);
          if (!result.ok) {
            alert("Failed to add workout: " + result.error);
          }
          setShowQuickAddForSelectedDate(false);
        }}
      />
    </div>
  );
}
