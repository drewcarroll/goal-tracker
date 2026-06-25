# Goal Tracker

A production-ready goal tracking application built with **Next.js**, **TypeScript**,
**Tailwind CSS**, **Supabase**, and **PostgreSQL**, deployable to **Vercel** —
structured according to **Clean Architecture**.

Create goals, track progress, auto-complete goals at 100%, and view aggregate
statistics — all behind a strictly layered, dependency-inverted codebase.

---

## Tech Stack

| Concern          | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | Next.js 14 (App Router)             |
| Language         | TypeScript (strict)                 |
| Styling          | Tailwind CSS                        |
| Backend / DB     | Supabase (PostgreSQL + Auth + RLS)  |
| Validation       | Zod                                 |
| Hosting          | Vercel                              |
| Lint / Format    | ESLint + Prettier                   |

---

## Getting Started

### 1. Prerequisites

- Node.js `>= 18.17`
- A [Supabase](https://supabase.com) project

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable                        | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (client-safe)                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service-role key — **server only, never expose**       |
| `DATABASE_URL`                  | Direct Postgres connection (optional, for migrations)  |

### 4. Apply the database schema

Run the migration in the Supabase SQL editor, or via the Supabase CLI:

```bash
supabase db push
# or paste supabase/migrations/0001_create_goals.sql into the SQL editor
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script                 | Purpose                          |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the dev server             |
| `npm run build`        | Production build                 |
| `npm run start`        | Run the production build         |
| `npm run lint`         | Lint with ESLint                 |
| `npm run type-check`   | Type-check without emitting      |
| `npm run format`       | Format with Prettier             |

---

## API

| Method  | Endpoint                      | Description                |
| ------- | ----------------------------- | -------------------------- |
| `GET`   | `/api/goals?userId=<uuid>`    | List a user's goals        |
| `POST`  | `/api/goals`                  | Create a goal              |
| `PATCH` | `/api/goals/:id/progress`     | Update a goal's progress   |
| `GET`   | `/api/goals/stats?userId=`    | Aggregate goal statistics  |

Example:

```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000000","title":"Read 12 books"}'
```

---

## Clean Architecture

This project enforces a strict, inward-pointing dependency rule. Each layer has
its own `CLAUDE.md` describing its responsibilities and constraints.

```
interfaces  ──▶  application  ──▶  domain
infrastructure ─▶ application ──▶  domain
domain imports NOTHING from outside itself
```

### `src/domain/` — the core

Pure business rules with **zero** outside dependencies.

- `entities/Goal.ts` — the `Goal` entity; protects its own invariants and holds
  behavior (`updateProgress`, `complete`, `archive`).
- `value-objects/` — `GoalStatus`, `Progress` (immutable, validated by value).
- `repositories/GoalRepository.ts` — repository **interface** (a port).
- `services/GoalStatsService.ts` — domain service for cross-entity stats.
- `errors/` — domain exceptions.

### `src/application/` — use cases

Orchestrates the domain to fulfill use cases. Knows *what*, not *how*.

- `use-cases/` — one class per use case, each with an `execute(dto)` method
  (`CreateGoalUseCase`, `ListGoalsUseCase`, `UpdateGoalProgressUseCase`,
  `GetGoalStatsUseCase`).
- `dtos/` — input/output contracts crossing the boundary.
- `mappers/GoalMapper.ts` — domain ↔ DTO mapping.
- `ports/IdGenerator.ts` — abstraction for infrastructure needs.
- `errors/` — application-level exceptions.

### `src/infrastructure/` — implementations & I/O

Implements the ports/interfaces defined inward. All I/O lives here.

- `database/supabaseClient.ts` — Supabase client factory.
- `repositories/SupabaseGoalRepository.ts` — implements `GoalRepository`,
  maps DB rows ↔ domain entities.
- `id/UuidGenerator.ts` — implements the `IdGenerator` port.
- `config/env.ts` — the **only** place env vars are read.
- `container.ts` — the **composition root**: the single place where concrete
  implementations are wired to use cases.

### `src/interfaces/` — entry points

Thin adapters that translate external input into use case calls.

- `web/app/` — Next.js App Router pages and API route handlers.
- `web/http/` — request validation (Zod) and error → HTTP mapping.
- `cli/createGoal.ts` — a CLI entry point reusing the same use case.

> **Why the re-exports in root `app/`?** Next.js requires the App Router at
> `app/` or `src/app/`. To keep presentation code inside the Clean Architecture
> layout, the real handlers live in `src/interfaces/web/app/` and the root
> `app/` files are thin re-exports.

### Dependency rule enforcement

- `tsconfig.json` path aliases (`@/domain`, `@/application`, …) make layers explicit.
- `.eslintrc.json` `no-restricted-imports` rules forbid illegal cross-layer imports
  (e.g. `domain` importing `application`/`infrastructure`/`interfaces`).

---

## Deployment (Vercel)

1. Push to a Git repository.
2. Import the project in Vercel.
3. Add the environment variables from `.env.example` in the Vercel dashboard.
4. Deploy — `vercel.json` configures the Next.js framework preset.

---

## License

MIT
