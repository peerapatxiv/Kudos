"use client";

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { completeWorkout, type CompleteWorkoutInput } from "@/lib/training/actions";
import { dequeueCompletion, getQueue, queueSize } from "@/lib/offline/workout-queue";

/** Flushes queued offline workout completions once app-wide, and shows a small pending badge. */
export function OfflineQueueSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    function refreshCount() {
      setPending(queueSize());
    }

    async function flush() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queue = getQueue();
      if (queue.length === 0) return;

      setSyncing(true);
      for (const item of queue) {
        const input: CompleteWorkoutInput = {
          workoutId: item.workoutId,
          actualDistanceKm: item.actualDistanceKm,
          actualTimeSeconds: item.actualTimeSeconds,
          perceivedEffort: item.perceivedEffort,
          athleteNotes: item.athleteNotes,
        };
        try {
          const result = await completeWorkout(input);
          if (result.ok) dequeueCompletion(item.workoutId);
        } catch {
          break; // still unreachable — stop and retry next time we come online
        }
      }
      setSyncing(false);
      refreshCount();
    }

    refreshCount();
    window.addEventListener("cockpit:queue-changed", refreshCount);
    window.addEventListener("online", flush);
    flush();

    return () => {
      window.removeEventListener("cockpit:queue-changed", refreshCount);
      window.removeEventListener("online", flush);
    };
  }, []);

  if (pending === 0) return null;

  return (
    <span
      className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full border border-warning/30 bg-surface px-3 py-1.5 text-xs font-medium text-warning shadow-md md:bottom-4"
      title={`${pending} workout${pending === 1 ? "" : "s"} waiting to sync`}
    >
      <UploadCloud className="h-3.5 w-3.5" />
      {syncing ? "Syncing…" : `${pending} pending sync`}
    </span>
  );
}
