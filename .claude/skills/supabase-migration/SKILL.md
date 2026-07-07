---
name: supabase-migration
description: Use when adding or changing Supabase tables/columns for this app — new tables, new columns, schema changes, or wiring a new SupabaseXRepository. Covers this project's schema conventions, RLS setup, and the row-to-entity mapping pattern.
---

# Supabase schema changes (goal-tracker)

## Single source of truth

`supabase/schema.sql` is the **only** schema file — there is no `supabase/migrations/`
directory and no migration history/CLI workflow in this project (an earlier
`migrations/0001_create_goals.sql` existed but described a different, never-built
app and was deleted as stale). To change the schema:

1. Add or edit `create table if not exists` / `alter table` statements directly
   in `supabase/schema.sql`, appended after the existing tables.
2. Apply it by pasting the file into the Supabase Dashboard → SQL Editor → Run
   (see `SETUP.md`). Statements must stay idempotent (`if not exists`, etc.) since
   the whole file gets re-run rather than tracked incrementally.

## Table conventions

Follow the existing three tables (`goals`, `goal_sessions`, `logs`) as the
template:

```sql
create table if not exists public.<table> (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  -- ...columns...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()   -- omit if the row is never updated (e.g. append-only logs)
);
create index if not exists <table>_user_id_idx on public.<table> (user_id);
```

- Every user-owned table gets a `user_id uuid not null` column + an index on it.
- FKs to `goals`/other owned tables cascade on delete: `references public.goals (id) on delete cascade`.
- End the file's additions with RLS enabled and **no policies**:
  `alter table public.<table> enable row level security;`
  The app connects with the service-role key (bypasses RLS); this just blocks the
  public `anon` key from reading/writing. Never write `auth.uid()` policies —
  this app has no Supabase Auth, sign-in is username → deterministic UUID
  (`usernameToUserId` in `src/interfaces/web/http/currentUser.ts`).

## Wiring a new table into the app

Adding a table alone does nothing — per `CLAUDE.md`'s layer rules, wire it in
this order:

1. Repository interface in `domain/repositories/`.
2. `Supabase<X>Repository` in `infrastructure/repositories/` implementing it —
   follow `SupabaseGoalRepository.ts`'s pattern: a `<X>Row` interface for the raw
   DB shape, a `toDomain(row)` mapper, and — if embedding a relation via
   `.select("*, related(...)")` — remember Supabase returns a to-one embed as
   either an object or a single-item array (see `extractSession`), so unwrap it
   explicitly rather than assuming one shape.
3. Register the repository in `infrastructure/container.ts` (the composition root).
4. Use cases in `application/use-cases/` that take the repository via constructor
   and return DTOs, never raw entities.
5. Route handler / server action in `interfaces/` calling the use case.

## Don't forget

- If the new table needs to stay warm on Supabase's free tier, consider whether
  `/api/cron/keepalive` (`src/interfaces/web/app/api/cron/keepalive/route.ts`)
  needs to touch it too — right now it only pings `goals` via `ListGoalsUseCase`.
- Update `docs/plan.md` per its Maintenance Protocol if this schema work
  completes or changes a planned task.
