-- Adds an optional height to profiles. Height doesn't change for an adult,
-- so it lives on the profile (one row per user) rather than the dated
-- body_metrics table, and is used to compute BMI alongside logged weight.
alter table public.profiles
  add column if not exists height_cm smallint check (height_cm is null or height_cm > 0);
