-- Running training companion — Phase 1 schema
-- Tables, indexes, constraints, and Row Level Security for a single-athlete
-- (but multi-user-capable) training log backed by Supabase Auth.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ---------------------------------------------------------------------------
-- races
-- ---------------------------------------------------------------------------
create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  race_type text not null,
  date date not null,
  distance_km numeric(6, 2) not null check (distance_km > 0),
  goal_time_seconds integer check (goal_time_seconds is null or goal_time_seconds > 0),
  goal_pace_seconds_per_km integer check (goal_pace_seconds_per_km is null or goal_pace_seconds_per_km > 0),
  priority text not null check (priority in ('a_race', 'secondary', 'tune_up')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists races_user_id_idx on public.races (user_id);
create index if not exists races_date_idx on public.races (date);

-- ---------------------------------------------------------------------------
-- training_weeks
-- ---------------------------------------------------------------------------
create table if not exists public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_number integer not null,
  phase text not null check (
    phase in ('pre_plan', 'lead_in', 'base', 'build', 'peak', 'taper', 'recovery_bridge')
  ),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  notes text
);

create index if not exists training_weeks_user_id_idx on public.training_weeks (user_id);
create unique index if not exists training_weeks_user_week_idx on public.training_weeks (user_id, week_number);

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  training_week_id uuid references public.training_weeks (id) on delete set null,
  date date not null,
  day_of_week text not null,
  title text not null,
  workout_type text not null check (
    workout_type in ('easy', 'tempo', 'interval', 'long_run', 'rest', 'race', 'recovery')
  ),
  distance_km numeric(6, 2),
  target_pace_min_sec_per_km text,
  pace_min_sec_per_km integer,
  notes text,
  is_rest_day boolean not null default false,
  is_race boolean not null default false,
  race_id uuid references public.races (id) on delete set null,
  completed boolean not null default false,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped', 'modified')),
  completed_at timestamptz,
  actual_distance_km numeric(6, 2),
  actual_time_seconds integer,
  actual_pace_seconds_per_km integer,
  perceived_effort smallint check (perceived_effort is null or perceived_effort between 1 and 10),
  athlete_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_date_idx on public.workouts (date);
create index if not exists workouts_training_week_id_idx on public.workouts (training_week_id);
create index if not exists workouts_completed_idx on public.workouts (completed);
create unique index if not exists workouts_user_date_idx on public.workouts (user_id, date);

-- ---------------------------------------------------------------------------
-- workout_intervals
-- ---------------------------------------------------------------------------
create table if not exists public.workout_intervals (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  interval_number integer not null,
  distance_m integer not null check (distance_m > 0),
  target_pace_seconds_per_km integer,
  recovery_seconds integer,
  recovery_type text check (recovery_type in ('jog', 'walk', 'easy_pace', 'stand'))
);

create index if not exists workout_intervals_workout_id_idx on public.workout_intervals (workout_id);
create unique index if not exists workout_intervals_workout_number_idx
  on public.workout_intervals (workout_id, interval_number);

-- ---------------------------------------------------------------------------
-- daily_logs
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  sleep_quality smallint check (sleep_quality is null or sleep_quality between 1 and 5),
  fatigue smallint check (fatigue is null or fatigue between 1 and 5),
  soreness smallint check (soreness is null or soreness between 1 and 5),
  motivation smallint check (motivation is null or motivation between 1 and 5),
  notes text
);

create index if not exists daily_logs_user_id_idx on public.daily_logs (user_id);
create unique index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- body_metrics (optional; never required for normal app usage)
-- ---------------------------------------------------------------------------
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2),
  resting_hr smallint,
  notes text
);

create index if not exists body_metrics_user_id_idx on public.body_metrics (user_id);
create unique index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every user-owned table, own-rows-only
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.races enable row level security;
alter table public.training_weeks enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_intervals enable row level security;
alter table public.daily_logs enable row level security;
alter table public.body_metrics enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

create policy "races_select_own" on public.races for select using (auth.uid() = user_id);
create policy "races_insert_own" on public.races for insert with check (auth.uid() = user_id);
create policy "races_update_own" on public.races for update using (auth.uid() = user_id);
create policy "races_delete_own" on public.races for delete using (auth.uid() = user_id);

create policy "training_weeks_select_own" on public.training_weeks for select using (auth.uid() = user_id);
create policy "training_weeks_insert_own" on public.training_weeks for insert with check (auth.uid() = user_id);
create policy "training_weeks_update_own" on public.training_weeks for update using (auth.uid() = user_id);
create policy "training_weeks_delete_own" on public.training_weeks for delete using (auth.uid() = user_id);

create policy "workouts_select_own" on public.workouts for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on public.workouts for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on public.workouts for update using (auth.uid() = user_id);
create policy "workouts_delete_own" on public.workouts for delete using (auth.uid() = user_id);

-- workout_intervals has no user_id of its own; ownership flows through workouts.
create policy "workout_intervals_select_own" on public.workout_intervals for select
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "workout_intervals_insert_own" on public.workout_intervals for insert
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "workout_intervals_update_own" on public.workout_intervals for update
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "workout_intervals_delete_own" on public.workout_intervals for delete
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "daily_logs_select_own" on public.daily_logs for select using (auth.uid() = user_id);
create policy "daily_logs_insert_own" on public.daily_logs for insert with check (auth.uid() = user_id);
create policy "daily_logs_update_own" on public.daily_logs for update using (auth.uid() = user_id);
create policy "daily_logs_delete_own" on public.daily_logs for delete using (auth.uid() = user_id);

create policy "body_metrics_select_own" on public.body_metrics for select using (auth.uid() = user_id);
create policy "body_metrics_insert_own" on public.body_metrics for insert with check (auth.uid() = user_id);
create policy "body_metrics_update_own" on public.body_metrics for update using (auth.uid() = user_id);
create policy "body_metrics_delete_own" on public.body_metrics for delete using (auth.uid() = user_id);
