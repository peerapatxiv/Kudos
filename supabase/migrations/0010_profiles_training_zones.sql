-- Lets the athlete edit their training zones. Each column stores overrides
-- keyed by zone id; null (or a missing id) means "use the app default".
--   hr_zones:   { "easy": { "low": 120, "high": 140 }, ... }      (bpm)
--   pace_zones: { "easy": { "low": "5:15", "high": "5:45" }, ... } (per km)
alter table public.profiles
  add column if not exists hr_zones jsonb,
  add column if not exists pace_zones jsonb;
