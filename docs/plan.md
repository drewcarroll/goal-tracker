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
- **Unplanned days are neutral.** No plan submitted = no cost adjustment, excluded from pass-rate denominator. ~~FAIL only applies to planned days checked in with ≥1 miss.~~ **Amended 2026-07-13** — day-level FAIL (≥1 miss) still exists for the /progress calendar display, but cost adjustments are now per-goal (each goal's own ✓/✗), see Phase 6.
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

As of 2026-07-16 (Phase 10), goals have NO difficulty field (every goal starts
at the same lock cost — see `docs/lock-formula.md` §3.1).

As of 2026-07-16 (Phase 11), the nav is six tabs: Home, Goals, Schedule,
Friends, Trinkets, Profile. `/progress`, `/history`, and `/journal` no longer
exist as standalone routes — see the Phase 10 section for where their
functionality moved. Every goal has an `isPublic` flag (default `true`); a
username registry backs a friend system; a coin/trinket economy (battle pass
+ shop + feed) layers on top of the nightly check-in flow.

Working features that must keep working:
- Username-cookie auth gate (`usernameToUserId` deterministic UUID, no passwords), middleware redirect to `/login`; best-effort username registration into `usernames` at login (Phase 11)
- `/home` — today's scheduled goals (from last night's `/plan`) + check-in/schedule-tomorrow entry points + the battle-pass day strip (Phase 11)
- `/goals` — unified goal CRUD: freeform name, weekly frequency target, public/private toggle, pause/resume, delete; each card shows a compact habit-strength graph and the weekly key-capacity meter
- `/goals/[id]` — one goal's full habit-strength graph (colored pass/fail points, green/red 14-day projection), times completed, 30-day pass rate
- `/onboarding` — first-run wizard: pick suggested goal ideas or type your own, set weekly frequency, confirm (no difficulty step)
- `/plan` — night-before scheduling within the 100-key budget (`?for=today` grace path for a day with no plan at all); the "Schedule" nav tab
- `/checkin` — end-of-day pass/fail marks per scheduled goal + optional private journal entry + an automatic battle-pass day claim as the flow's last celebration step (Phase 11)
- `/friends` — send/accept/decline/cancel friend requests by username, friends list; `/friends/[username]` — a friend's PUBLIC-only goals, stats, and daily log (Phase 11)
- `/trinkets` — one tab, four segments: Battle Pass month calendar (with truncation), Shop (daily 5-slot rotation, flat pricing), Collection (owned trinkets, quantity-tracked), Feed (friends' claims/purchases) (Phase 11)
- `/profile` — rank/XP hero, check-in history with each day's journal note shown inline, collapsed Advanced section (check-in window settings, password-gated dev mode with BOTH lock-formula and economy constants panels)
- App-wide maintenance banner: if the current month has no entry in the 12-month battle-pass trinket map (July 2026 - June 2027, hardcoded on purpose), the `(app)` layout blocks all normal rendering behind a full-screen red banner (Phase 11)
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

### Phase 6: Psychology-grounded lock formula + nightly-log ranks + profile/dev mode

**Full specification lives in `docs/lock-formula.md` (the formula: research, math,
constants, worked examples) and `docs/progression.md` (ranks, check-in window,
dev mode, schema). Read BOTH before implementing anything here — this checklist is
the progress tracker, those files are the design. If a session ends mid-task, add a
"state right now / next step" note under the open item so a cold session can resume.**

Scope decisions (user-confirmed 2026-07-13): per-goal cost contingency replaces the
uniform day-result rule; rank points come from submitting the nightly log on time
(NOT from passing goals); check-in gated to a per-user window (default 14:00–07:00);
new /profile page hosts rank + window settings + password-gated dev-mode constants
editor (password `drew`); formula constants runtime-tweakable and retroactive via
the replay architecture.

**Docs (do first — session-continuity protocol)**
- [x] (2026-07-13) `docs/lock-formula.md` — research citations, formula, constants table, worked examples, tuning guide, retroactivity notes
- [x] (2026-07-13) `docs/progression.md` — three progression tracks, rank thresholds/colors, check-in window & logical-day rules, dev-mode manual, schema spec
- [x] (2026-07-13) This Phase 6 section added to plan.md

**Domain (`src/domain/`) — each with co-located Vitest tests**
- [x] (2026-07-13) `value-objects/LockFormulaConfig.ts` — config type, `DEFAULT_LOCK_FORMULA_CONFIG`, `LOCK_FORMULA_BOUNDS` (validation ranges), `lockFormulaConfigFrom(override)` deep-merge helper
- [x] (2026-07-13) Rewrite `services/LockCostService.ts` — config-injected; `initialCostFor` / `initialState` / `step(state, passed, difficulty)` / `costFor` / `isFormed`; tests cover all docs §6 worked examples + the formation simulation (medium ~60 days, easy<medium<hard)
- [x] (2026-07-13) Rewrite `services/GoalTrajectoryService.ts` — returns `GoalTrajectory {points, finalState, finalCost, timesCompleted, nextIfPass, nextIfFail}`; replays the goal's OWN marks; constructor-injected LockCostService (no longer a static instance)
- [x] (2026-07-13) `entities/Goal.ts` — `create` takes `initialLockCost` (validated 1–50), static LockCostService and `applyDayResult` removed; `recomputeCost` unchanged semantics (formed = cost ≤ 1, both directions)
- [x] (2026-07-13) `services/RankService.ts` — `RANK_THRESHOLDS`, `rankFor` (0 points → Rank 1), `nextThreshold`, `maxRank`
- [x] (2026-07-13) `services/CheckInWindowService.ts` — `resolve(localDate, minutesSinceMidnight, times)` → open+targetDate | closed+opensAt/closedAt; `assertValidWindow` (end < 12:00 ≤ start); `DEFAULT_CHECKIN_WINDOW` 14:00/07:00 lives here
- [x] (2026-07-13) `entities/CheckIn.ts` — `submittedOnTime` prop + getter, required in `create`/`rehydrate`
- [x] (2026-07-13) Ports: `repositories/ConfigRepository.ts` (get/save/reset lock formula config), `repositories/UserSettingsRepository.ts` (`UserSettings {userId, checkInWindow}`; find returns defaults when no row)

**Infrastructure**
- [x] (2026-07-13) `supabase/schema.sql` — `app_config`, `user_settings` (HH:MM text + regex checks), `check_ins.submitted_on_time` (existing rows backfilled `true`, default `false`); idempotent; **user still needs to run it in the SQL Editor before e2e verification**
- [x] (2026-07-13) `SupabaseConfigRepository` (merges override via `lockFormulaConfigFrom`), `SupabaseUserSettingsRepository` (defaults when no row); `SupabaseCheckInRepository` maps `submitted_on_time`
- [x] (2026-07-13) `container.ts` — new repos wired; `GoalCostRecomputeService` and `CheckInWindowResolver` are now shared container-level services injected into the check-in use cases (no longer `new`ed inline)

**Application (`src/application/`) — each with tests**
- [x] (2026-07-13) `GoalCostRecomputeService` — ConfigRepository injected, config fetched per recompute; `recomputeMany` fetches config+check-ins once
- [x] (2026-07-13) `GetGoalStatsUseCase` — per-goal marks for last30/thisWeek; DTO gains `timesCompleted`, `nextIfPass`, `nextIfFail`
- [x] (2026-07-13) `SubmitCheckInUseCase` — DTO is now `{userId, timezone, marks}` (no client date); target date resolved via new `CheckInWindowResolver` app service; rejects with `CheckInWindowClosedError` when closed; stamps `submittedOnTime: true`
- [x] (2026-07-13) **Split**: `BackfillCheckInUseCase` (new) — /history's add-past-day path, stamps `submittedOnTime: false`, no window gate; `EditCheckInUseCase` preserves the existing flag (edits can't mint rank points); `DeleteCheckInUseCase` slimmed (recompute service injected)
- [x] (2026-07-13) `GetRankUseCase` (+`RankDTO`), `GetCheckInWindowUseCase`, `CheckInWindowResolver` app service (timezone→wall-clock minutes via Intl)
- [x] (2026-07-13) `GetUserSettingsUseCase` / `UpdateUserSettingsUseCase` (window validation via domain)
- [x] (2026-07-13) `GetLockFormulaConfigUseCase` (config+defaults+bounds for dev panel) / `UpdateLockFormulaConfigUseCase` / `ResetLockFormulaConfigUseCase` / `RecomputeAllGoalsUseCase`
- [x] (2026-07-13) `CreateGoalUseCase` / `CreateGoalsFromOnboardingUseCase` — initial cost from current config (ConfigRepository injected); `Goal.create` takes `initialLockCost`
- [x] (2026-07-13) All tests updated/added — 188 passing (`npm test`), old-formula expectations replaced with hand-computed new-formula values matching docs/lock-formula.md §6

