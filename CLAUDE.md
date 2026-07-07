# Architecture: Clean Architecture

## Layer Map
- `domain/`         → Entities, Value Objects, Domain Services, Repository Interfaces
- `application/`    → Use Cases, DTOs, Application Services
- `infrastructure/` → DB, LLM clients, HTTP clients, MCP servers, external APIs
- `interfaces/`     → Controllers, Route handlers, CLI, Agent entry points

## Dependency Rule (ABSOLUTE)
Dependencies must ONLY point inward:

  interfaces → application → domain
  infrastructure → application → domain

## What this means in practice
- `domain/` imports NOTHING from outside itself
- `application/` imports only from `domain/`
- `infrastructure/` implements interfaces defined in `domain/` or `application/`
- `interfaces/` orchestrates use cases, never contains business logic
- One use case per action
- Repositories are injected into use cases via constructor
- Use cases return DTOs, never raw domain entities
- Nothing above `infrastructure/` touches Supabase directly — always go through a repository/use case

## Forbidden patterns
- Never import infrastructure directly into domain or application
- Never put business logic in controllers or route handlers
- Never let a use case know which DB or LLM is being used
- Never use `any` as a shortcut around layer contracts

## Agent behavior
- Before creating a file, identify which layer it belongs to
- If a concept doesn't fit cleanly in one layer, ask before proceeding
- Prefer extending existing abstractions over creating new ones

## Testing
Every domain entity, value object, and domain service needs a co-located
`*.test.ts` (Vitest), same for every application use case and mapper — follow
the existing pattern (`Goal.logProgress.test.ts`, `ProjectionService.test.ts`,
`SessionTimeframe.test.ts`, `LogProgressUseCase.test.ts`, `GoalMapper.test.ts`).
Cover invariant violations and boundary conditions (floors/caps/rounding,
state transitions), not just the happy path. New use cases and domain logic
are not done until their tests exist and `npm test` passes. Repository
implementations are thin mappers and are not required to have unit tests.

## Project plan
docs/plan.md is the single source of truth for scope and progress. At the start of
every session, read docs/plan.md before doing anything else, and follow its
Maintenance Protocol exactly: check off tasks with dates when completed, add
newly-discovered work as tasks immediately, and log every scope change in its
Changelog. Other reference docs live in docs/ — read them only when relevant to
the current task.
