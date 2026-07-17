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
  current_lock_cost int not null check (current_lock_cost between 1 and 50),
  state             text not null default 'active' check (state in ('active', 'paused', 'formed')),
  created_at        timestamptz not null default now()
);
alter table public.habits add column if not exists name text;
alter table public.habits add column if not exists weekly_frequency_target int;
-- Best-effort backfill for any pre-existing rows, then enforce not-null.
-- catalog_id may already be gone (dropped below on a prior run of this same
-- idempotent script), so check for it rather than referencing it unconditionally.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'habits' and column_name = 'catalog_id'
  ) then
    update public.habits set name = coalesce(name, catalog_id, 'Goal') where name is null;
  else
    update public.habits set name = coalesce(name, 'Goal') where name is null;
  end if;
end $$;
update public.habits set weekly_frequency_target = 3 where weekly_frequency_target is null;
alter table public.habits alter column name set not null;
alter table public.habits alter column weekly_frequency_target set not null;
do $$ begin
  alter table public.habits add constraint habits_weekly_frequency_target_check
    check (weekly_frequency_target between 1 and 7);
exception when duplicate_object then null;
end $$;
alter table public.habits drop column if exists catalog_id;
-- 2026-07-16 — difficulty tier removed (see docs/lock-formula.md): the lock
-- formula now starts every goal at the same cost and lets pass/fail history
-- alone differentiate them. Stored current_lock_cost values are left as-is
-- (they self-correct on the goal's next recompute, per the existing
-- retroactivity design); only the now-unused column is dropped.
alter table public.habits drop column if exists difficulty;
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

-- 2026-07 (Phase 6) — Psychology-grounded lock formula + nightly-log ranks.
-- See docs/lock-formula.md and docs/progression.md for the full design.

-- Whether a check-in was originally submitted within the user's nightly
-- check-in window (rank points come ONLY from on-time submissions; backfilled
-- past days are false). Stamped once at submission, preserved by edits.
-- Existing rows predate the window feature and are grandfathered to true so
-- nobody's rank history starts at zero; new rows default false and the app
-- sets the real value explicitly.
alter table public.check_ins add column if not exists submitted_on_time boolean;
update public.check_ins set submitted_on_time = true where submitted_on_time is null;
alter table public.check_ins alter column submitted_on_time set default false;
alter table public.check_ins alter column submitted_on_time set not null;

