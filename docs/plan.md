# plan.md — Goal Tracker Habit Overhaul (+ Goal/Habit Unification)

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
- **No streaks, ever.** Streaks incentivize lying. Progression = lock-cost trajectory per goal + % of days passed in last 30.
- **Non-punitive misses.** No streak resets, no shame UI. Copy reinforces: "If you missed a day, you won't lose all your progress."
- **Unplanned days are neutral.** No plan submitted = no cost adjustment, excluded from pass-rate denominator. FAIL only applies to planned days checked in with ≥1 miss.
- **Honor system with friction.** Pre-submit confirmation: "Is this truthful? If it's not, you're only hurting yourself."
- **No auto-recurring schedules.** Every day is planned manually the night before.
- **Day boundaries = user's local timezone** (timezone cookie/setting captured at login). Never server UTC.
- ~~Hardcoded habit catalog only. No custom habits in MVP.~~ **Superseded 2026-07-08** — see Phase 5. Goals are now freeform (any name), with the old catalog kept only as optional "quick add" suggestions.
- ~~Measurable goals and habits coexist. Two goal types, shared navigation.~~ **Superseded 2026-07-08** — see Phase 5. The two systems were merged into one `Goal` concept; there is no longer a numeric-target goal type.

---

## Current State (do not break)

Next.js 14 App Router on Vercel, Supabase Postgres (service-role key server-side only). Strict four-layer clean architecture: `domain/` → `application/` → `infrastructure/` → `interfaces/`. Dependencies point inward only. One use case per action, repositories injected via constructor, use cases return DTOs never raw entities. A composition root wires concrete repositories into use cases; nothing above infrastructure touches Supabase directly.

As of 2026-07-08 (Phase 5), there is a single unified `Goal` concept — see that
section below for the full rationale. The old split between a numeric-target
"goal" and a catalog-bound "habit" no longer exists.

Working features that must keep working:
- Username-cookie auth gate (`usernameToUserId` deterministic UUID, no passwords), middleware redirect to `/login`
- `/home` — today's scheduled goals (from last night's `/plan`) + check-in/plan-tomorrow entry points
- `/goals` — unified goal CRUD: freeform name, weekly frequency target, difficulty (set once, at creation), pause/resume, delete
- `/onboarding` — first-run wizard: pick suggested goal ideas or type your own, set difficulty + weekly frequency, confirm
- `/plan` — night-before planning within the 100-lock budget (`?for=today` grace path for a day with no plan at all)
- `/checkin` — end-of-day pass/fail marks per scheduled goal + optional private journal entry
- `/progress` — per-goal lock-cost trajectory chart, gamified "this week X/N" pips, 30-day pass rate, pass/fail calendar
- `/history` — past check-ins: edit, delete, or backfill a missed day
- `/journal` — private, chronological journal entries
- Daily Vercel keepalive cron (`/api/cron/keepalive`) through `GetAllGoalsUseCase`

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

- [x] (2026-07-07) End-of-day check-in flow (`/checkin`, linked from Home):
  - [x] (2026-07-07) Screen 1 (mandatory): green ✓ / red ✗ per scheduled habit — no cost/reward numbers shown here, just marks; "Continue" disabled until every habit is marked
  - [x] (2026-07-07) Pre-submit confirm dialog: "Is this truthful?" + no-lost-progress reassurance copy
  - [x] (2026-07-07) Screen 2 (optional): Private Journal — lock emoji, "nobody can see this" copy, short text note (280 char cap), mood 1–5. **Photo still deferred** — blocked on the Storage bucket, same as the Phase 1 note
- [x] (2026-07-07) Apply lock-cost adjustments on submit via `SubmitCheckInUseCase` (already built in Phase 1) — "transactional" caveat from that phase still applies (habits save before the check-in row, see code comment)
  - Verified end-to-end against the live Supabase project, specifically the uniform-day-result rule: a habit individually marked passed still got the FAIL cost bump because a different scheduled habit was missed (25→28, 35→39, matching `LockCostService` exactly). Already-checked-in days correctly show a read-only summary instead of re-prompting. Test data cleaned up after.
