-- Add color support to training phases
alter table public.training_phases
  add column if not exists color text default 'rest';

-- Create comment explaining color values
comment on column public.training_phases.color is 'Color theme for the phase: rest, easy, tempo, interval, secondary-race, recovery';
