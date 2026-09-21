-- Allow multiple workouts per day by removing unique constraint on (user_id, date)
-- This enables users to log multiple activities on the same day
drop index if exists public.workouts_user_date_idx;

-- Keep the individual indexes for performance
create index if not exists workouts_user_date_idx on public.workouts (user_id, date);
