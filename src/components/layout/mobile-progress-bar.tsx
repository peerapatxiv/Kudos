import { getAllWorkouts, getTrainingWeeks } from "@/lib/training/queries";
import { todayIso } from "@/lib/training/dates";
import { summarizeWeek } from "@/lib/training/aggregate";
import { Progress } from "@/components/ui/progress";

export async function MobileProgressBar() {
  const today = todayIso();
  const [weeksResult, workoutsResult] = await Promise.all([
    getTrainingWeeks(),
    getAllWorkouts(),
  ]);

  if (weeksResult.status !== "ok" || workoutsResult.status !== "ok") return null;

  const weeks = weeksResult.data;
  const workouts = workoutsResult.data;

  const currentWeek = weeks.find((w) => today >= w.start_date && today <= w.end_date);
  if (!currentWeek) return null;

  const weekWorkouts = workouts.filter((w) => w.training_week_id === currentWeek.id);
  const stats = summarizeWeek(weekWorkouts);

  if (stats.completionPct === 0) return null;

  return (
    <div className="fixed top-[3.5rem] inset-x-0 z-30 px-4 py-2 bg-surface/95 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <Progress value={stats.completionPct} className="flex-1" />
        <span className="text-xs font-medium text-muted min-w-[2.5rem]">{stats.completionPct}%</span>
      </div>
    </div>
  );
}
