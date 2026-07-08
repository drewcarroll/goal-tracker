# Goal Tracker

A personal-use habit-formation app: set goals ("Read, 3x/week," "No soda,
7x/week"), plan tomorrow's goals each night within a 100-lock daily budget,
check them off honor-system style each day, and watch each goal's lock cost
trend toward "formed" as you keep it up — or climb (capped, never punished)
when you miss. No streaks, ever. Next.js + Supabase, deployed to Vercel,
structured as a strict four-layer Clean Architecture.

There's no accounts system — sign-in is a username typed on `/login`, hashed
into a deterministic UUID that scopes all of that person's data. See
[SETUP.md](SETUP.md) for how to get it running.

---

## Tech Stack

| Concern       | Technology                         |
| ------------- | ----------------------------------- |
| Framework     | Next.js 14 (App Router)             |
| Language      | TypeScript (strict)                 |
| Styling       | Tailwind CSS                        |
| Backend / DB  | Supabase (PostgreSQL), service-role key only, no Supabase Auth |
| Charts        | Recharts                            |
| Testing       | Vitest                              |
| Hosting       | Vercel (+ a daily keepalive cron)   |
| Lint / Format | ESLint + Prettier                   |

---

## Getting Started

See [SETUP.md](SETUP.md) — it walks through creating the Supabase project,
applying `supabase/schema.sql`, and running locally or deploying to Vercel.

```bash
npm install
npm run dev
```

## Available Scripts

| Script                  | Purpose                       |
| ------------------------ | ------------------------------ |
| `npm run dev`            | Start the dev server           |
| `npm run build`          | Production build               |
| `npm run start`           | Run the production build       |
| `npm run lint`            | Lint with ESLint (`next lint`) |
| `npm run type-check`      | Type-check without emitting    |
| `npm test`                | Run the Vitest suite           |
| `npm run format`          | Format with Prettier           |
| `npm run format:check`    | Check formatting without writing |

---

## Pages

| Route         | Description                                                    |
| ------------- | ---------------------------------------------------------------- |
| `/login`      | Username entry (no password)                                     |
| `/home`       | Today's scheduled goals + check-in/plan-tomorrow entry points     |
| `/goals`      | Create, edit, pause/resume, delete goals                         |
| `/onboarding` | Guided first-run setup: pick or add goals, set difficulty + frequency |
| `/plan`       | Night-before planning within the 100-lock budget (`?for=today` grace path) |
| `/checkin`    | End-of-day pass/fail marks + optional private journal entry      |
| `/progress`   | Per-goal lock-cost trajectory, this-week pips, 30-day pass rate, calendar |
| `/history`    | Past check-ins — edit, delete, or backfill a missed day           |
| `/journal`    | Private, chronological journal entries                            |

Plus `POST /api/login`, `GET /api/logout`, and `GET /api/cron/keepalive`
(daily Supabase keepalive ping, see `vercel.json`).

---

## Clean Architecture

Strict, inward-pointing dependency rule — see [`CLAUDE.md`](CLAUDE.md) for the
full rules, and each layer's own `CLAUDE.md` for its constraints.

```
interfaces     ──▶ application ──▶ domain
infrastructure ──▶ application ──▶ domain
domain imports NOTHING from outside itself
```

### `src/domain/` — the core

Pure business rules, zero outside dependencies.

- `entities/Goal.ts` — self-validating entity: freeform name, weekly
  frequency target, difficulty, and a lock cost that trends toward 1
  ("formed") on passed days and up (capped at 50) on failed ones.
- `entities/DailyPlan.ts`, `CheckIn.ts`, `JournalEntry.ts`.
- `value-objects/LocalDate.ts` — user-local calendar day (never server UTC).
- `value-objects/GoalSuggestions.ts` — optional "quick add" ideas, not a closed catalog.
- `services/LockCostService.ts` — the cost-trajectory math.
- `services/GoalTrajectoryService.ts` — reconstructs a goal's full cost
  history by replaying its check-ins (there's no cost-history table).
- `repositories/` — repository interfaces (ports).
- `errors/` — domain exceptions.

### `src/application/` — use cases

One class per use case, each with `execute(dto)`, returning DTOs never
entities. Goal management: `CreateGoalUseCase`, `CreateGoalsFromOnboardingUseCase`,
`EditGoalUseCase`, `UpdateGoalUseCase` (pause/resume), `DeleteGoalUseCase`,
`GetActiveGoalsUseCase`, `GetAllGoalsUseCase`, `GetGoalSuggestionsUseCase`.
Planning + check-in: `CreateDailyPlanUseCase`, `GetTodayPlanUseCase`,
`SubmitCheckInUseCase`, `EditCheckInUseCase`, `DeleteCheckInUseCase`,
`GetTodayCheckInUseCase`, `GetCheckInHistoryUseCase`. Stats: `GetGoalStatsUseCase`.
Journal: `CreateJournalEntryUseCase`, `GetJournalHistoryUseCase`.
`services/GoalCostRecomputeService.ts` — the shared "replay this goal's check-in
history and persist the resulting cost" primitive every check-in mutation goes through.

### `src/infrastructure/` — implementations & I/O

- `database/supabaseClient.ts` — server-side Supabase client (service-role key).
- `repositories/Supabase*Repository.ts` — implement the domain repository
  interfaces; map DB rows ↔ entities. Note: the physical `habits` table and
  its `habit_ids`/`habitId` columns predate a Goal/Habit unification and were
  kept as-is to avoid a data migration — the repository layer translates
  between them and the domain's `Goal`/`goalId`, see `SupabaseGoalRepository.ts`.
- `config/env.ts` — the only place env vars are read.
- `container.ts` — composition root wiring concrete repositories into use cases.

### `src/interfaces/` — entry points

- `web/app/` — Next.js App Router pages and route handlers.
- `web/http/` — session/username/timezone handling, error → HTTP mapping.
- `web/components/` — client components, one directory per page.

> **Why the re-exports in root `app/`?** Next.js requires the App Router at
> `app/` or `src/app/`. To keep presentation code inside the Clean Architecture
> layout, the real handlers live in `src/interfaces/web/app/` and the root
> `app/` files are thin re-exports.

---

## Database

`supabase/schema.sql` is the single source of truth for the schema (`habits`,
`daily_plans`, `check_ins`, `journal_entries`) — see the file header for how
to apply it. RLS is enabled with no policies; only the server-side
service-role key can read/write, so the public `anon` key has no access.

---

## Deployment (Vercel)

1. Push to a Git repository.
2. Import the project in Vercel; add the env vars from `.env.example`.
3. Deploy — `vercel.json` configures the Next.js preset and the keepalive cron.

---

## License

MIT
