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
- [ ] `Habit` entity: id, userId, catalogId, difficulty (easy/medium/hard), currentLockCost, state (active/paused/formed), createdAt. Self-validating invariants (cost between 1–50, valid catalogId).
- [ ] `HabitCatalog` domain constant (NOT a DB table) — full list:
  - Physical: exercise, cold shower, stretch, floss, brush teeth twice, 10min morning walk
  - Addiction: no alcohol, no drugs, no fap, no soda, no smoking, no caffeine after noon
  - Mind: read 15min+, meditate 5min+
  - Skills: code 20min+, practice music 20min+
  - Misc: cook a meal, eat a serving of vegetables, reach out to friend/family, make bed, wear sunscreen
- [ ] Each catalog entry: id, label, category, type (binary | timed), minMinutes where timed (20min rule: one session ≥20min counts, no extra credit for longer, never hourly)
- [ ] `DailyPlan` entity: date (user-local), userId, scheduled habit ids, locksSpent (invariant: ≤100)
- [ ] `CheckIn` entity: date, userId, per-habit pass/fail marks, derived dayResult (PASS = all passed, FAIL = any failed)
- [ ] `JournalEntry` entity: date, userId, text?, mood?, photoUrl? (all optional)
- [ ] `LockCostService` domain service:
  - [ ] Initial costs: easy=25, medium=35, hard=45
  - [ ] Day PASS → each habit in that day's plan: cost −1, floor 1
  - [ ] Day FAIL → each habit in that day's plan: cost ×1.1 rounded, cap 50
  - [ ] Cost reaches 1 → habit state transitions to `formed`
- [ ] Unit tests for all entities + `LockCostService` (esp. rounding, cap, floor, formed transition)

**Persistence (`infrastructure/`)**
- [ ] Supabase migrations: `habits`, `daily_plans`, `check_ins`, `journal_entries` tables
- [ ] `SupabaseHabitRepository` implementing domain interface
- [ ] `SupabaseDailyPlanRepository`
- [ ] `SupabaseCheckInRepository`
- [ ] `SupabaseJournalRepository`
- [ ] Supabase Storage bucket for journal photos (private, per-user path, ~2MB cap, one/day)
- [ ] Register all new repos in composition root

**Use cases (`application/`)**
- [ ] `CreateHabitsFromOnboardingUseCase` (bulk create from catalog selections + difficulty sort)
- [ ] `GetActiveHabitsUseCase`
- [ ] `UpdateHabitUseCase` (pause/resume, re-sort difficulty)
- [ ] `CreateDailyPlanUseCase` (validates lock budget)
- [ ] `GetTodayPlanUseCase`
- [ ] `SubmitCheckInUseCase` (records marks, computes dayResult, applies LockCostService, all transactional)
- [ ] `CreateJournalEntryUseCase` (incl. photo upload path)
- [ ] `GetHabitStatsUseCase` (lock-cost trajectory, pass % last 30)
- [ ] `EditPastCheckInUseCase` (correct/add/delete past entries, recompute costs forward)

### Phase 2: Onboarding + planning UI

- [ ] Timezone capture at login (cookie/setting) + user-local "today" helper used everywhere
- [ ] Onboarding route (first visit post-login, re-runnable from settings):
  - [ ] Step 1: show full catalog, select only habits user does NOT already do
  - [ ] Step 2: sort selections into easy/medium/hard buckets (green/yellow/orange), drag or tap
  - [ ] Step 3: confirm → bulk create via use case
- [ ] Night-before planning screen: pick tomorrow's tasks from active habits, live remaining-lock counter, block submit over 100
- [ ] Home page update: show today's scheduled tasks from last night's plan alongside existing measurable-goal quick-log
- [ ] Grace path: no plan for today → prompt to plan now (don't dead-end)
- [ ] Settings: edit habit list / re-run onboarding / pause habits

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
