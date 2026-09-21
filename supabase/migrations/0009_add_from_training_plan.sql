-- Add column to track if workout is from training plan
ALTER TABLE IF EXISTS public.workouts
ADD COLUMN IF NOT EXISTS from_training_plan boolean DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS workouts_from_training_plan_idx ON public.workouts (from_training_plan);
