import { seedCompleteTrainingPlan } from "@/lib/training/actions";

export async function POST() {
  try {
    const result = await seedCompleteTrainingPlan();
    if (result.ok) {
      return Response.json({
        success: true,
        message: "Complete training plan seeded successfully",
        details: "✅ 6 phases, 12 weeks, 80+ workouts uploaded"
      });
    } else {
      return Response.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : "An error occurred" },
      { status: 500 }
    );
  }
}
