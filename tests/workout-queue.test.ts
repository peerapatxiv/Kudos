import { afterEach, describe, expect, it } from "vitest";
import { dequeueCompletion, enqueueCompletion, getQueue, queueSize } from "@/lib/offline/workout-queue";

afterEach(() => {
  localStorage.clear();
});

describe("workout completion offline queue", () => {
  it("starts empty", () => {
    expect(getQueue()).toEqual([]);
    expect(queueSize()).toBe(0);
  });

  it("enqueues a completion with a timestamp", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    expect(typeof queue[0].queuedAt).toBe("string");
  });

  it("replaces an existing queued completion for the same workout instead of duplicating it", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 12, actualTimeSeconds: 3600 });
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].actualDistanceKm).toBe(12);
  });

  it("dequeues by workoutId", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w2", actualDistanceKm: 5, actualTimeSeconds: 1500 });
    dequeueCompletion("w1");
    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].workoutId).toBe("w2");
  });

  it("reports queue size", () => {
    enqueueCompletion({ workoutId: "w1", actualDistanceKm: 10, actualTimeSeconds: 3000 });
    enqueueCompletion({ workoutId: "w2", actualDistanceKm: 5, actualTimeSeconds: 1500 });
    expect(queueSize()).toBe(2);
  });
});
