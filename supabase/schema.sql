-- Goal Tracker — Supabase schema.
--
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Creates the three tables the app reads/writes (goals, goal_sessions, logs).
--
-- The app connects with the service-role key, which BYPASSES row-level security,
-- so no policies are needed. RLS is enabled with no policies below so that the
-- public anon key cannot read or write this data — only the server (service
-- role) can. Sign-in is by username: every row's user_id is a UUID derived from
-- the signed-in username (see src/interfaces/web/http/currentUser.ts), so each
-- username's data is kept separate.

-- A goal, e.g. name "Read books", 5 pages per week, unit "books".
-- `target_value` holds the PER-WEEK rate (the source of truth); the whole-
-- session total is derived in the app as rate × number of weeks.
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

-- A user's commitment to a hardcoded catalog habit (see HabitCatalog.ts — the
-- catalog itself is not a table). Lock cost trends toward 1 ("formed") on
-- passed days and up (capped at 50) on failed ones; see LockCostService.
create table if not exists public.habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  catalog_id        text not null,
  difficulty        text not null check (difficulty in ('easy', 'medium', 'hard')),
  current_lock_cost int not null check (current_lock_cost between 1 and 50),
  state             text not null default 'active' check (state in ('active', 'paused', 'formed')),
  created_at        timestamptz not null default now()
);
create index if not exists habits_user_id_idx on public.habits (user_id);

-- The night-before commitment of which habits to attempt on a given user-local
-- day, within the 100-lock daily budget. `date` is a plain date (no time/zone)
-- since day boundaries are the user's local day, never server UTC.
create table if not exists public.daily_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  date        date not null,
  habit_ids   uuid[] not null,
  locks_spent int not null check (locks_spent between 0 and 100),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_plans_user_id_date_idx on public.daily_plans (user_id, date);

-- The end-of-day honor-system report against a day's plan: one pass/fail mark
-- per scheduled habit. dayResult is derived in the app, never stored.
create table if not exists public.check_ins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  date       date not null,
  marks      jsonb not null, -- [{ "habitId": "...", "passed": true }, ...]
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists check_ins_user_id_date_idx on public.check_ins (user_id, date);

-- The private, optional reflection attached to a day. Never surfaced to
-- anyone but the user; feeds no stats or lock-cost math.
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  date       date not null,
  text       text,
  mood       int check (mood between 1 and 5),
  photo_url  text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists journal_entries_user_id_date_idx on public.journal_entries (user_id, date);

-- Lock out the public anon key; the server uses the service role, which bypasses RLS.
alter table public.goals enable row level security;
alter table public.goal_sessions enable row level security;
alter table public.logs enable row level security;
alter table public.habits enable row level security;
alter table public.daily_plans enable row level security;
alter table public.check_ins enable row level security;
alter table public.journal_entries enable row level security;
