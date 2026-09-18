import { getAllWorkouts } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LogList } from "@/components/workouts/log-list";
import { todayIso } from "@/lib/training/dates";
import { NotebookPen } from "lucide-react";

export default async function LogPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const today = todayIso();
  const workoutsResult = await getAllWorkouts();

  if (workoutsResult.status !== "ok") {
    return <EmptyState title="Couldn't load your log" description="Refresh to try again." />;
  }

  const workouts = workoutsResult.data;
  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No workouts yet"
        description="Run the seed script to import the training plan into Supabase."
      />
    );
  }

  // Most recent first, capped to a manageable window (today back through the start of the plan).
  const sorted = [...workouts].filter((w) => w.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Workout Log</h1>
        <p className="text-sm text-muted">Mark workouts complete and review your training history.</p>
      </div>

      <LogList workouts={sorted} />
    </div>
  );
}
