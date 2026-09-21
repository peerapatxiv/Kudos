-- Add color column to training_phases if it doesn't exist
alter table if exists public.training_phases
add column if not exists color text default 'rest';
