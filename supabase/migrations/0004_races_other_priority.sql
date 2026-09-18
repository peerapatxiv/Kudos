-- Lets the athlete manage races beyond the fixed A-race/secondary pair:
-- adds an "other" priority for freely-added races, and keeps "tune_up"
-- editable. A-race and secondary stay structurally singular (the app's
-- routing and dashboard assume exactly one of each) via a partial unique
-- index rather than just application-level trust.
alter table public.races drop constraint if exists races_priority_check;
alter table public.races add constraint races_priority_check
  check (priority in ('a_race', 'secondary', 'tune_up', 'other'));

create unique index if not exists races_user_singular_priority_idx
  on public.races (user_id, priority)
  where priority in ('a_race', 'secondary');
