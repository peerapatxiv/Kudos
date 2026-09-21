/**
 * Drag-and-drop utilities for moving workouts between calendar days.
 * Tracks drag state and validates drop targets.
 */

export const DRAG_DATA_TYPE = "application/x-workout-id";

export function setDragData(e: React.DragEvent<HTMLDivElement>, workoutId: string) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(DRAG_DATA_TYPE, workoutId);
}

export function getDragData(e: React.DragEvent<HTMLDivElement>): string | null {
  const data = e.dataTransfer.getData(DRAG_DATA_TYPE);
  return data || null;
}

export function allowDrop(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
