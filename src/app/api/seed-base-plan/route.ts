import { seedBasePlanOnly } from "@/lib/training/actions";

export async function POST() {
  try {
    const result = await seedBasePlanOnly();
    if (result.ok) {
      return Response.json({ success: true, message: "Base plan seeded successfully" });
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
