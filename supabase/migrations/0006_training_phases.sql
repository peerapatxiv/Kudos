-- Training phases table to enable editable phase definitions
-- Replaces hardcoded phases in src/lib/training/phases.ts

create table if not exists public.training_phases (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  description text,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_phases_user_id_idx on public.training_phases (user_id);
create index if not exists training_phases_dates_idx on public.training_phases (start_date, end_date);

-- Row level security: users can only see their own phases
alter table public.training_phases enable row level security;

create policy "Users can view their own phases" on public.training_phases
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own phases" on public.training_phases
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own phases" on public.training_phases
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own phases" on public.training_phases
  for delete
  using (auth.uid() = user_id);