- [x] (2026-07-07) `/progress` additions:
  - [x] (2026-07-07) Per-habit lock-cost trajectory chart ("distance to habit formed") — `HabitTrajectoryService` (domain) replays each habit's check-ins through `LockCostService` from its difficulty's starting cost, since no cost-history table exists; `GetHabitStatsUseCase` exposes it
  - [x] (2026-07-07) % of planned days passed, last 30 — same use case, windowed to the habit's check-ins in the last 30 days
  - [ ] Summary strip between graph and goals: "+X% vs yesterday / +X% avg this week" — **not built, deliberately**: unclear what metric this refers to (habit pass rate? goal completion? both?) and guessing risked throwaway work: needs a product call
  - [x] (2026-07-07) Day pass/fail calendar view — `GetCheckInHistoryUseCase` + `DayResultCalendar`, 30-day grid, grey (not red) for days with no check-in per the "unplanned days are neutral" rule
  - Verified end-to-end against the live Supabase project: 5 real check-ins produced a trajectory (24,23,25,24,23) and 80% pass rate matching manual calculation exactly. Test data cleaned up after.
- [x] (2026-07-07) `/history` additions: past check-ins (Check-ins section, above the existing goal-log history), edit/add/delete with forward cost recompute
  - Along the way, refactored the cost-update mechanism itself: `SubmitCheckInUseCase` previously incremented from the habit's currently-stored cost, which silently assumed check-ins always arrive in date order — backfilling a missed past day would have broken that. Replaced with `HabitCostRecomputeService`, which always replays a habit's full check-in history from scratch (`HabitTrajectoryService`) and overwrites the stored cost. `EditCheckInUseCase` and `DeleteCheckInUseCase` use the same primitive, so there's no separate "forward recompute" algorithm to get wrong — correcting or removing any day is the same operation as submitting one.
  - Verified end-to-end against the live Supabase project: submit (25→28 on FAIL, 28→27 on PASS), edit the first day FAIL→PASS recomputed forward to 23, delete that day recomputed to 24 from the remaining history alone — all matched hand-calculated expectations exactly.
- [x] (2026-07-07) Journal history view (private, chronological) — `/journal`, linked from Settings, read-only, mood emoji

**Phase 3 complete.**

### Phase 4: Polish + integration

Most of this phase turned out to already be satisfied by design decisions made
while building Phases 2–3, rather than needing new work — each item below was
audited (not assumed) and the audit result is noted. One real gap found and
fixed: History had no link to Journal despite being closely related.

