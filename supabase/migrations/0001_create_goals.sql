-- Goal Tracker — initial schema
-- Run via the Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  status      text not null default 'active' check (status in ('active', 'completed', 'archived')),
  progress    integer not null default 0 check (progress between 0 and 100),
  due_date    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_status_idx on public.goals (status);

-- Row Level Security: users may only access their own goals.
alter table public.goals enable row level security;

drop policy if exists "Users can view their own goals" on public.goals;
create policy "Users can view their own goals"
  on public.goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own goals" on public.goals;
create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own goals" on public.goals;
create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own goals" on public.goals;
create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
