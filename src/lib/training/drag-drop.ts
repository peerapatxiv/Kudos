/**
 * Drag-and-drop utilities for moving workouts between calendar days.
 * Tracks drag state and validates drop targets.
 */

export const DRAG_DATA_TYPE = "application/x-workout-id";

export function setDragData<T extends Element>(e: React.DragEvent<T>, workoutId: string) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(DRAG_DATA_TYPE, workoutId);
}

export function getDragData<T extends Element>(e: React.DragEvent<T>): string | null {
  const data = e.dataTransfer.getData(DRAG_DATA_TYPE);
  return data || null;
}

export function allowDrop<T extends Element>(e: React.DragEvent<T>) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