**Interfaces (`src/interfaces/web/`)**
- [x] (2026-07-13) Header profile section in `(app)/layout.tsx`: rank-colored username + `RankBadge` linking to /profile; `components/profile/rankColors.ts` + `RankBadge.tsx`
- [x] (2026-07-13) `/profile` page + actions: rank hero (big badge, colored name, progress bar), `WindowSettingsForm`, `DevModePanel` (password `drew` → httpOnly `gt_dev` session cookie, checked server-side in every config-mutating action; constants grid from the DTO's bounds; Save / Reset / Recompute-all / Lock; retroactivity warning)
- [x] (2026-07-13) `/checkin` — page gated by `GetCheckInWindowUseCase` (closed state shows opensAt/closedAt, neutral copy, link to profile); plan/check-in queries use the window's logical `targetDate` (a 1 AM visit shows yesterday's plan); confirm copy "Going to sleep? Is this truthful?"; new celebrate step (+1 point / rank-up with badge) between confirm and journal; journal entry anchored to the same logical day; `/history`'s add-past-day switched to `backfillCheckInUseCase`
- [x] (2026-07-13) `/progress` cards — "Times completed: X" line, green/red dashed ghost projections on the chart (connected to the last real point, plus a text line; text-only preview when no check-ins yet)

**Discovered work (added mid-build)**
- [x] (2026-07-14) `/home` uses the window's logical day too — at 1 AM Home now shows the night-you're-still-living's plan, consistent with /checkin (was: raw calendar day, which flips at midnight)

**Verification**
- [x] (2026-07-14) `npm test` (188) / `type-check` / `lint` / `build` all clean
- [x] (2026-07-14) Migration run by the user in the Supabase SQL Editor ("Success. No rows returned")
- [x] (2026-07-14) End-to-end vs live Supabase via a throwaway vitest file (deleted after) exercising the real container: goal creation at config costs (35/25); plan (60 locks); nightly submit with mixed marks — **per-goal contingency confirmed live** (passed goal 35→30 while the day read FAIL; failed goal 25→33); rank = exactly 1 point from the on-time log (thresholds intact); backfill of a past day earned no point but replayed costs correctly (→26); stats (timesCompleted 2, pass projection < fail projection); editing the past day to a fail recomputed forward (→37) with the not-on-time flag frozen; dev-mode constant tweak (`calibrationBoost:1, gainRate:0.12`) + recompute-all rewrote costs retroactively (37→36, 33→31), reset + recompute-all restored them exactly; deleting the past day recomputed from the remainder (→30); goal deletion; all rows cleaned up (verified zero leftovers). Every number matched the hand-computed values in docs/lock-formula.md §6.
- [x] (2026-07-14) Window edges live: a past-midnight timezone resolved open-for-YESTERDAY; a mid-morning timezone was closed and the submit was rejected with `CHECKIN_WINDOW_CLOSED` (checked by iterating real IANA timezones rather than mocking the clock)

---

### Phase 7: XP rank formula + visual identity (user-directed, 2026-07-14)

Spec updated in `docs/progression.md` §2 (read it first). Summary of what shipped:

