-- Adds an optional manually-logged VO2max reading to body_metrics.
-- Never required — matches the existing "optional, never required" convention
-- for every other body_metrics field.
alter table public.body_metrics
  add column if not exists vo2max numeric(4, 1);
