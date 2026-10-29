import type { Metadata } from "next";
import { FinishTimeTable } from "@/components/pace/finish-time-table";

export const metadata: Metadata = {
  title: "Pace Calculator",
};

export default function PacePage() {
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Pace Calculator</h1>
        <p className="mt-1 text-sm text-muted">Pick your expected pace to see finish times for every distance.</p>
      </div>
      <FinishTimeTable />
    </div>
  );
}
