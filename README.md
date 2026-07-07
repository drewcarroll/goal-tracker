# Goal Tracker

A personal-use app for tracking measurable goals (e.g. "read 5 books/week until
June") over a fixed session, plus (in progress) a non-punitive habit-formation
system built around a daily lock budget. Next.js + Supabase, deployed to Vercel,
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
| Validation    | Zod                                 |
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

## Pages & API

| Route                      | Description                                  |
| --------------------------- | --------------------------------------------- |
| `/login`                    | Username entry (no password)                  |
| `/home`                      | Quick-log form + this-week status per goal    |
| `/goals`                     | Goal CRUD                                      |
| `/progress`                  | Cumulative/weekly charts + completion donut   |
| `/history`                   | Past log entries                              |
| `GET/POST /api/goals`        | List / create goals                            |
| `PUT/DELETE /api/goals/:id`  | Update / delete a goal                         |
| `GET /api/progress`          | Progress-chart data                            |
| `POST /api/login`            | Set the username cookie                        |
| `GET /api/logout`            | Clear the username cookie                      |
| `GET /api/cron/keepalive`    | Daily Supabase keepalive ping (see `vercel.json`) |

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

- `entities/Goal.ts` — self-validating entity; a goal spans a `SessionTimeframe`
  and accumulates `LogEntry` values.
- `value-objects/SessionTimeframe.ts`
- `services/ProjectionService.ts`, `ProgressChartService.ts` — pace projections
  and chart-ready series derived from logs.
- `repositories/GoalRepository.ts` — repository interface (a port).
- `errors/` — domain exceptions.

### `src/application/` — use cases

One class per use case, each with `execute(dto)`, returning DTOs never entities:
`CreateGoalUseCase`, `UpdateGoalUseCase`, `DeleteGoalUseCase`, `ListGoalsUseCase`,
`LogProgressUseCase`, `DeleteLogUseCase`, `GetProgressDataUseCase`,
`GetHistoryUseCase`.

### `src/infrastructure/` — implementations & I/O

- `database/supabaseClient.ts` — server-side Supabase client (service-role key).
- `repositories/SupabaseGoalRepository.ts`, `SupabaseLogRepository.ts` — implement
  the domain repository interfaces; map DB rows ↔ entities.
- `config/env.ts` — the only place env vars are read.
- `container.ts` — composition root wiring concrete repositories into use cases.

### `src/interfaces/` — entry points

- `web/app/` — Next.js App Router pages and route handlers.
- `web/http/` — session/username handling, request validation, error → HTTP mapping.
- `web/components/` — client components (home, goals, progress, history).

> **Why the re-exports in root `app/`?** Next.js requires the App Router at
> `app/` or `src/app/`. To keep presentation code inside the Clean Architecture
> layout, the real handlers live in `src/interfaces/web/app/` and the root
> `app/` files are thin re-exports.

---

## Database

`supabase/schema.sql` is the single source of truth for the schema (three
tables: `goals`, `goal_sessions`, `logs`) — see the file header for how to apply
it. RLS is enabled with no policies; only the server-side service-role key can
read/write, so the public `anon` key has no access.

---

## Deployment (Vercel)

1. Push to a Git repository.
2. Import the project in Vercel; add the env vars from `.env.example`.
3. Deploy — `vercel.json` configures the Next.js preset and the keepalive cron.

---

## License

MIT
