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

## 2. Rank system (XP + formula, revised 2026-07-14)

### 2.1 Earning XP

- **1 on-time nightly log = 500 XP** (`XP_PER_LOG` in
  `src/domain/services/RankService.ts`). Logs are the ONLY XP source; the fixed
  exchange rate is presentation polish ("Submit +500 XP" reads better than
  "+1 log") without inventing new earning mechanics. Max one per logical day by
  construction (check-ins are unique per user+date).
- Backfilled or edited past days via `/history` **never** earn XP: on-time status
  is stamped at original submission (`check_ins.submitted_on_time`) and preserved by
  edits. You can correct history honestly without farming rank.
- XP is all-time cumulative and never decreases. Deleting a check-in does remove
  its XP (the count is computed from rows, not stored).
- SHOW, don't tell: the UI never explains this system in prose. The submit button
  says "Submit +500 XP", the celebration screen shows the XP land, and the
  progress bar shows the gap to the next rank.

### 2.2 The rank-up formula

Cost (in logs) to advance from rank k to rank k+1:

```
c(k) = max(1, round(C − (C − 1) · r^(k−1)))      C = 7, r = 0.8
```

(`RANK_FORMULA` in `RankService.ts`.) Properties, each deliberate:

- **c(1) = 1: the very first log ranks a newcomer up.** Reward-timing research
  says the first session is the highest-leverage reward moment.
- Early costs ramp gently: 1, 2, 3, 4, 5, 5, 5, 6, 6, 6, ... Three rank-ups land
  in week one (days 1, 3, 6), the fourth on day 10, then 15, 20, 25, 31, 37, 43.
- Marginal cost flattens to C = 7, so the cumulative curve **becomes linear**:
  one rank per week, forever. No infinite exponential, no "plateau of despair";
  no rank cap either (colors/tiers keep scaling, see §2.3).
- A brand-new user is Rank 1 with 0 XP; ranks are 1-based and unbounded.
- Tuning: raise `r` for a snappier early hook (steady state arrives later);
  raise `C` for a slower permanent cadence. `XP_PER_LOG` is cosmetic scale.

### 2.3 Display and rank visuals

- **Header (every page, `(app)/layout.tsx`):** the username in its rank color plus
  the rank badge, both linking to `/profile`.
- **Rank visuals are programmatic**, not a lookup table
  (`rankVisual(rank)` in `src/interfaces/web/components/profile/rankColors.ts`,
  presentation-only): hue travels steadily from warm muted stone (rank 1) through
  bronze, green, teal, blue, indigo, violet to fuchsia by rank 30, with saturation
  and depth rising. Adjacent ranks differ by ~9 degrees of hue: rank 20 and 21 read
  as siblings. Every 5 ranks a **tier** adds one ornament: tier 1 gradient fill,
  tier 2 double ring, tier 3+ glow of increasing strength. Badges are
  gradient-filled circles with the rank number; no emoji anywhere (custom SVG
  icons live in `src/interfaces/web/components/icons.tsx`).
- **`/profile` rank card:** hero badge + colored username + total XP, then the
  climb row: current rank badge on the LEFT of the progress bar, next rank badge
  (in the next rank's colors) on the RIGHT, bar filled with a gradient from the
  current color to the next. Copy is gap-to-goal framed ("1,500 XP to Rank 5"),
  which outperforms distance-traveled framing.
- **`/checkin`:** the confirm button is "Submit +500 XP". On success a celebration
  screen pops the badge in (CSS pop-in/rise-in keyframes in globals.css): "+500 XP"
  normally, or a full RANK UP treatment in the new rank's color when the log
  crossed a threshold, plus the same badge-to-badge progress bar.
- Everything else on /profile (check-in window settings, dev mode) is tucked into
  a collapsed **Advanced** section (native `<details>`).

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