- [x] (2026-07-08) Unified nav between measurable goals and habits — audited: this was a design choice from the start, not an afterthought. Habits were folded into the existing 4 tabs (Home shows today's habits + goal quick-log, Progress shows habit trajectories + goal charts, History shows check-ins + goal logs) rather than given parallel tabs, so there's one nav, not two. Flow pages (`/onboarding`, `/plan`, `/checkin`, `/settings`, `/journal`) are reachable via contextual links, matching how `/login` already worked before any of this existed. Added the one real gap found: History → Journal link.
- [x] (2026-07-08) Empty states (no habits yet, no plan yet, no check-ins yet) — audited: already comprehensive from Phase 2/3 work — Home (no habits / no plan), `/plan` (no habits to plan), `/checkin` (nothing planned), `/settings` (no habits), `/history` (no check-ins), `/journal` (no entries), `/progress` (habits section hidden entirely when there are none). No gaps found.
- [x] (2026-07-08) Error states + loading states on all new screens — audited: every new form/action follows the existing `GoalForm`/`QuickLogForm` convention (inline `role="alert"` error text, disabled button + "…ing" pending label during a transition). No `loading.tsx`/`error.tsx` files exist anywhere in the app, old or new — introducing that pattern now would be inconsistent with the rest of the codebase, not a gap in the new work specifically.
- [x] (2026-07-08) Mobile layout pass on all new screens — audited via code review (grep for hardcoded non-responsive widths: none found; confirmed the `flex-col-reverse sm:flex-row` button-stacking pattern and the `xs:` breakpoint convention were followed consistently in every new component). **Caveat**: this is a code-level audit, not a visual check in an actual mobile viewport — no browser-automation tool was available this session to screenshot at a phone width.
- [x] (2026-07-08) Optimistic updates on check-in flow (match existing /home feel) — audited: the existing "optimistic" pattern in this codebase is client-side step transitions with no full page reload, updating from the action's returned data (see `QuickLogForm`) — not true pre-confirmation optimism. `CheckInFlow` already matches this: marks → confirm → journal are instant local state transitions, only the final submit hits the server, and revalidated pages update via Next.js navigation afterward.
- [x] (2026-07-08) Keepalive cron updated if new tables need warming — audited: Supabase free-tier pausing is inactivity at the *project* level, not per-table, so a query against any one table (the cron already pings `goals`) keeps the whole project warm. No change needed.
- [x] (2026-07-08) Copy pass: all shame-free language, journal privacy messaging — audited via grep across every new component for shame/streak language: none found. Copy is neutral ("Pass"/"Fail"/"Missed", not "you failed"). The required reassurance line ("a missed day never erases your progress") appears in both the pre-submit confirm dialog and the already-checked-in view. Journal privacy framing ("🔒 nobody can see this") appears on `/checkin`'s journal screen, `/journal`'s header, and the Settings link to it.

**Phase 4 complete. All four phases of the habit system are now built.**

### Phase 5: Unify measurable goals and habits into one `Goal` concept

Prompted directly by user feedback that having two parallel systems (a
numeric-target "goal" and a catalog-bound "habit") on one screen was
confusing, given they're conceptually the same thing: "do A N times a week."
Resolved via four decisions (freeform custom entry integrated into one UI;
binary check-off only, numeric amount-based logging dropped entirely; fresh
start, old goals/goal_sessions/logs tables retired rather than migrated;
leave the existing 50-point lock-cost cap as the "keep missing it → it's the
only thing you can schedule" mechanic, no new explicit rule).

- [x] (2026-07-08) Domain: replace `Goal` (old numeric) + `Habit` with one `Goal` entity — `{id, userId, name (freeform), weeklyFrequencyTarget (1-7), difficulty, currentLockCost, state, createdAt}`. Difficulty is set at creation and intentionally not editable after (it seeds `GoalTrajectoryService`'s replayed cost trajectory; changing it post-hoc would retroactively rewrite historical chart data). `edit()` covers name/weeklyFrequencyTarget only.
- [x] (2026-07-08) Domain: `HabitCatalog` → `GoalSuggestions` — simplified `{label, category}`, no longer a binding catalog (no id/type/minMinutes); onboarding/`/goals` treat it as optional autofill, not a closed list.
- [x] (2026-07-08) Domain: `LocalDate.startOfWeek()` added (Monday-anchored) to support the new "this week X/N" gamification stat.
- [x] (2026-07-08) Domain: deleted `LogEntry`, `SessionTimeframe`, `ProjectionService`, `ProgressChartService`, and the old `GoalRepository`/`LogRepository` — the numeric-goal system's entire supporting cast.
- [x] (2026-07-08) Application: rebuilt the use-case set around the unified `Goal` — `CreateGoalUseCase`, `CreateGoalsFromOnboardingUseCase`, `EditGoalUseCase` (new), `UpdateGoalUseCase` (pause/resume), `DeleteGoalUseCase` (new — goals had no delete before), `GetActiveGoalsUseCase`, `GetAllGoalsUseCase`, `GetGoalSuggestionsUseCase`, `GetGoalStatsUseCase` (added a `thisWeek: {completed, target}` field for the gamified Progress badge). Deleted the old numeric-goal use cases (`LogProgressUseCase`, `GetProgressDataUseCase`, `GetHistoryUseCase`, `DeleteLogUseCase`, etc.) wholesale.
- [x] (2026-07-08) Application: along the way, found `LogMapper.ts` and `ProgressMapper.ts` had zero consumers anywhere in the codebase (confirmed via grep) — deleted as dead scaffold code, not part of the migration itself.
- [x] (2026-07-08) Infrastructure: `SupabaseGoalRepository` (reusing the freed name) implements the unified repository, `delete()` added. Kept the physical DB names from the old `habits` table/`habit_ids` column/`habitId` jsonb key as-is — translated to the domain's `Goal`/`goalIds`/`goalId` only at the repository boundary — specifically to avoid a data migration on top of the schema migration. Documented inline everywhere this happens so the naming mismatch doesn't confuse a future reader.
- [x] (2026-07-08) DB: `supabase/schema.sql` rewritten — drops `logs`/`goal_sessions`/`goals`; `habits` table gets `name` (backfilled from `catalog_id`) and `weekly_frequency_target` (backfilled to 3) columns, `catalog_id` dropped. Migration is idempotent (safe to re-run) and was run by the user directly in the Supabase SQL Editor, then verified end-to-end (see below).
- [x] (2026-07-08) Interfaces: full UI rebuild — `/goals` is now the single create/edit/pause/resume/delete surface (replaces both the old numeric-goal CRUD and `/settings`'s habit pause/resume list); `/settings` deleted entirely, its one other link (Journal) moved into the app shell header. `/onboarding` rewritten for freeform + suggestion-autofill entry with a weekly-frequency stepper added alongside difficulty. `/plan`, `/checkin`, `/home`, `/progress`, `/history` all renamed from Habit-flavored to Goal-flavored (types, props, copy). `/progress` gained a "this week X/N" pip row per goal (the "more gamified" ask) and a "✓ Formed" badge. Deleted the `/demo` mock-data route and its Makefile/`SETUP.md` references (unrelated dead weight surfaced during the sweep, not part of the ask itself).
- [x] (2026-07-08) Verification: `npm run type-check` / `test` (129 passing) / `lint` / `build` all clean. End-to-end against the live Supabase project after the user ran the migration: goal creation, planning, check-in with the uniform-day-result cost bump, edit-check-in-with-forward-recompute, `thisWeek` stat, goal rename, pause/resume all matched hand-calculated expectations exactly; all 8 pages returned 200 with a signed-in session and rendered the right content (spot-checked via curl against the rendered HTML, since no browser-automation tool was available this session). Test data cleaned up from Supabase after.
- [x] (2026-07-08) Docs: README.md rewritten (pages table, Clean Architecture section, tech stack) to describe the unified system instead of the old split one; SETUP.md's `/demo` callout removed; this plan updated.

**Phase 5 complete.**

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
- 2026-07-07/08 — Phase 3 complete: check-in flow, `/progress` trajectory chart + pass-rate + calendar, `/history` check-in edit/add/delete, `/journal`. The check-in cost math got a real correctness fix along the way (see the `/history` entry above for detail) — `HabitCostRecomputeService`'s full-replay approach is now what every cost update goes through, not just the edit/delete ones that needed it. The ambiguous "summary strip" item from the original Progress spec was deliberately left unbuilt rather than guessed.
- 2026-07-08 — Phase 4 complete: mostly an audit rather than new work — see that section for what was checked and why each item was already satisfied. One real fix (History → Journal link). **All four phases done.** Known deferred items, still open: re-sorting a habit's difficulty (Phase 1, needs a product call on whether it resets cost), journal photo upload (Phase 1/3, needs a Storage bucket created in the Supabase dashboard), and the Progress page's ambiguous "summary strip" (Phase 3, needs the metric clarified). Everything else across all four phases was verified end-to-end against the live Supabase project, not just unit-tested.
- 2026-07-08 — **Scope change, user-directed**: user flagged that shipping two parallel systems (numeric-target goals + catalog-bound habits) on one screen was confusing rather than useful, and asked for them to be merged into one `Goal` concept with a rebuilt, more gamified UI — see Phase 5. This retires the "measurable goals and habits coexist" and "hardcoded habit catalog only" rules from the original Vision (struck through above, not deleted, per this file's own protocol) and supersedes several completed Phase 1–4 items' *underlying entities* (the `Habit`/`HabitCatalog`/old-`Goal` types), even though those phases' checklist items themselves stay checked — the work they describe genuinely happened and was verified at the time; Phase 5 is what replaced its outputs, not what undid the effort. The re-sort-difficulty-post-creation deferral (Phase 1) is now resolved as "intentionally never editable" rather than left open — see Phase 5's first entry for why. Photo upload and the ambiguous summary-strip deferrals are unaffected and still open.
- 2026-07-08 — Phase 5 complete: unification shipped, migration run by the user against the live Supabase project, and verified end-to-end (see Phase 5 section for specifics). This is the plan's current state going forward — treat the "Working features" list under Current State as authoritative over any Phase 1–4 description of `Habit`/old-`Goal` mechanics, which are historical record of how the app got here, not what it currently does.
