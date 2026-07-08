-- Goal Tracker — Supabase schema.
--
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run: every statement is idempotent (IF EXISTS / IF NOT EXISTS),
-- and the `habits` table evolution below only touches rows that need it.
--
-- The app connects with the service-role key, which BYPASSES row-level security,
-- so no policies are needed. RLS is enabled with no policies below so that the
-- public anon key cannot read or write this data — only the server (service
-- role) can. Sign-in is by username: every row's user_id is a UUID derived from
-- the signed-in username (see src/interfaces/web/http/currentUser.ts), so each
-- username's data is kept separate.
--
-- 2026-07 — Unified the old separate numeric-target "goals" and catalog-bound
-- "habits" into one Goal concept (see docs/plan.md). The old goals/
-- goal_sessions/logs tables are retired; `habits` becomes the single table
-- for goals (kept its physical name to avoid a data migration — the
-- repository layer maps it to the domain's `Goal`, see
-- src/infrastructure/repositories/SupabaseGoalRepository.ts).

-- Retire the old measurable-goal system entirely.
drop table if exists public.logs;
drop table if exists public.goal_sessions;
drop table if exists public.goals;

-- A goal: freeform name (e.g. "Read", "No soda") + a weekly frequency target
-- (e.g. 3 for "3x/week") + a lock cost that trends toward 1 ("formed") on
-- passed days and up (capped at 50) on failed ones — see LockCostService.
-- Table kept named `habits` (see note above); catalog_id was the old
-- closed-catalog reference and is dropped in favor of freeform `name`.
create table if not exists public.habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  catalog_id        text,
  difficulty        text not null check (difficulty in ('easy', 'medium', 'hard')),
  current_lock_cost int not null check (current_lock_cost between 1 and 50),
  state             text not null default 'active' check (state in ('active', 'paused', 'formed')),
  created_at        timestamptz not null default now()
);
alter table public.habits add column if not exists name text;
alter table public.habits add column if not exists weekly_frequency_target int;
-- Best-effort backfill for any pre-existing rows, then enforce not-null.
update public.habits set name = coalesce(name, catalog_id, 'Goal') where name is null;
update public.habits set weekly_frequency_target = 3 where weekly_frequency_target is null;
alter table public.habits alter column name set not null;
alter table public.habits alter column weekly_frequency_target set not null;
do $$ begin
  alter table public.habits add constraint habits_weekly_frequency_target_check
    check (weekly_frequency_target between 1 and 7);
exception when duplicate_object then null;
end $$;
alter table public.habits drop column if exists catalog_id;
create index if not exists habits_user_id_idx on public.habits (user_id);

-- The night-before commitment of which goals to attempt on a given user-local
-- day, within the 100-lock daily budget. `date` is a plain date (no time/zone)
-- since day boundaries are the user's local day, never server UTC. Column
-- kept named `habit_ids` (see note above); maps to the domain's `goalIds`.
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
-- per scheduled goal. dayResult is derived in the app, never stored. The
-- jsonb key stays "habitId" (see note above); maps to the domain's `goalId`.
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
alter table public.habits enable row level security;
alter table public.daily_plans enable row level security;
alter table public.check_ins enable row level security;
alter table public.journal_entries enable row level security;
