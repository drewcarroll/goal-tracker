# plan.md — Goal Tracker Habit Overhaul

## ⚠️ MAINTENANCE PROTOCOL — READ FIRST, FOLLOW ALWAYS

This file is the single source of truth for what we're building. You (Claude Code) MUST keep it current:

- **When you finish a task:** change `[ ]` to `[x]` and append the date, e.g. `[x] (2026-07-08)`. Do this in the same session you complete the work, before ending your turn.
- **When scope changes** (task added, removed, modified, split): make the edit AND add a one-line entry to the Changelog at the bottom with the date.
- **When you discover new work mid-task** (a migration you didn't anticipate, a refactor a task requires): add it as a new `[ ]` item in the right section immediately — don't hold it in your head.
- **Never delete tasks.** Completed tasks stay checked. Cancelled tasks get `~~strikethrough~~` plus a Changelog line explaining why.
- **At the start of every session:** read this file before doing anything else.

---

## Vision

Transform the existing measurable-goal tracker into a habit-formation app built around one core mechanic: **the locks system**. Users have a 100-lock daily budget that limits how much they can schedule, preventing overcommitment. Costs self-calibrate: succeed and habits get cheaper (approaching "habit formed" at cost 1), fail and they get more expensive (forcing focus, capped at 50). Planning happens the night before. Misses are neutral, never punished.

Non-negotiable design rules:
- **No streaks, ever.** Streaks incentivize lying. Progression = lock-cost trajectory per habit + % of days passed in last 30.
- **Non-punitive misses.** No streak resets, no shame UI. Copy reinforces: "If you missed a day, you won't lose all your progress."
- **Unplanned days are neutral.** No plan submitted = no cost adjustment, excluded from pass-rate denominator. FAIL only applies to planned days checked in with ≥1 miss.
- **Honor system with friction.** Pre-submit confirmation: "Is this truthful? If it's not, you're only hurting yourself."
- **Hardcoded habit catalog only.** No custom habits in MVP. Habits must be explicitly defined and consistent across people.
- **No auto-recurring schedules.** Every day is planned manually the night before.
- **Day boundaries = user's local timezone** (timezone cookie/setting captured at login). Never server UTC.
- **Measurable goals and habits coexist.** Two goal types, shared navigation. Existing weekly-rate tracker stays untouched.

---

## Current State (do not break)

Next.js 14 App Router on Vercel, Supabase Postgres (service-role key server-side only). Strict four-layer clean architecture: `domain/` → `application/` → `infrastructure/` → `interfaces/`. Dependencies point inward only. One use case per action, repositories injected via constructor, use cases return DTOs never raw entities. A composition root wires concrete repositories into use cases; nothing above infrastructure touches Supabase directly.

Working features that must keep working:
- Username-cookie auth gate (`usernameToUserId` deterministic UUID, no passwords), middleware redirect to `/login`
- `/home` — quick-log form + this-week status per active goal, optimistic client-side updates
- `/goals` — measurable goal CRUD (name, unit, weekly target rate, start/end date; session total derived from weekly rate)
- `/progress` — cumulative/weekly bar chart + completion donut via `ProjectionService` / `ProgressChartService` on the Goal entity
- `/history` — past log entries
- Daily Vercel keepalive cron (`/api/cron/keepalive`) through `ListGoalsUseCase`

---

## In Scope — TODO

### Phase 1: Domain model + persistence

**Entities & value objects (`domain/`)**
- [x] (2026-07-06) `Habit` entity: id, userId, catalogId, difficulty (easy/medium/hard), currentLockCost, state (active/paused/formed), createdAt. Self-validating invariants (cost between 1–50, valid catalogId).
- [x] (2026-07-06) `HabitCatalog` domain constant (NOT a DB table) — full list:
  - Physical: exercise, cold shower, stretch, floss, brush teeth twice, 10min morning walk
  - Addiction: no alcohol, no drugs, no fap, no soda, no smoking, no caffeine after noon
  - Mind: read 15min+, meditate 5min+
  - Skills: code 20min+, practice music 20min+
  - Misc: cook a meal, eat a serving of vegetables, reach out to friend/family, make bed, wear sunscreen
- [x] (2026-07-06) Each catalog entry: id, label, category, type (binary | timed), minMinutes where timed (20min rule: one session ≥20min counts, no extra credit for longer, never hourly)
- [x] (2026-07-06) `DailyPlan` entity: date (user-local), userId, scheduled habit ids, locksSpent (invariant: ≤100)
- [x] (2026-07-06) `CheckIn` entity: date, userId, per-habit pass/fail marks, derived dayResult (PASS = all passed, FAIL = any failed)
- [x] (2026-07-06) `JournalEntry` entity: date, userId, text?, mood?, photoUrl? (all optional)
- [x] (2026-07-06) `LockCostService` domain service:
  - [x] (2026-07-06) Initial costs: easy=25, medium=35, hard=45
  - [x] (2026-07-06) Day PASS → each habit in that day's plan: cost −1, floor 1
  - [x] (2026-07-06) Day FAIL → each habit in that day's plan: cost ×1.1 rounded, cap 50
  - [x] (2026-07-06) Cost reaches 1 → habit state transitions to `formed`
- [x] (2026-07-06) Unit tests for all entities + `LockCostService` (esp. rounding, cap, floor, formed transition) — 117 tests passing (`npm test`)

**Persistence (`infrastructure/`)**
- [x] (2026-07-06) `habits`, `daily_plans`, `check_ins`, `journal_entries` tables — added to `supabase/schema.sql` (this project has no `supabase/migrations/` — schema.sql is the single applied-by-hand source of truth, see `.claude/skills/supabase-migration`)
- [x] (2026-07-06) `SupabaseHabitRepository` implementing domain interface
- [x] (2026-07-06) `SupabaseDailyPlanRepository`
- [x] (2026-07-06) `SupabaseCheckInRepository`
- [x] (2026-07-06) `SupabaseJournalRepository`
- [ ] Supabase Storage bucket for journal photos (private, per-user path, ~2MB cap, one/day) — needs a bucket created in the Supabase dashboard (can't be done from the CLI/API keys on hand); `CreateJournalEntryUseCase` already accepts a `photoUrl` so wiring the actual upload is what's left
- [x] (2026-07-06) Register all new repos in composition root

**Use cases (`application/`)**
- [x] (2026-07-06) `CreateHabitsFromOnboardingUseCase` (bulk create from catalog selections + difficulty sort)
- [x] (2026-07-06) `GetActiveHabitsUseCase`
- [x] (2026-07-06) `UpdateHabitUseCase` — pause/resume done; "re-sort difficulty" split out below, deferred
- [ ] Re-sort a habit's difficulty post-creation — deferred: unclear whether changing difficulty should reset `currentLockCost` to the new difficulty's starting cost (erasing trajectory progress) or leave it as-is; needs a product decision before implementing
- [x] (2026-07-06) `CreateDailyPlanUseCase` (validates lock budget server-side from habits' actual current costs, never trusts client-supplied totals)
- [x] (2026-07-06) `GetTodayPlanUseCase`
- [x] (2026-07-06) `SubmitCheckInUseCase` (records marks, computes dayResult, applies LockCostService uniformly to every habit in the day's plan — not just the missed one) — "all transactional" not literally true: Supabase's client here has no cross-table transaction API, so habits are saved before the check-in itself to fail safer (see code comment)
- [x] (2026-07-06) `CreateJournalEntryUseCase` — entry creation done; "incl. photo upload path" split out below, deferred
- [ ] Wire actual photo upload to Supabase Storage in the journal flow — blocked on the Storage bucket task above
- [ ] `GetHabitStatsUseCase` (lock-cost trajectory, pass % last 30) — not started. Note: no cost-history table exists; the trajectory has to be reconstructed by replaying each habit's check-ins forward from its `initialCostFor(difficulty)` through `LockCostService.nextCost`, in date order. Worth a quick sanity-check before building since it's a new pattern (a replay/projection service), not just another repository-backed use case.
- [ ] `EditPastCheckInUseCase` (correct/add/delete past entries, recompute costs forward) — not started. Shares the same replay logic as `GetHabitStatsUseCase` above (editing a past day means replaying every check-in after it forward again) — likely worth factoring both into a shared domain/application service rather than duplicating the replay.

### Phase 2: Onboarding + planning UI

- [x] (2026-07-06) Timezone capture at login (cookie/setting) + user-local "today" helper used everywhere — `gt_tz` cookie via progressive-enhancement inline script on `/login`, `currentTimezone()`, `LocalDate.todayInTimezone()`; verified end-to-end against a running dev server (valid tz stored, invalid tz falls back to UTC, `/home` loads)
- [x] (2026-07-07) Onboarding route (`/onboarding`, standalone outside the tab shell — reachable on first visit or again later, re-runnable from Settings once Settings exists):
  - [x] (2026-07-07) Step 1: show full catalog grouped by category, select only habits user does NOT already track (existing habits shown disabled as "Already tracking")
  - [x] (2026-07-07) Step 2: sort selections into easy/medium/hard (green/amber/orange chips, tap to pick — not drag, simpler on mobile)
  - [x] (2026-07-07) Step 3: confirm → bulk create via `CreateHabitsFromOnboardingUseCase`
  - Verified end-to-end against the live Supabase project: page render (200), plus a direct use-case smoke test confirming create + fetch + already-tracked exclusion round-trip correctly (test rows cleaned up after)
  - First-visit handling: no hard auto-redirect — Home shows a "Want to build some habits too?" nudge card when the user has zero habits (see Home page update below), so onboarding stays optional rather than gating the app
- [x] (2026-07-07) Night-before planning screen (`/plan`): pick tomorrow's tasks from active habits, live remaining-lock counter (sticky bar, turns red over budget), submit disabled over 100
- [x] (2026-07-07) Home page update: today's scheduled habits (from `/plan`'s output) shown above the existing measurable-goal quick-log, read-only for now — checking them off is the Phase 3 check-in flow
- [x] (2026-07-07) Grace path: `/plan?for=today` — Home prompts "Plan today" when today has no plan at all, rather than dead-ending; target date (today vs. tomorrow) is still resolved server-side from the timezone, never a literal date from the client
  - Verified end-to-end against the live Supabase project: no-habits nudge, grace-path prompt, today's list, tomorrow's picker, and the already-planned view all confirmed working (test data cleaned up after)
- [x] (2026-07-07) Settings (`/settings`, linked from the app shell header): lists every habit including paused ones (`GetAllHabitsUseCase`, distinct from the plan/onboarding views which exclude paused), pause/resume per habit, link back into `/onboarding` to add more — "edit habit list" beyond pause/resume (e.g. re-sorting difficulty) still deferred, see the note under `UpdateHabitUseCase` above
  - Verified end-to-end against the live Supabase project: empty state, a paused habit showing correctly with a working Resume button, and confirmed a paused habit is excluded from `/plan` (test data cleaned up after)

**Phase 2 complete.**

### Phase 3: Check-in + journal + stats

- [ ] End-of-day check-in flow:
  - [ ] Screen 1 (mandatory): green check / red X per scheduled task — no rewards or cost changes shown here, just marks
  - [ ] Pre-submit confirm dialog: "Is this truthful?" + no-lost-progress reassurance copy
  - [ ] Screen 2 (optional): Private Journal — lock icon, explicit "nobody can see this" copy, 1–2 sentence note, mood rating, one photo
- [ ] Apply lock-cost adjustments on submit (via use case, transactional)
- [ ] `/progress` additions:
  - [ ] Per-habit lock-cost trajectory chart ("distance to habit formed")
  - [ ] % of planned days passed, last 30
  - [ ] Summary strip between graph and goals: "+X% vs yesterday / +X% avg this week"
  - [ ] Day pass/fail calendar view
- [ ] `/history` additions: past check-ins, edit/add/delete with forward cost recompute
- [ ] Journal history view (private, chronological)

### Phase 4: Polish + integration

- [ ] Unified nav between measurable goals and habits
- [ ] Empty states (no habits yet, no plan yet, no check-ins yet)
- [ ] Error states + loading states on all new screens
- [ ] Mobile layout pass on all new screens
- [ ] Optimistic updates on check-in flow (match existing /home feel)
- [ ] Keepalive cron updated if new tables need warming
- [ ] Copy pass: all shame-free language, journal privacy messaging

---

## Changelog

- 2026-07-06 — Initial plan created from idea-dump scoping session.
- 2026-07-06 — Converted open questions to resolved decisions (coexist model, local-timezone day boundaries, unplanned days neutral, Supabase Storage for photos, simple ± lock rule).
- 2026-07-06 — Restructured into Claude Code-optimized format: vision/current-state/TODO/changelog only; deferred and out-of-scope sections moved to separate scoping doc; maintenance protocol added; TODO expanded to granular task level.
- 2026-07-06 — Housekeeping before Phase 1: moved plan.md to docs/, wired maintenance protocol + architecture rules + a testing requirement into CLAUDE.md, added a Supabase keepalive cron, removed a stale scaffold README.md and a stale unused `supabase/migrations/0001_create_goals.sql` that described a different, never-built app (real schema stays in `supabase/schema.sql`), added `.claude/skills/supabase-migration`.
- 2026-07-06 — Switched the Supabase backend to a new project (old one is left alone, not deleted) and redeployed to Vercel production so the app is reachable on mobile; production env vars updated accordingly.
- 2026-07-06 — Phase 1 domain layer: added an unplanned `LocalDate` value object (not in the original task list) to carry the user-local calendar day used by `DailyPlan`/`CheckIn`/`JournalEntry`, since the non-negotiable "local timezone, never server UTC" rule needed a shared, unambiguous day type rather than reusing `Date`.
- 2026-07-06 — Phase 1 persistence + most use cases done. Split two tasks: `UpdateHabitUseCase`'s "re-sort difficulty" deferred (ambiguous whether it should reset lock cost — needs a product call); `CreateJournalEntryUseCase`'s "photo upload path" deferred (blocked on creating the Supabase Storage bucket, which needs the dashboard, not just API keys). `GetHabitStatsUseCase` and `EditPastCheckInUseCase` not started — both require replaying a habit's check-in history through `LockCostService` since no cost-history table exists; flagged as one shared piece of new design rather than two independent use cases. Also fixed `vitest.config.ts`, which had no "@/" alias resolution configured — a pre-existing gap, not introduced by this work, that only hadn't surfaced yet because every prior alias import happened to be type-only.
- 2026-07-07 — Phase 2 complete: onboarding wizard, `/plan` (tomorrow, plus a `?for=today` grace path), Home integration, and Settings, all verified end-to-end against the live Supabase project (real create/read/pause round-trips, test data cleaned up after each). Two small unplanned additions: `LocalDate.addDays` + an application-layer `LocalDateService` (today/tomorrow-in-a-timezone), and `GetHabitCatalogUseCase`/`GetAllHabitsUseCase` — both needed so `interfaces/` never has to import `domain/` directly, which came up twice as an actual mistake caught and fixed while building the onboarding and planning UI (see CLAUDE.md's dependency rule). First-visit onboarding ended up as a Home nudge card rather than a hard redirect — optional beats gating. "Edit habit list" in Settings is pause/resume only; re-sorting difficulty is still the deferred item from the Phase 1 entry above.
