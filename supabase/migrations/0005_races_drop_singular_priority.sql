-- Races can now share a priority freely (multiple "a_race" entries, etc.) —
-- the app no longer enforces at most one A-race/secondary.
drop index if exists public.races_user_singular_priority_idx;
