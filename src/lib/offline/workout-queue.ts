"use client";

import type { CompleteWorkoutInput } from "@/lib/training/actions";

const QUEUE_KEY = "cockpit:pending-workout-completions";
const QUEUE_CHANGED_EVENT = "cockpit:queue-changed";

export interface QueuedCompletion extends CompleteWorkoutInput {
  queuedAt: string;
}

export function getQueue(): QueuedCompletion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedCompletion[]) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedCompletion[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function enqueueCompletion(input: CompleteWorkoutInput): void {
  const queue = getQueue().filter((item) => item.workoutId !== input.workoutId);
  queue.push({ ...input, queuedAt: new Date().toISOString() });
  setQueue(queue);
}

export function dequeueCompletion(workoutId: string): void {
  setQueue(getQueue().filter((item) => item.workoutId !== workoutId));
}

export function queueSize(): number {
  return getQueue().length;
}
