-- Goal Tracker — Supabase schema.
--
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Creates the three tables the app reads/writes (goals, goal_sessions, logs).
--
-- The app connects with the service-role key, which BYPASSES row-level security,
-- so no policies are needed. RLS is enabled with no policies below so that the
-- public anon key cannot read or write this data — only the server (service
-- role) can. This is a single-user app: every row's user_id is the fixed owner
-- id from src/infrastructure/config/owner.ts.

-- A goal, e.g. name "Read books", target_value 12, unit "books".
create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  name         text not null,
  target_value numeric(12, 4) not null,
  unit         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists goals_user_id_idx on public.goals (user_id);

-- The timeframe a goal is pursued over (one per goal).
create table if not exists public.goal_sessions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null unique references public.goals (id) on delete cascade,
  user_id    uuid not null,
  start_date timestamptz not null,
  end_date   timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goal_sessions_user_id_idx on public.goal_sessions (user_id);

-- A single value logged against a goal for a specific week of its session.
-- (goal_id, week_index) is intentionally NOT unique: multiple logs in the same
-- week accumulate toward the goal's target.
create table if not exists public.logs (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  user_id    uuid not null,
  week_index int not null,
  value      numeric(12, 4) not null,
  created_at timestamptz not null default now()
);
create index if not exists logs_goal_id_week_idx on public.logs (goal_id, week_index);
create index if not exists logs_user_id_idx on public.logs (user_id);

-- Lock out the public anon key; the server uses the service role, which bypasses RLS.
alter table public.goals enable row level security;
alter table public.goal_sessions enable row level security;
alter table public.logs enable row level security;
