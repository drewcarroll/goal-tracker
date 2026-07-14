# Progression Systems — Ranks, Locks, Per-Goal

**Status:** Specification (Phase 6). Companion to `docs/lock-formula.md` (the cost
math). This file specifies the three progression tracks, the check-in window /
logical-day rules, the rank display, and the dev-mode manual. Progress tracking
lives in `docs/plan.md` (Phase 6).

---

## 1. The three progressions

The app has exactly three progression tracks. Nothing else (no streaks, ever).

| Track | Fuel | Reward | Where shown |
|---|---|---|---|
| **Rank** (per user) | Submitting the nightly check-in **on time**, once per day. Passing goals earns nothing extra here. | Rank number, colored username + filled badge circle | Header (always), `/profile` (detail) |
| **Locks** (per goal) | Passing that specific goal (its own ✓, per-goal contingency) | Cost drops → you can schedule more tomorrow; at cost 1 the goal is **Formed** | `/plan` budget, `/progress` trajectory chart |
| **Per-goal detail** | Same marks | "Times completed: X" + full habit-forming graph with pass/fail ghost-point preview | `/progress` goal cards |

Failure gives **nothing** and takes nothing visible away in the rank track — a fail
only moves that one goal's lock cost (see `docs/lock-formula.md`). A missed nightly
log simply earns no point.

## 2. Rank system

### 2.1 Earning points

- **1 point = one check-in submitted within its window** (see §3). Max one per
  logical day by construction (check-ins are unique per user+date).
- Backfilled or edited past days via `/history` **never** earn points: on-time status
  is stamped at original submission (`check_ins.submitted_on_time`) and preserved by
  edits. You can correct history honestly without farming rank.
- Points are all-time cumulative and never decrease. Deleting a check-in does remove
  its point (the count is computed from rows, not stored).

### 2.2 Thresholds and rank number

`RANK_THRESHOLDS = [0, 3, 7, 12, 20, 30, 40, 50, 65, 80, 100, 120, 145, 170, 200]`
(domain constant in `src/domain/services/RankService.ts`; extendable).

**Rank = number of thresholds ≤ points.** So 0 points → Rank 1 (the "day 0 rank up" —
you start ranked), 3 points → Rank 2, 7 → Rank 3, … 200 → Rank 15. Past the last
threshold the rank stays at the max until more thresholds are added.

### 2.3 Display

- **Header (every page, `(app)/layout.tsx`):** the username is colored by rank tier
  and sits next to a filled circle badge containing the rank number. Both link to
  `/profile`. Replaces the plain "Signed in as X" text.
- **Rank colors** (Tailwind text/bg classes, one per rank, gray → gold):
  `1 gray-500, 2 amber-600, 3 emerald-600, 4 teal-600, 5 sky-600, 6 blue-600,
  7 indigo-600 (brand), 8 violet-600, 9 purple-600, 10 fuchsia-600, 11 rose-600,
  12 orange-500, 13 amber-500, 14 yellow-500, 15 yellow-400 ("gold")`.
  Defined once in `src/interfaces/web/components/profile/rankColors.ts` (presentation
  concern — NOT in domain).
- **`/profile`:** big badge, points total, progress bar to the next threshold
  ("17 / 20 nightly logs to Rank 5"), and the check-in window settings (§3.4) +
  dev mode (§4).
- **`/checkin` post-submit:** the action result carries
  `{ rankPoint: boolean, rankedUp: boolean, newRank: number }`; the flow shows a small
  "+1 · Rank N" celebration (and a bigger one on rank-up) before the journal step.

## 3. Check-in window & logical day

### 3.1 The rule

The nightly log ("Going to sleep?") is only open from `window_start` (default
**14:00**) until `window_end` (default **07:00** the next morning), in the **user's
local timezone** (existing `gt_tz` cookie / `LocalDateService`).

The window defines the **logical day** a submission belongs to, resolved
server-side from the submission's local wall-clock time `t`:

| Local time `t` | Meaning |
|---|---|
| `t ≥ window_start` (e.g. 14:00–23:59) | Check-in for **today's** date; on time |
| `t < window_end` (e.g. 00:00–06:59) | Check-in for **yesterday's** date (you're up past midnight before sleeping); on time |
| `window_end ≤ t < window_start` (e.g. 07:00–13:59) | **Closed.** 07:01 = you missed last night's log; today's opens at 14:00 |

### 3.2 Constraints & edge cases