-- Global app configuration (not per-user). Currently one row:
-- key 'lock_formula' holding a partial override of the lock-formula constants
-- (missing fields fall back to DEFAULT_LOCK_FORMULA_CONFIG in the app).
-- Edited via /profile's password-gated dev mode.
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Per-user settings. The nightly check-in window: opens at `checkin_window_start`
-- (afternoon, user-local) and closes at `checkin_window_end` the next morning.
-- Stored as "HH:MM" text (validated app-side: end < 12:00 <= start). Missing
-- row means the defaults (14:00 / 07:00).
create table if not exists public.user_settings (
  user_id              uuid primary key,
  checkin_window_start text not null default '14:00'
    check (checkin_window_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  checkin_window_end   text not null default '07:00'
    check (checkin_window_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at           timestamptz not null default now()
);

-- 2026-07 (Phase 11) — Friends, per-goal privacy, and the trinket economy.
-- See docs/plan.md Phase 11 and the plan file for the full design.

-- Username registry: reverse-lookup + existence-check for friend requests.
-- This app has no accounts table (see interfaces/web/http/session.ts) — every
-- user_id is a one-way hash of the typed username (usernameToUserId), so
-- without this table there is no way to validate a friend-request target
-- exists, or to display a username for a stored user_id anywhere. Upserted
-- once per login (RegisterUsernameUseCase), never written anywhere else.
create table if not exists public.usernames (
  user_id    uuid primary key,
  username   text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists usernames_username_idx on public.usernames (username);

-- Friend requests / friendships in one table. requester_id/addressee_id are
-- directional (who sent it); status flips to 'accepted' once the addressee
-- accepts. The partial unique index prevents duplicate open requests or
-- friendships between the same pair in either direction.
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null,
  addressee_id  uuid not null,
  status        text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create unique index if not exists friendships_open_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status in ('pending', 'accepted');

-- Per-goal privacy. Defaults to true (public) — a user opts INTO privacy per
-- goal; friends never see a private goal, not even as a redacted placeholder
-- (see GoalPrivacyService).
alter table public.habits add column if not exists is_public boolean not null default true;

-- Coin wallet. Balance is mutated ONLY via increment_wallet_balance() below —
-- the Supabase JS client has no read-modify-write transaction primitive, and
-- a battle-pass claim racing a shop purchase would otherwise lose an update.
create table if not exists public.coin_wallets (
  user_id    uuid primary key,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create or replace function public.increment_wallet_balance(p_user_id uuid, p_delta int)
returns int language plpgsql as $$
declare new_balance int;
begin
  insert into public.coin_wallets (user_id, balance) values (p_user_id, 0)
    on conflict (user_id) do nothing;
  update public.coin_wallets
    set balance = balance + p_delta, updated_at = now()
    where user_id = p_user_id
    returning balance into new_balance;
  if new_balance < 0 then
    raise exception 'insufficient coin balance';
  end if;
  return new_balance;
end;
$$;

-- One row per (user, calendar day) battle-pass claim — the idempotency guard
-- that prevents double-claiming a day, and the source of "already claimed"
-- state for the battle-pass calendar UI.
create table if not exists public.battle_pass_claims (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  date          date not null,
  reward_type   text not null check (reward_type in ('coins', 'trinket')),
  coins_awarded int,
  trinket_id    text,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists battle_pass_claims_user_date_idx
  on public.battle_pass_claims (user_id, date);

-- Per-user-per-trinket owned QUANTITY (not a boolean — duplicates are
-- expected from the shop). Battle-pass and shop trinkets share this table;
-- the "shop:" / "bp:" id prefix (see the domain trinket-catalog constants)
-- is what keeps the two pools disjoint, not this table.
create table if not exists public.trinket_inventory (
  user_id     uuid not null,
  trinket_id  text not null,
  quantity    int not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, trinket_id)
);
create index if not exists trinket_inventory_user_idx on public.trinket_inventory (user_id);

-- Which of a user's owned trinkets they've chosen to showcase on their
-- profile/friends view, and in what order. The display cap lives in
-- EconomyConfig (app-side), not a DB constraint.
create table if not exists public.pinned_trinkets (
  user_id     uuid not null,
  trinket_id  text not null,
  position    int not null,
  primary key (user_id, trinket_id)
);

-- One row per purchase — also the rate-limit guard: at most one row per
-- (user, date, slot_index), i.e. one purchase per offered slot per day.
create table if not exists public.shop_purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  date        date not null,
  slot_index  int not null check (slot_index between 0 and 4),
  trinket_id  text not null,
  price_paid  int not null,
  created_at  timestamptz not null default now(),
  unique (user_id, date, slot_index)
);
create index if not exists shop_purchases_user_date_idx on public.shop_purchases (user_id, date);

-- Friend-feed source of truth: trinket claims and purchases. Read filtered
-- by "user_id in (my accepted friends)" at query time — no fan-out-on-write.
-- Fine at this app's expected scale; would need a rework for a large, dense
-- social graph.
create table if not exists public.activity_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  type         text not null check (type in ('battle_pass_claim', 'shop_purchase')),
  trinket_id   text,
  coins        int,
  occurred_at  timestamptz not null default now()
);
create index if not exists activity_events_user_occurred_idx
  on public.activity_events (user_id, occurred_at desc);

-- app_config already exists above (key/value/updated_at) — reused for a new
-- 'economy' key (coin amounts, shop price, rarity weights), same pattern as
-- 'lock_formula'. No new table needed for it.

-- Lock out the public anon key; the server uses the service role, which bypasses RLS.
alter table public.habits enable row level security;
alter table public.daily_plans enable row level security;
alter table public.check_ins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.app_config enable row level security;
alter table public.user_settings enable row level security;
alter table public.usernames enable row level security;
alter table public.friendships enable row level security;
alter table public.coin_wallets enable row level security;
alter table public.battle_pass_claims enable row level security;
alter table public.trinket_inventory enable row level security;
alter table public.pinned_trinkets enable row level security;
alter table public.shop_purchases enable row level security;
alter table public.activity_events enable row level security;