- [x] (2026-07-14) `RankService` rewritten around the formula `c(k) = max(1, round(C − (C−1)·r^(k−1)))`, C=7, r=0.8: first log ranks you up, costs ramp 1/2/3/4/5/5/5/6..., flattening to one rank per 7 logs forever (eventually-linear, no cap). XP layer: 1 log = 500 XP (`XP_PER_LOG`). `progressFor(logs)` returns rank/xp/xpIntoRank/xpForRankUp. Threshold array deleted. Tests assert the full documented cost sequence and day-reached table.
- [x] (2026-07-14) `RankDTO`/`GetRankUseCase` reshaped to XP fields (+`xpPerLog`, `nextRank`); check-in action returns `{xpEarned, xp, rank, nextRank, xpIntoRank, xpForRankUp, rankedUp}`.
- [x] (2026-07-14) Programmatic rank visuals (`rankVisual(rank)`): continuous hue journey stone→bronze→green→teal→blue→violet→fuchsia across ranks 1-30 with rising saturation; tier ornaments every 5 ranks (gradient fill, double ring, glow). Adjacent ranks look related. `RankBadge` renders via inline styles (sm/md/lg).
- [x] (2026-07-14) /profile rank card: current-rank badge LEFT of the progress bar, next-rank badge RIGHT, gradient bar between, gap-to-goal copy ("N XP to Rank R+1"). Explainer prose removed (show don't tell). Check-in window + dev mode moved into a collapsed Advanced `<details>` section. Journal row with icon.
- [x] (2026-07-14) /checkin: confirm button is "Submit +500 XP"; celebration screen redesigned (pop-in badge, rise-in text, RANK UP treatment in the new rank's color, badge-to-badge progress bar). CSS keyframes in globals.css.
- [x] (2026-07-14) No emojis anywhere: custom SVG icon set added (`components/icons.tsx`: lock, moon, alert-triangle, chevron, wrench, bolt); all emoji swapped out (journal, history, checkin closed state, dev panel, celebrate).
- [x] (2026-07-14) Brand refresh: indigo → midnight violet (#7c3aed / #6d28d9) across tailwind config, viewport themeColor, chart theme, background wash.
- [x] (2026-07-14) Mobile overflow pass: min-w-0/truncate guards on goal-name rows (plan picker, history backfill, trajectory card header), dev-panel grid inputs, header pill max-width, profile card overflow-hidden.

### Phase 8: Weekly commitment mechanics + form polish (user-directed, 2026-07-14)

Spec lives in `docs/lock-formula.md` §3.4. Summary:

- [x] (2026-07-14) ~~**Weekly slack rule** — a planned-day miss is a FAIL step only when it sinks the Mon-Sun week; otherwise neutral (recoverable).~~ **Removed same day, user decision** (see changelog round 5): a planned miss now ALWAYS takes the fail step — scheduling is the commitment — which closes the lower-the-target-to-erase-misses loophole. `LocalDate.dayOfWeekIndex()` (added for this) remains.
- [x] (2026-07-14) **Commitment pricing** — new dev-tweakable constant `frequencyWeight` (default 0.5): cost multiplier φ(T)=1−w·(7−T)/6. `costFor`/`initialCostFor` take the weekly target; creation and every recompute price it in.
- [x] (2026-07-14) **Escape valve** — `EditGoalUseCase` recomputes the goal when the target changes: lowering an over-ambitious 7×/week both discounts via φ AND retroactively forgives misses that fit the easier week. Hint copy added to the goal edit form.
- [x] (2026-07-14) Goal forms: weekly frequency is now a 1–7 slider (`FrequencySlider`, shared by /goals and onboarding; kills the "07" number-input artifact); difficulty question reworded to "How hard do you think this will be to accomplish?"; name placeholder removed; suggestions replaced with a flat 7-item list (Gym, Cold shower, Floss, Stretch, Sober, No caffeine after 12pm, Play guitar) — `GoalSuggestions` is now `readonly string[]`, categories/tabs deleted from domain, DTO, and onboarding.
- [x] (2026-07-14) Dev-mode unlock row overflow fixed (input min-w-0, button shrink-0).
- [x] (2026-07-14) Test fixtures asserting absolute costs moved to 7×/week (φ=1, misses always breaking) so all docs §6 numbers still hold; new tests cover φ scaling, recoverable-vs-breaking misses, weekly reset, and the retroactive-forgiveness edit. 200 tests passing.

### Phase 9: Weekly capacity + concise UI (user-directed, 2026-07-14)

Spec: `docs/lock-formula.md` §3.4 (revised) and §3.5. Summary:

- [x] (2026-07-14) **Slack rule removed** (user decision mid-build): every planned miss takes the fail step regardless of target; target edits are unrestricted (even mid-week) because they only re-price via φ and can never erase a miss. `stepRecoverableMiss` deleted; trajectory replay simplified back to pure per-mark stepping; `EditGoalUseCase` still recomputes on target change (re-pricing escape valve). Anti-cheat rationale documented in §3.4.
- [x] (2026-07-14) **Weekly lock capacity** — `WEEKLY_LOCK_CAPACITY = 100` (domain, `value-objects/LockCapacity.ts`): sum of ACTIVE goals' costs must fit. Create/resume/onboarding-batch blocked with `LockCapacityExceededError` when they would overflow (batch check is atomic, before any goal is created); organic overflow (costs rising from misses) surfaces as a Goals-page warning instead. Paused goals don't count. Tests cover reject/boundary/paused-freed/batch-atomicity.
- [x] (2026-07-14) **Goals page → "Weekly goals"** — shows the current Mon-Sun week range (`LocalDateService.weekOf`), a capacity meter (committed/100 with gradient bar, red + guidance when over), active goals grouped above a "Paused · not counted this week" section. Goal cards de-cluttered: no Active/difficulty tags (difficulty only matters lock-wise in the background), just name + Formed badge when earned + "N×/week" + a "N locks" chip. Subtitle removed.
- [x] (2026-07-14) **Home end-of-day flow** — the check-in CTA is now a prominent "Going to bed? +500 XP" button (with moon icon) when today has a plan and no log yet, replaced by a quiet "Day logged" state after; the confusing bare "30 locks" figures removed from the Today list. Grace path unchanged: a missed night still lets you plan today, it just earns no XP (already true, now the copy/flow makes it obvious).
- [x] (2026-07-14) **Header chip no longer shifts the UI** — the rank/profile chip is absolutely positioned top-right inside main, inline with each page's title, instead of occupying its own row.
- [x] (2026-07-14) "Goal name" label (was "What are you committing to?"); capacity errors surfaced through goal/onboarding forms. 201 tests passing.

### Phase 10: Progress-tab feedback round — graph redesign, IA consolidation, formula rework, disuse decay (user-directed, 2026-07-16)

User feedback on the shipped app, addressed in one session. Full rationale for
the formula changes lives in `docs/lock-formula.md` (updated in place, not a
separate versioned doc); the user-facing explainer is the new
`docs/how-it-works.md`.

**Formula fixes**
- [x] (2026-07-16) **Symmetric cost-mapping slope** — the negative-strength
  branch used to squeeze the whole 50-cap range into a narrow band above C0,
  so an early miss barely moved the cost while an early pass moved it a lot
  (user report: "first ever scheduling a goal and you fail, only punished 30
  to 31? feels like it should be worse"). Now both directions use the same
  slope. `LockCostService.costFor` (`src/domain/services/LockCostService.ts`),
  full worked-example rewrite in `docs/lock-formula.md` §3.3/§6.
- [x] (2026-07-16) **Difficulty tier removed entirely** (user decision, see
  Changelog) — `GoalDifficulty` deleted from the domain (`Goal` entity,
  `LockFormulaConfig.initialCost`/`difficultyGainMultiplier`), application
  (`GoalDTO`, `CreateGoalUseCase`, `CreateGoalsFromOnboardingUseCase`), and
  every UI difficulty picker (`GoalsManager`'s add-goal form, `OnboardingWizard`
  step 2). Uniform `initialCost = 20` replaces the 25/35/45 tiers. `supabase/schema.sql`
  drops the `difficulty` column (idempotent `alter table ... drop column if
  exists`) — **user still needs to run this in the Supabase SQL Editor**; until
  then the live `habits` table still has `difficulty` as `NOT NULL`, which
  blocks new goal creation (verified live: `createGoalAction` returns "Something
  went wrong" because the insert fails the DB constraint — this is expected,
  not a code bug, and resolves itself once the migration runs).
  - **Latent bug found and fixed while the user ran this migration**: the
    name-backfill `update` a few lines above unconditionally referenced
    `catalog_id`, which a prior run of this same "idempotent" script had
    already dropped — so re-running the full script on an already-migrated
    database failed with `column "catalog_id" does not exist`, pre-dating
    this session's changes (the bug was latent in the script since the
    Phase 5 Goal/Habit unification). Fixed by checking
    `information_schema.columns` first. Not caught by any test since
    `supabase/schema.sql` has no automated test coverage — it's applied by
    hand and only exercised by actually running it.
- [x] (2026-07-16) **Disuse decay** — a goal absent from every daily plan for
  `staleAfterDays` (default 10) consecutive calendar days now drifts its habit
  strength toward NEUTRAL (not the punishing floor), geometrically, at
  `decayRate` (default 0.03) per stale day — structurally distinct from a fail
  (nothing was scheduled, so nothing was missed; this is entropy, not
  judgment). New `LocalDate.daysUntil`, `LockCostService.decay`,
  `GoalTrajectoryService` gap-walking (between check-ins AND trailing to
  `today`), new `staleAfterDays`/`decayRate` config knobs (dev-mode tweakable
  like every other constant). `GoalCostRecomputeService` now takes a `Clock`
  to anchor trailing decay; stored costs only catch up to their true decayed
  value on the user's next check-in event (no proactive daily job — documented
  limitation, see `docs/lock-formula.md` §3.6 and the Discovered-work item
  below).
- [x] (2026-07-16) All formula worked examples in `docs/lock-formula.md` §6
  recomputed by hand for the new C0=20 + symmetric-slope + no-difficulty
  formula; every number verified via the corresponding Vitest assertion, not
  just asserted.

**Progress tab → Goals page**
- [x] (2026-07-16) Deleted the 30-day pass/fail calendar (`DayResultCalendar`)
  — permanent red for a FAIL day was flagged as too punishing and quit-inducing.
- [x] (2026-07-16) Deleted the standalone `/progress` route, `ProgressView`,
  `GoalTrajectoryChart`, `ChartTooltip`, `format.ts` — replaced by a new
  `HabitStrengthChart` (`src/interfaces/web/components/goals/HabitStrengthChart.tsx`)
  embedded directly on `/goals` (compact, no axes) and a new `/goals/[id]`
  detail route (full chart with axes/tooltip/legend). The graph plots
  NORMALIZED habit strength (0–1, never a raw lock/key number) with "Habit
  Formed" at the top and "Not Sticking Yet" at the bottom (coined fresh,
  deliberately softer than "Habit Failure" — the app's whole design language
  avoids shame copy); a smooth (`type="natural"`) curve, not linear; real
  history points colored green (passed) / red (missed); a 14-day green/red
  dashed projection branching from the current point.
- [x] (2026-07-16) `GoalTrajectoryService`/`GoalStatsDTO` extended with
  `initialStrength`, `finalStrength`, per-point `strength`/`passed`, and
  `projectionIfPass`/`projectionIfFail` (14-day normalized-strength arrays) —
  additive, `nextIfPass`/`nextIfFail` (cost) kept for other consumers.
  `PROJECTION_DAYS = 14` exported from the domain service.
  `LockCostService.displayStrength` added: `(H − S_min) / (1 − S_min)`.
- [x] (2026-07-16) The weekly "this week X/N" pips (previously part of the
  deleted `GoalTrajectoryChart`) were NOT rebuilt anywhere yet — user said they
  belong on the Schedule page, not Goals (Goals is meant to be week-agnostic);
  flagged as discovered work below since it didn't make it into this session.
- [x] (2026-07-16) Fixed a real overflow bug: the goal card's "N locks" chip
  could wrap on narrow viewports (missing `whitespace-nowrap`); fixed
  alongside the locks→keys rebrand.
- [x] (2026-07-16) Fixed a real interaction bug found during live browser
  verification: clicking a `HabitStrengthChart` inside a `<Link>`-wrapped goal
  card didn't navigate — Recharts' SVG intercepted the click even with the
  Tooltip disabled in compact mode. Fixed with `pointer-events-none` on the
  compact chart's wrapper.

**"Locks" → "keys" rebrand + Schedule tab**
- [x] (2026-07-16) User-facing copy renamed "locks" → "keys" throughout
  (`/plan`'s budget bar and per-goal chips, `FrequencySlider`'s hint,
  `OnboardingWizard`'s step-2 copy, `GoalsManager`'s capacity meter and card
  chips, both `ApplicationError` message strings for lock/capacity errors).
  Internal domain/DB names (`LockCostService`, `currentLockCost`, the
  `habits` table) intentionally left alone — presentation-only rename, not a
  domain rename; noted in `docs/progression.md`.
- [x] (2026-07-16) `/plan`'s `AlreadyPlanned` view rebuilt to list ALL active
  goals (not just scheduled ones) with an explicit "Scheduled"/"Not scheduled"
  pill each, addressing the ask to "more simply state which ones are
  scheduled and which ones aren't"; the picker view gained the same pill
  next to its existing checkbox.
- [x] (2026-07-16) `NAV_ITEMS` (`src/interfaces/web/components/navigation/navItems.tsx`)
  changed from Home/Goals/Progress/History/Profile to Home/Goals/Schedule
  (→ `/plan`)/Profile — four tabs. `ScheduleIcon` (calendar glyph) replaces
  the old `ProgressIcon`/`HistoryIcon`.

**History + Journal folded into Profile**
- [x] (2026-07-16) Deleted the standalone `/history` and `/journal` routes and
  `JournalHistoryView`. `CheckInHistoryView` moved to
  `src/interfaces/web/components/profile/CheckInHistoryView.tsx`, gained a
  `journalEntries` prop, and now renders that day's journal note (text +
  mood dots) inline on its check-in card when one exists — "journal is part
  of nightly checkin, so should display there on each one."
  `history/actions.ts` moved to `profile/checkInActions.ts` (same functions,
  updated `revalidatePath` targets). `/profile` now fetches check-ins, goals,
  and journal entries and renders this as a visible "History" section (not
  buried in Advanced, since it's everyday content) above the collapsed
  Advanced details.

**Verification**
- [x] (2026-07-16) `npm test` (216 passing, up from 202 — new decay + formula
  tests), `type-check`, `lint`, all clean.
- [x] (2026-07-16) End-to-end against the live Supabase project via a fresh
  dev server + browser automation: `/goals` renders (existing pre-migration
  goal's stored cost correctly left untouched until its next recompute, per
  the documented retroactivity model), the compact chart preview renders and
  its click-through to `/goals/[id]` works, the detail page's full chart
  renders with "Habit Formed"/"Not Sticking Yet" labels and colored
  projection lines, `/profile` renders the merged rank + history + inline
  journal, nav confirmed as exactly 4 items. New-goal creation confirmed
  BLOCKED pending the user's manual schema migration (see above) — this is
  the one thing that couldn't be verified end-to-end this session.

**Discovered work (added mid-build, not done this session)**
- [ ] Rebuild the "this week X/N" per-goal completion pips somewhere on the
  Schedule (`/plan`) page — they existed on the old `/progress` page's
  per-goal chart and were dropped when that chart was deleted; user said they
  belong on the weekly/schedule page, not Goals, but the actual rebuild
  didn't happen this session.
- [ ] No proactive daily recompute job for disuse decay — `Goal.currentLockCost`
  only catches up to its true decayed value on the user's next check-in event
  for ANY goal, not on a schedule. A correct fix is a Vercel cron (the app
  already has one for keepalive) that walks all users and recomputes; out of
  scope for this session, noted in `docs/lock-formula.md` §3.6.
- [ ] `docs/how-it-works.md` (new, user-requested plain-language formula
  explainer) references screenshots/UI verbally but has none embedded —
  acceptable for a text doc, flagged only in case the user wants visuals
  added later.

### Phase 11: Friends, per-goal privacy, distinct rank badges, battle pass + shop + feed (user-directed, 2026-07-16)

A large social + economy expansion, specified by the user with several
`AskUserQuestion` clarifications resolved along the way, then elaborated into
a full technical design by a background Plan agent before building started.

**Friends + privacy**
- [x] (2026-07-16) New `usernames` registry table (`user_id` -> `username`),
  upserted best-effort at login (`app/api/login/route.ts`) — the only way to
  go from a userId back to a display name, since this app has no accounts
  table and derives `userId` as a one-way hash of the username.
  `RegisterUsernameUseCase`, `SupabaseUsernameRepository`.
- [x] (2026-07-16) `Friendship` entity (state machine: pending/accepted/
  declined/cancelled), `FriendshipRepository`/`SupabaseFriendshipRepository`.
  Use cases: `SendFriendRequestUseCase`, `AcceptFriendRequestUseCase`,
  `DeclineFriendRequestUseCase`, `CancelFriendRequestUseCase`,
  `GetFriendsListUseCase`, `GetPendingFriendRequestsUseCase`.
  `/friends` (list + requests + send-by-username), root stub included.
- [x] (2026-07-16) Every `Goal` gained `isPublic: boolean` (default `true` —
  "defaults to no [private]", user's own wording). `GoalPrivacyService` is
  the one place "never leak a private goal" is implemented:
  `GetFriendPublicGoalsUseCase` filters goals; `GetFriendCheckInLogUseCase`
  recomputes `dayResult` from ONLY the filtered public marks (never reuses
  the stored `CheckIn.dayResult`, which would otherwise leak a private
  goal's outcome) and drops any day with zero public marks entirely,
  indistinguishable from no plan; `GetFriendGoalStatsUseCase` throws the
  identical `GoalNotFoundError` for a private goal and a nonexistent one, so
  no probe can tell the two apart. `/friends/[username]` renders a friend's
  public goals + filtered log, reusing `HabitStrengthChart`.
- [x] (2026-07-16) `GoalsManager`'s add/edit forms gained a "Private goal"
  checkbox (unchecked/public by default); read-only card view shows a
  "Private" badge when set.

**Rank badges**
- [x] (2026-07-16) Redesigned for distinctiveness at every level, not just
  every 5th rank: `hue(rank) = (rank * 47) % 360` (discrete ~47°/rank jump,
  replacing a ~9.3°/rank interpolation that made adjacent ranks nearly
  identical); badge SHAPE cycles every tier (circle→hexagon→squircle→
  diamond→pentagon→octagon→…, uncapped past rank 30); ring thickness
  alternates 2px/3px by rank PARITY so same-tier adjacent ranks still read
  differently. `rankColors.ts` rewritten, `RankBadge.tsx` rebuilt as a
  3-layer nested-span structure (outer unclipped for the glow's box-shadow,
  middle clipped for the ring color, inner clipped for the fill — `clip-path`
  silently clips an element's own `box-shadow` too, so a single-layer
  version would have invisibly sliced the glow off every non-circle shape;
  caught before shipping, not as a live bug).

**Economy foundation**
- [x] (2026-07-16) `Coins` value object, `EconomyConfig` (dev-tunable, same
  `app_config` partial-override pattern as `LockFormulaConfig`, sibling repo
  not a shared one per the Plan agent's recommendation), `coin_wallets`
  table + `increment_wallet_balance()` Postgres function for atomic
  credit/debit (Supabase's JS client has no read-modify-write transaction
  primitive, and a battle-pass claim racing a shop purchase could otherwise
  lose an update). `DeterministicRewardService` (pure FNV-1a hash +
  weighted pick) is the shared domain-safe randomness primitive — no Node
  `crypto` allowed in `domain/`.
- [x] (2026-07-16) `DevModePanel.tsx` genericized to `{title, hint, warning,
  configDto, onSave, onReset, extraActions}` props (was hardcoded to the
  lock formula) so it's one component for both constants panels, not a
  fork; the shared password gate split out into a new `DevModeGate.tsx`
  (one unlock cookie, two panels rendered inside it on `/profile`).

**Battle pass**
- [x] (2026-07-16) `BattlePassCalendarService`: `visibleDayCount = max(0,
  daysInMonth - missesSoFar)` — the literal truncation rule (user's own
  wording: "if you miss a day, day 31 ur never gonna get that reward... no
  reason to show it, that'll just make you sad"). A "miss" = a calendar day
  with no ON-TIME check-in, mirroring how XP already gates on
  `submittedOnTime`. Truncated days are never rendered — no greyed-out/
  failed placeholder for them, on the strip or the month-grid view.
- [x] (2026-07-16) 12-month trinket map, July 2026 → June 2027
  (`BattlePassCalendarMap.ts`), keyed by literal `(year, month)` — NOT a
  cycling/modulo-12 lookup (explicit user requirement) — so it structurally
  runs out after exactly these 12 months. Day 25 = the month's "legendary"
  trinket; days 5/10/15/20 = smaller trinkets from the same monthly theme,
  all `bp:`-namespaced.
- [x] (2026-07-16) App-wide maintenance guard: `GetMaintenanceStatusUseCase`
  checks whether the current `(year, month)` has a map entry; `(app)/
  layout.tsx` renders a full-screen blocking red `MaintenanceBanner`
  ("The app is currently experiencing difficulties. Please come back
  later.") instead of any normal content when it doesn't — a deliberate
  trip-wire the user asked for explicitly, not a bug-avoidance measure.
- [x] (2026-07-16) `ClaimBattlePassDayUseCase` — automatic, no separate
  "unclaimed inventory" step; called from `checkin/actions.ts` right after
  `SubmitCheckInUseCase` succeeds, riding the same submit event (user
  requirement: "a little animation for it after you submit a nightly log").
  `CheckInFlow.tsx` gained a `battlePassClaim` step between `celebrate` and
  `journal`. Re-derives claimability from the same calendar math as the
  read path rather than trusting the client, so a stale UI can never claim
  a truncated or already-claimed day. `battle_pass_claims` table (unique on
  user+date) is the idempotency guard.
- [x] (2026-07-16) Home page battle-pass strip (`BattlePassStrip.tsx`,
  non-invasive, links to `/trinkets`) and the full month calendar view
  (`BattlePassMonthCalendar.tsx`, weekday-aligned grid) on `/trinkets`.

**Shop**
- [x] (2026-07-16) 100-trinket catalog (`ShopTrinketCatalog.ts`), disjoint
  from the battle-pass pool by the `shop:`/`bp:` id-prefix structurally (not
  a runtime check) — rarity tiers sized 55/30/12/3 (common/rare/epic/
  legendary) to match the default rotation weights. FLAT pricing — every
  trinket costs the same (`EconomyConfig.shopTrinketPrice`); rarity only
  affects how often it's offered, never its price (user reversed an earlier
  rarity-tiered-pricing statement mid-session). NOT collect-once — buying a
  duplicate is expected, `trinket_inventory` tracks quantity, UI shows a
  "×N" badge.
- [x] (2026-07-16) `ShopRollService` — deterministic daily 5-slot rotation
  per (userId, date, slot), rarity-weighted. `GetShopOfferUseCase` /
  `PurchaseShopSlotUseCase`; the purchase use case re-derives which trinket
  a slot actually offers from the same roll rather than trusting a
  client-supplied trinket id, and pre-checks the coin balance before
  spending (clean `InsufficientCoinsError` rather than parsing a DB
  constraint failure). Rate limit: `shop_purchases` unique on
  (user, date, slot_index) — at most 1 purchase per offered slot per day,
  ≤5/day total.
- [x] (2026-07-16) `ShopOffer.tsx` client component on `/trinkets`: 5 slots,
  rarity-colored borders, price/Owned/×N states, buy button gated on
  affordability and same-day-repurchase.

**Feed + Trinkets tab**
- [x] (2026-07-16) `activity_events` table (flat, filtered by friend-id-list
  at read time, no fan-out-on-write — fine at this app's scale, flagged as a
  rework-later tradeoff if it ever mattered), populated by both the battle-
  pass claim and shop-purchase use cases. `GetActivityFeedUseCase` reads
  only accepted friends' events, never the viewer's own.
  `GetTrinketCollectionUseCase` resolves a user's owned trinket ids (across
  BOTH pools, via a new `TrinketCatalog.ts` id-prefix dispatcher) to
  emoji/name/quantity for display.
- [x] (2026-07-16) `/trinkets` is ONE tab, internally segmented Battle Pass |
  Shop | Collection | Feed — deliberately not four more top-level tabs
  (design doc). `NAV_ITEMS` now has 6 entries; Friends and Trinkets are
  icon-only below the `sm:` breakpoint on the mobile tab bar (density fix —
  6 full labels didn't fit), full labels return at `sm:`+ and on the
  desktop rail.

**Schema**
- [x] (2026-07-16) `supabase/schema.sql` extended with `usernames`,
  `friendships`, `coin_wallets` (+ `increment_wallet_balance()`),
  `battle_pass_claims`, `trinket_inventory`, `pinned_trinkets`,
  `shop_purchases`, `activity_events`, and `habits.is_public`. All
  idempotent (`create table if not exists` / `add column if not exists`),
  RLS-enabled with no policies (matches the existing pattern — the server
  uses the service role, which bypasses RLS). **User has not yet re-applied
  this to the live Supabase project** — every Phase 11 feature will fail
  live (not just look wrong) until that migration runs; this is the single
  blocking item before any live verification of this phase is possible.

**Verification**
- [x] (2026-07-16) `npm test` (341 passing, up from 291 pre-Phase-11),
  `type-check`, `lint`, and `npm run build` all clean after every sub-phase
  (economy foundation, battle pass, shop, feed/nav), not just once at the
  end.
- [ ] Live end-to-end browser verification (friend request round-trip
  between two usernames, privacy toggle confirmed invisible to a friend,
  battle-pass claim + truncation, shop purchase + rate limit, feed, rank
  badges across several real levels, maintenance banner via a simulated
  out-of-range month) — **blocked on the pending schema migration above**;
  not done this session.

**Discovered work (added mid-build, not done this session)**
- [ ] `pinned_trinkets` table exists in the schema and has a repository-less
  design note in `EconomyConfig.maxPinnedTrinkets`, but no use case or UI
  was built to let a user actually choose which trinkets to showcase — the
  Collection view currently shows everything owned, unpinned/unordered.
- [ ] No proactive job re-rolls or expires anything — the shop's daily
  offer and battle-pass coin amounts are computed on read, which is
  correct and cheap, but there's no cron analogous to the keepalive one;
  flagged only because Phase 10 left a similar gap for disuse decay and the
  pattern is worth keeping in mind, not because anything is currently wrong.

## Changelog

- 2026-07-16 — **Phase 11 shipped** (see section above): a major social +
  economy expansion, specified by the user with several `AskUserQuestion`
  clarifications resolved along the way and a background Plan agent pass
  before building — five feature areas in one session:
  1. **Friends + per-goal privacy** — send/accept requests by username
     (new `usernames` registry, since this app has no accounts table),
     view a friend's PUBLIC-only goals/log; every goal gained `isPublic`
     (default `true`), with a dedicated `GoalPrivacyService` as the one
     place "never leak a private goal, not even indirectly" is enforced.
  2. **Rank badges redesigned** for distinctiveness at every level (not just
     every 5th) — discrete hue jump, shape cycling per tier, ring-width
     parity.
  3. **Economy foundation** — coins, a dev-tunable `EconomyConfig` sibling
     to `LockFormulaConfig`, and a genericized `DevModePanel` so both
     constants panels share one component.
  4. **Battle pass** — a 12-month trinket map keyed by literal (year,
     month) so it structurally cannot silently cycle past June 2027 (user
     requirement), the literal truncation mechanic ("if you miss a day, day
     31 ur never gonna get that reward... no reason to show it"), an
     app-wide full-screen maintenance banner as the trip-wire for running
     outside the mapped range, and claiming wired into the existing
     check-in celebration flow rather than a separate step.
  5. **Shop + Feed + Trinkets tab** — 100 flatly-priced trinkets disjoint
     from the battle-pass pool by id-prefix, a deterministic daily 5-slot
     rotation, quantity-tracked (not collect-once) ownership, a friend
     activity feed, and one `/trinkets` tab internally segmented into all
     four pieces rather than four new top-level tabs. Nav is now 6 tabs.
  341 tests passing (up from 291), `type-check`/`lint`/`build` clean after
  every sub-phase. **Not done this session**: live end-to-end browser
  verification — blocked on the user re-applying the extended
  `supabase/schema.sql` (new tables: usernames, friendships, coin_wallets,
  battle_pass_claims, trinket_inventory, pinned_trinkets, shop_purchases,
  activity_events, plus `habits.is_public`) to the live Supabase project.
  Also deferred: a pin/showcase UI for the `pinned_trinkets` table, which
  exists in schema but has no use case or UI yet.
- 2026-07-16 — **Phase 10 shipped** (see section above): a full feedback round on the shipped app, covering formula math, the Progress tab, navigation/IA, and a new mechanic — six user-directed scope decisions in one session:
  1. **Symmetric cost-mapping slope** — fixes the "first fail barely costs anything" complaint by pricing a miss on the same scale as a pass would have earned.
  2. **Difficulty tier removed entirely** (user: "I think actually I want to remove the easy/medium/hard thing... initially it should be cheap regardless of the goal") — uniform `initialCost = 20` replaces 25/35/45 tiers; confirmed via `AskUserQuestion` (full removal including the gain-rate multiplier, not just cost; 20 keys over 25) before the cross-cutting refactor. Needs a manual Supabase migration to drop the now-unused `difficulty` column — **not yet run by the user**, blocks new goal creation until it is (existing goals unaffected).
  3. **Disuse decay added** (user: "doesn't that hurt habit consolidation? ...locks creep back in?") — a goal unscheduled for 10+ days drifts toward neutral, forgiving a struggling goal and de-freshening a formed one; explicitly NOT the same mechanic as a fail (no loss aversion, no escalation, resets toward neutral not the floor).
  4. **Progress tab retired** — the 30-day pass/fail calendar (permanent red = too punishing) deleted outright; the per-goal graph moved onto `/goals` (compact) and new `/goals/[id]` (full), redesigned as a normalized "Habit Formed"/"Not Sticking Yet" strength curve instead of a raw lock-cost line, since the user found the old chart's concept good but the presentation punishing/cluttered.
  5. **"Locks" → "keys" rebrand + Schedule tab** — user-facing copy only (internal domain names unchanged); nav went from 5 tabs to 4 (Home/Goals/Schedule/Profile).
  6. **History + Journal folded into Profile** — journal entries now render inline on their corresponding check-in day rather than as a separate list.
  Also requested and delivered: a new plain-language `docs/how-it-works.md` (distinct from the implementer-facing `docs/lock-formula.md`) explaining the current mechanics to the user directly. 216 tests passing (up from 202), `type-check`/`lint` clean, most of the rebuilt UI verified end-to-end against the live Supabase project via browser automation — new-goal creation is the one path that couldn't be verified live, since it's blocked on the pending schema migration. Two items deliberately deferred, tracked as discovered work above: rebuilding the "this week X/N" pips on the Schedule page, and a proactive daily decay-recompute cron (decay is currently lazy, refreshed only on the user's next check-in).
- 2026-07-14 (round 5) — **Phase 9 shipped** (see section above): weekly capacity system with meter + enforcement, Goals page reframed as the weekly portfolio, slack rule removed in favor of "a planned miss always counts" (user decision, closes the edit-to-cheat loophole; target edits stay free and only re-price), home page gets the "Going to bed?" CTA, header chip overlay, concise copy. Live-data note: goals created before capacity enforcement can exceed 100 combined; the page shows the warning rather than blocking.
- 2026-07-14 (round 4) — **Phase 8 shipped** (see section above): weekly slack rule + commitment pricing + target-edit escape valve in the lock formula (docs/lock-formula.md §3.4), frequency slider, new flat suggestions list, difficulty question copy, dev-unlock overflow fix. Note for live data: existing goals' stored costs will shift on their next recompute (targets below 7 now get the φ discount and past misses may be forgiven under the slack rule) — use dev mode's "Recompute all goals" to apply immediately.
- 2026-07-14 (round 3) — **Phase 7 shipped** (see section above): formula-based XP ranks replacing the threshold array (first-log rank-up, eventually-linear cadence), programmatic per-rank color schemes with tier ornaments, badge-to-badge progress bar, "Submit +500 XP" show-don't-tell flow, redesigned rank-up celebration, emoji purge in favor of a custom SVG icon set, midnight-violet brand refresh, Advanced section on /profile hiding window settings + dev mode, and a mobile overflow pass. `docs/progression.md` §2 rewritten to match.
- 2026-07-14 (later) — Post-deploy feedback round: (1) **Fixed /profile 404** — this repo's App Router pages are thin re-export stubs in the root `app/` directory pointing into `src/interfaces/web/app`; the Phase 6 profile page was missing its stub so the route never built. Any new route needs BOTH files. (2) **Journal moved into Profile** (user request): header's Journal and Switch-user links removed; Profile is now the 5th nav tab and hosts the journal link + switch user. (3) **Perceived-speed fix**: added the app's first `loading.tsx` (route-group level) so force-dynamic tab switches paint a skeleton instantly instead of waiting on the server. (4) **UI modernization pass**: Inter via next/font, brand-tinted radial background wash, floating frosted-glass mobile tab bar with active pills, filled desktop-rail active state, rank chip as a pill, softer hairline card borders (`border-gray-900/[0.06]`). (5) **Copy rule: no em dashes anywhere in UI copy** (user preference) — swept and replaced; do not reintroduce.

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
- 2026-07-14 — **Phase 6 complete and fully verified.** User ran the migration; live end-to-end verification passed on the first run with every number matching docs/lock-formula.md §6 (see the Verification checklist for the full list). Test data cleaned up; the temporary e2e file was deleted after passing. Still open from earlier phases (unchanged): journal photo upload (deferred indefinitely — text is enough for now). Not yet done: visual pass in a real browser (badge colors, ghost points, /profile layout) — code-verified only — and the work is uncommitted on the feature branch.
- 2026-07-13 — **Scope change, user-directed: Phase 6 added** (psychology-grounded lock formula + nightly-log rank progression + /profile + dev mode). Design researched and specified in `docs/lock-formula.md` and `docs/progression.md` — those two files are the authoritative spec; the Phase 6 checklist tracks progress. Supersedes: (a) the placeholder cost formula (PASS −1 / FAIL ×1.1) and (b) the uniform day-result cost rule — costs are now per-goal-contingent (day-level FAIL remains for the /progress calendar display only). The Vision bullet was amended with strikethrough per protocol. Also resolved this session: journal photo upload deferred indefinitely (user: text is enough for now), the ambiguous /progress "summary strip" is dropped in favor of Phase 6's per-goal ghost-point previews. New session-continuity requirement (user is switching windows when credits run out): docs must always reflect current state — check off Phase 6 items immediately on completion and leave "state right now / next step" notes on any half-done task.