- Validation: `window_end < 12:00 ≤ window_start` — start is always afternoon, end is
  always morning, so the mapping above is unambiguous. ("As late as 7 AM, as early as
  2 PM.")
- The `/checkin` page, when closed, shows a neutral empty state ("Tonight's log opens
  at 2:00 PM" or "Last night's log closed at 7:00 AM — tonight's opens at 2:00 PM").
  No shame copy. `SubmitCheckInUseCase` enforces the same rule server-side (never
  trusts the client's clock or date).
- The target date is **always** derived server-side from server time converted to the
  user's timezone — a client can't post a date.
- Timezone changes / DST: the wall-clock time in the current `gt_tz` is what counts.
  Worst case around a DST shift the window is an hour longer/shorter that night —
  accepted, not worth special-casing.
- `/history` backfill of a missed past day remains possible (honesty > streaks) but is
  stamped `submitted_on_time = false` → no rank point, and it still recomputes lock
  costs normally.
- Existing check-in rows predating this feature are backfilled `submitted_on_time =
  true` (don't zero anyone's rank history).

### 3.3 What the window does NOT gate

Planning (`/plan`), history, journal, goals CRUD are untouched. Only the nightly
check-in submission is windowed.

### 3.4 Settings

Per-user, on `/profile`: two time inputs (start, end) with the constraint above,
stored in `user_settings (user_id, checkin_window_start, checkin_window_end)`.
Missing row → defaults 14:00 / 07:00.

## 4. Dev mode (constants editor)

- Lives at the bottom of `/profile` as "Developer mode".
- Unlock: password form → server action compares against `drew` (server-side
  constant) → sets an httpOnly cookie `gt_dev=1` (session-scoped). Wrong password →
  generic error. This is a personal app; the gate is a tripwire, not security.
- When unlocked, shows every constant from `docs/lock-formula.md` §4 as a numeric
  input (with default + sane range enforced by `UpdateLockFormulaConfigUseCase`),
  plus:
  - **Save** — writes the full config to `app_config` key `lock_formula` (jsonb).
  - **Reset to defaults** — deletes the override row.
  - **Recompute all goals** — replays every goal now so stored costs match the new
    constants immediately (see lock-formula §5 Retroactivity).
  - A visible warning: *"Changing constants rewrites all historical trajectories."*
- Rank thresholds and window defaults are code constants, not in the dev panel (v1).

## 5. Data model additions (Phase 6)

```
app_config      (key text primary key, value jsonb)        -- 'lock_formula' override
user_settings   (user_id uuid primary key,
                 checkin_window_start time not null default '14:00',
                 checkin_window_end   time not null default '07:00')
check_ins       + submitted_on_time boolean not null default false
                  (existing rows backfilled to true)
```

Schema source of truth: `supabase/schema.sql` (idempotent; run by hand in the
Supabase SQL Editor — see `.claude/skills/supabase-migration`).

## 6. Implementation map

| Piece | File |
|---|---|
| Rank math (thresholds, rankFor, nextThreshold) | `src/domain/services/RankService.ts` |
| Window / logical-day logic (pure) | `src/domain/services/CheckInWindowService.ts` |
| On-time flag | `src/domain/entities/CheckIn.ts` (`submittedOnTime`) |
| Rank read | `src/application/use-cases/GetRankUseCase.ts` |
| Window read (open? target date?) | `src/application/use-cases/GetCheckInWindowUseCase.ts` |
| Window settings CRUD | `Get/UpdateUserSettingsUseCase` |
| Config CRUD + recompute-all | `Get/Update/ResetLockFormulaConfigUseCase`, `RecomputeAllGoalsUseCase` |
| Ports | `src/domain/repositories/ConfigRepository.ts`, `UserSettingsRepository.ts` |
| Supabase impls | `src/infrastructure/repositories/SupabaseConfigRepository.ts`, `SupabaseUserSettingsRepository.ts` |
| Header badge | `src/interfaces/web/components/profile/RankBadge.tsx` + `(app)/layout.tsx` |
| Profile page | `src/interfaces/web/app/(app)/profile/page.tsx` + `actions.ts` |
| Check-in gating + celebration | `src/interfaces/web/components/checkin/CheckInFlow.tsx`, `(app)/checkin/page.tsx` + `actions.ts` |
| Times completed + ghost points | `src/interfaces/web/components/progress/GoalTrajectoryChart.tsx` |
