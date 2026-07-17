# The Lock Formula — Psychology-Grounded Habit-Strength Model

**Status:** Specification (Phase 6, revised Phase 10). This document is the single
source of truth for the lock-cost formula: the research behind it, the exact math,
every tweakable constant, and worked examples. If you are implementing or tuning
the formula, read this whole file. Progress tracking lives in `docs/plan.md`.

For a plain-language version of this document aimed at the end user (not an
implementer), see `docs/how-it-works.md`.

---

## 1. Why the formula looks the way it does

The original mechanic was a placeholder: PASS → cost−1, FAIL → cost×1.1 (rounded,
capped 50), applied **uniformly** to every goal scheduled that day (one missed goal
bumped the cost of all of them). That was replaced (Phase 6) by the habit-strength
model below, which has itself been revised twice since (2026-07-16, Phase 10):

1. **The cost-mapping slope was made symmetric.** The negative-strength branch used
   to squeeze the whole 1…50 range into a narrow band, so an early miss barely
   moved the cost while an early pass moved it a lot. Now a miss is priced on the
   same scale as a pass.
2. **The difficulty tier was removed entirely.** There is no more "how hard do you
   think this will be" question, no more easy/medium/hard cost tiers. Every goal
   starts at the same uniform cost; the goal's own pass/fail history is the only
   thing that differentiates it from there. See §3.1 for the reasoning.
3. **Disuse decay was added** (§3.6): a goal that goes unscheduled for a while
   drifts back toward neutral instead of staying frozen forever.

## 2. Research base

Every term in the formula is traceable to one of these findings:

| Finding | Source | Where it shows up in the formula |
|---|---|---|
| Automaticity grows along an **asymptotic curve**: each successful repetition closes a fraction of the remaining gap. Median 66 days to 95% of asymptote (range 18–254, n=96). | [Lally et al. 2010, *European Journal of Social Psychology*](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674) | PASS gain is `∝ (1 − H)` — the classic saturating update. Defaults are tuned so a goal forms in ~50 all-pass days at the current uniform C0. |
| **Missing a single opportunity does not materially affect habit formation.** | Lally et al. 2010 (same study) | FAIL loss is also `∝ (1 − H)`: when H is high (habit nearly formed), a lapse costs almost nothing. |
| **No magic number**: easy habits (handwashing) form in weeks, hard ones (gym) in ~68–77 days / months. Formed habits become insensitive to disruption. | [Buyalskaya et al. 2023, *PNAS*](https://www.pnas.org/doi/10.1073/pnas.2216115120) | Historically modeled as a per-difficulty gain multiplier; **removed 2026-07-16** (§3.1) — a self-reported difficulty guess doesn't know how hard the goal is FOR YOU, so the pass/fail history alone now produces this variation, organically, per user. Fragility weighting still gives the insensitivity-once-formed. |
| Error-correction learning: `ΔV = αβ(λ − V)` produces exactly that negatively-accelerated curve. | [Rescorla–Wagner model, 1972](http://www.scholarpedia.org/article/Rescorla-Wagner_model) | The PASS update *is* a delta rule with asymptote 1. |
| Computational habit models: gain `∝ (1 − HS)` on performance, proportional decay otherwise; growth empirically **faster than decay**. `HS(t+1) = HS − HS·HDP + (1−HS)·Beh·Cue·HGP` (Klein et al. 2011; also Tobias 2009, Miller et al. 2019, Psarra 2016). | [Theory-based Habit Modeling, arXiv:2101.01637](https://arxiv.org/abs/2101.01637), Fig. 1 | Overall update structure. We deviate in one place: decay only happens on an explicit FAIL (planned + missed) or on prolonged disuse (§3.6) — never on an ordinary unplanned day, because this app's non-negotiable rule is that unplanned days are neutral. |
| **"Don't miss twice"**: one miss is noise; consecutive misses cascade into abandonment. Early-stage lapses matter more than late-stage ones. | Lapse/relapse literature (see plan research notes) | Consecutive-fail escalation `f^(c−1)`, reset by any pass OR by disuse decay. |
| **Loss aversion**: losses weigh ≈2.0–2.5× equivalent gains (median λ ≈ 2.25). | [Tversky & Kahneman; meta-analysis](https://www.sciencedirect.com/science/article/pii/S0167487024000485) | FAIL rate = λ × PASS rate at the same point (λ = 2.0 default, deliberately at the gentle end — this app is non-punitive by design). |
| **Provisional ratings**: new Elo players get a high K-factor (~40 vs ~20) for their first ~10–30 games so the estimate converges fast, then stabilizes. | Elo rating system practice | Calibration multiplier `κ(n)`: 2.5× on a goal's first planned day, linearly decaying to 1× by planned day 10. |
| **Skill/habit decay from disuse** is a distinct phenomenon from active failure — motor learning and "use it or lose it" literature. | General skill-decay literature (see plan research notes) | §3.6: a goal unscheduled for `staleAfterDays` drifts toward NEUTRAL, not toward the failure floor — entropy, not judgment. |

## 3. The model

### 3.1 Habit strength `H`

Each goal carries a hidden **habit strength** `H ∈ [S_min, 1]`, starting at `0` when
the goal is created.

- `H = 1` → fully formed (lock cost 1).
- `H = 0` → fresh start / neutral (lock cost = the uniform starting cost C0).
- `H < 0` → "resistance" territory: repeated early failures push the cost *above*
  the starting cost, up to the 50-lock cap. This is the deliberate forced-focus
  mechanic — a goal you keep missing eventually crowds out everything else in the
  100-key weekly budget, forcing you to either commit to it or pause it.

`H` is **never stored**. It is replayed from the goal's full check-in history every
time a cost is needed (see §5 Retroactivity).

**No difficulty tier (removed 2026-07-16).** Earlier versions of this formula let
you self-report a goal as easy/medium/hard at creation, which set both its starting
cost (25/35/45) and how fast it gained strength per pass. Two problems: (1) a
subjective upfront guess is often wrong, and it was *load-bearing* — tagging a goal
"hard" instead of "easy" could blow the weekly budget before you'd done anything;
(2) it let a user pre-declare difficulty to game the pricing. Now every goal starts
at the same uniform `C0` (default 20, see §4), and the *only* thing that makes one
goal cheaper or more expensive than another is what you actually did with it. This
is more honest, simpler to reason about, and directly what the pass/fail formula
was already designed to discover.

### 3.2 Update rules

For each check-in that includes the goal, in date order, using the goal's **own
mark** (its individual ✓/✗ — not the day's overall result):

```
κ(n)  = 1 + (K_cal − 1) · max(0, (N_cal − n) / N_cal)

PASS:  H ← min(1,     H + g · κ(n) · (1 − H))
FAIL:  H ← max(S_min, H − g · λ · κ(n) · f^(min(c, c_max) − 1) · (1 − H))
```

where:

- `n` = how many planned days this goal had **before** this one (0 for its first
  check-in). Drives the calibration boost κ.
- `c` = current consecutive-fail count **including this fail** (c=1 on the first fail;
  any pass, or any disuse decay (§3.6), resets the counter to 0).
- Both updates scale with **fragility** `(1 − H)`:
  - Early on (`H ≈ 0`, fragility ≈ 1) everything moves fast — the calibration ask.
  - Near formation (`H ≈ 1`, fragility ≈ 0) a lapse is nearly free — Lally's
    "missing one opportunity doesn't matter" and Buyalskaya's insensitivity of formed
    habits.

### 3.3 Cost mapping

Lock cost is a function of `H` and the weekly commitment — linear with ONE slope
on both sides of fresh, scaled by φ (§3.4), rounded half-up, clamped to `[1, 50]`:

```
base(H) =  H ≥ 0:  1 + (C0 − 1) · (1 − H)      // 1 (formed) … C0 (fresh)
           H < 0:  C0 + (C0 − 1) · (−H)         // C0 … up to 2·C0 − 1 (resistance)
cost    =  clamp(round(base(H) · φ(T)), 1, 50)
```

**Symmetric slope (revised 2026-07-16).** The original negative branch mapped
`H < 0` onto `C0 … 50` — squeezing the *entire* remaining strength range into
whatever headroom was left above C0. At the old difficulty tiers that headroom
varied wildly (5 locks for a fresh "hard" goal at C0=45, 25 for a fresh "easy" one
at C0=25), so a miss was priced very differently depending on difficulty, and
often barely moved the number at all. The new mapping continues the SAME slope
`(C0 − 1)` per unit of strength on both sides of H=0, so a miss is priced on the
same scale as a pass would have earned. At the current uniform `C0 = 20`, the
worst possible base cost (`H = S_min = −1`) is `2·20 − 1 = 39` — meaningfully
below the 50 cap. **The 50 cap can still bind** if `minStrength` is widened in dev
mode, or at a higher `C0`; it just doesn't at the shipped defaults, which is an
intentional consequence of choosing a low, uniform starting cost (see §3.1).

**Formed** stays defined as `cost ≤ 1` (existing `Goal.recomputeCost` semantics —
a goal can also *un-form* if an edited past check-in pushes its replayed cost back
above 1).

### 3.4 Weekly commitment pricing

The weekly frequency target `T` (1–7) affects PRICING only, via the cost
multiplier

```
φ(T) = 1 − w · (7 − T) / 6        w = frequencyWeight, default 0.5
```

A 7×/week promise costs full price; a 1×/week one costs (1−w) of it (20 → 10 for
a fresh goal at defaults). Ambition is priced into the lock capacity: you *can*
commit to everything daily, but it crowds out everything else.

**A planned miss always counts.** Scheduling a goal for a day IS the
commitment; skipping that day always takes the fail step, whatever the weekly
target. (A "weekly slack" rule that forgave misses while the weekly target
was still reachable was built and removed the same day, by user decision: it
opened a lower-the-target-at-the-last-minute loophole that erased misses.
Without it there is nothing to cheat: editing the target any time, even
mid-week, only re-prices the trajectory via φ — it never rewrites which days
counted as misses. Pausing can't dodge a day either: a paused goal stays in
any plan already made, and XP never comes from passing in the first place.)

**The escape valve.** Editing the target triggers an immediate recompute:
lower an over-ambitious 7×/week and the goal instantly gets cheaper to hold
(φ discount across the whole replayed trajectory); raise it and it costs
more. Misses stay on the record either way.

### 3.5 Weekly lock capacity

`WEEKLY_LOCK_CAPACITY = 100` (domain constant): the combined lock cost of all
ACTIVE goals must fit inside it — deliberately the same 100 that bounds a
single day's plan. This is the portfolio-level forced-focus mechanic:

- Creating a goal, resuming a paused one, or onboarding a batch is **blocked**
  (`LockCapacityExceededError`) when it would overflow the capacity.
- Costs rising organically from misses CAN push an existing portfolio over;
  the Goals page then shows an over-capacity warning and the week's real
  decision: pause or delete a goal, or lower a weekly target (which cuts its
  price via φ).
- Paused goals cost nothing against the capacity; the Goals page shows the
  capacity meter, and paused goals in a separate "not counted" section.

**Worked example at the current uniform C0=20** (this is the number the
2026-07-16 revision was tuned around): five fresh goals at 4×/week cost
`round(20 · φ(4))` = `round(20 · 0.75)` = 15 keys each → 75/100 committed,
comfortable headroom for a sixth goal or for costs to drift up from misses.
Five fresh goals at 7×/week cost 20 each = exactly 100 — the boundary, not an
overflow.

### 3.6 Disuse decay (added 2026-07-16)

**The gap this closes:** "unplanned days are neutral" is a non-negotiable design
rule (no punishment for a day you never committed to) — but it has a side effect:
once a goal is comfortable, nothing stops you from simply never scheduling it
again. Its cost freezes forever. The only existing counter-pressure was passive
(an *active* goal's cost still counts against the 100-key weekly capacity whether
or not you schedule it), which taxes you for ghosting a goal but never nudges the
number itself.

**The fix, and why it's not just "a fail":** a fail is judged — it's the outcome
of a day you explicitly committed to. Going stale isn't a judgment; nothing was
scheduled, so nothing was missed. It's entropy: skills and habits erode without
practice, a well-documented, DIFFERENT phenomenon from active lapse (see §2). So
disuse decay:

- Only triggers after `staleAfterDays` (default 10) **consecutive calendar days**
  with the goal absent from every daily plan. A short break under the threshold
  has zero effect.
- Pulls `H` toward **NEUTRAL (0)**, geometrically, never toward the punishing
  floor `S_min`:

  ```
  H ← H · (1 − d)^days_beyond_threshold      d = decayRate, default 0.03
  ```

  A formed habit (`H` near 1) gets a little rusty. A goal dug into a hole
  (`H` negative) gets **partial forgiveness** — the opposite pull from a fail.
- Resets the consecutive-fail streak (a stale gap makes any prior escalation
  context moot) but does **not** advance `plannedDays` — no check-in happened, so
  the Elo-style calibration counter shouldn't move either.
- Applies in two places during replay (`GoalTrajectoryService`): (1) in the gap
  BETWEEN two check-ins, before the later one steps, if that gap exceeds the
  threshold; (2) TRAILING, from the last check-in through "today", so a
  currently-stale goal's live cost/graph reflect the decay even with no new
  check-in yet.
- Never applies before a goal's first-ever check-in — `H` starts at exactly 0
  (neutral), and decay pulls toward 0, so it would be a no-op anyway.

**A real freshness caveat.** There is no proactive daily job that recomputes
every goal's decay each morning. `Goal.currentLockCost` (the stored value shown
in the "N keys" chip and the weekly capacity meter) only catches up to a goal's
true decayed value the next time recompute runs for that user — which happens on
every check-in submit/backfill/edit/delete. The live habit-strength GRAPH is
always accurate (`GetGoalStatsUseCase` replays fresh on every page load, passing
today's date), so the chart can show a decayed strength before the stored "keys"
number updates to match. This is a known, accepted gap — building a scheduled
recompute job is future work, not done as part of this change (see
`docs/plan.md`).

## 4. Constants reference

All of these live in `DEFAULT_LOCK_FORMULA_CONFIG`
(`src/domain/value-objects/LockFormulaConfig.ts`) and are runtime-tweakable through
dev mode on `/profile` (password-gated). Stored overrides live in the `app_config`
table (key `lock_formula`); missing keys fall back to defaults.

| Key | Default | Sane range | What it does | Grounding |
|---|---|---|---|---|
| `initialCost` (C0) | 20 | 5–49 | Lock cost of a brand-new goal — uniform across all goals, no difficulty tier (§3.1) | Chosen so 5 goals at 4×/week fit comfortably (~75/100) in the weekly capacity |
| `maxCost` | 50 | fixed | Hard cap; also the DB check constraint. Not editable in dev mode. | forced-focus mechanic |
| `gainRate` (`g`) | 0.06 | 0.01–0.25 | Base fraction of the remaining gap closed per pass. Raising it shortens time-to-formed roughly proportionally. | tuned to Lally's 66-day median |
| `lossAversion` (`λ`) | 2.0 | 1–3 | Fail rate as a multiple of the pass rate | Tversky–Kahneman λ ≈ 2.25; kept slightly gentle |
| `failEscalation` (`f`) | 1.7 | 1–3 | Multiplier per additional *consecutive* fail (`f^(c−1)`). `f = 1` disables escalation entirely. | "don't miss twice" |
| `maxEscalationCount` (`c_max`) | 4 | 1–10 | Consecutive fails beyond this stop escalating (prevents float blowups; H is floored anyway) | numerical safety |
| `calibrationBoost` (`K_cal`) | 2.5 | 1–5 | Learning-rate multiplier on a goal's first planned day. `K_cal = 1` disables the calibration phase. | Elo provisional K-factor |
| `calibrationDays` (`N_cal`) | 10 | 0–30 | Planned days over which the boost decays linearly to 1 | Elo provisional period ≈ 10–30 games |
| `minStrength` (`S_min`) | −1 | −3–−0.1 | Strength floor. More negative = deeper hole possible after many fails (slower recovery), and — since the cost slope is now symmetric (§3.3) — a wider `minStrength` also raises the worst-case cost toward the 50 cap. | forced-focus depth |
| `frequencyWeight` (`w`) | 0.5 | 0–0.8 | Commitment-pricing strength: φ(T) = 1 − w·(7−T)/6. 0 disables it (all targets cost the same). | ambition priced into the budget; the lower-your-target escape valve (§3.4) |
| `staleAfterDays` | 10 | 3–60 | Consecutive unscheduled calendar days tolerated before disuse decay starts (§3.6) | short breaks shouldn't do anything; ~1.5 weeks felt like a reasonable "you've actually stopped" signal |
| `decayRate` (`d`) | 0.03 | 0–0.2 | Fraction of the remaining distance to neutral closed per stale day beyond the threshold. `0` disables decay entirely. | slow enough that a 2-week gap is a nudge, not a reset — see §3.6 worked numbers |

**Interactions to know when tuning:**

- Time-to-formed ≈ `N_cal` boosted days + `ln(0.5 / (C0−1) / P_cal) / ln(1 − g)`
  where `P_cal` is the fragility remaining after calibration. Practically: **halving
  `g` roughly doubles** the post-calibration stretch. A lower `C0` also shortens
  time-to-formed slightly, because the "rounds down to cost 1" threshold is
  coarser (see §6.1).
- The worst-case early hit is `g·λ·K_cal·f^(c−1)` — at defaults a *second* consecutive
  fail on a fresh goal moves H by `0.06·2·2.35·1.7·(1−H)` ≈ 0.62·(1−H). Two immediate
  fails on a fresh goal ≈ cost 38 (see worked example §6.3). If that feels too
  brutal, lower `f` or `λ` first, not `g`.
- `κ` multiplies **both** directions on purpose: the calibration phase is about
  *information* (finding your true level fast), not generosity.
- `decayRate` and `gainRate`/`lossAversion` are independent — decay never uses κ,
  λ, or `f`. That's deliberate: it's the one update rule that isn't trying to model
  a judged event.

## 5. Retroactivity — read before tuning

There is no cost-history table. Every chart and every stored `current_lock_cost` is
produced by replaying the goal's full check-in history through this formula
(`GoalTrajectoryService` → `GoalCostRecomputeService`). Consequences:

1. **Changing any constant rewrites history** — trajectories on the goal graphs
   will redraw as if the new constants had always been in effect. This is
   intentional (it is what makes tuning possible at all), but don't be surprised.
2. Stored costs only refresh when a goal is next recomputed (any check-in
   submit/edit/delete touching the USER — see §3.6's freshness caveat, since
   `recomputeMany` now also has to account for disuse decay, not just the
   touched goal's own marks). Dev mode has a **"Recompute all goals"** button to
   force-refresh everything immediately after tuning.
3. Editing or deleting a *past* check-in naturally recomputes the affected goals
   forward — same replay, no special code path.

## 6. Worked examples (at defaults, C0 = 20, 7×/week unless stated)

Hand-check any implementation against these. κ by planned-day index n:
`n=0: 2.50, 1: 2.35, 2: 2.20, 3: 2.05, 4: 1.90, 5: 1.75, 6: 1.60, 7: 1.45, 8: 1.30, 9: 1.15, ≥10: 1.00`.

### 6.1 Perfect run — time to formed

All-pass (`g = 0.06`): cost rounds down to the "formed" value of 1 once
`(C0−1)(1−H) ≤ 0.5`, i.e. `1 − H ≤ 0.5/19 ≈ 0.0263`. Simulating day by day, this
takes **~50 all-pass days** at the uniform C0=20 — a bit faster than the old
per-difficulty medium tier's ~60 days, because a lower C0 means fewer cost ticks
between 1 and C0, so that last-mile rounding threshold is crossed sooner. Still
squarely inside Lally's range (18–254 days, median 66).

### 6.2 First-day fail (fresh goal)

`loss = 0.06·2.0·2.5·1.7⁰·(1−0) = 0.30` → `H = −0.30` → `cost = 20 + 19·0.30 =
25.7 → 26`. This now recovers on the SAME scale a pass would have earned (a
first-day pass would have gone 20 → 17) — symmetric, unlike the old asymmetric
mapping this replaced.

### 6.3 Two consecutive fails out of the gate

Second fail: `c=2`, `loss = 0.06·2.0·2.35·1.7·(1−(−0.30)) ≈ 0.623` → `H ≈ −0.923` →
`cost = 20 + 19·0.923 ≈ 37.5 → 38` — well short of the 50 cap (see §3.3: the
worst-case base at C0=20 is 39, not 50). A pass from there:
`gain = 0.06·2.20·(1.923) ≈ 0.254` → `H ≈ −0.669` → cost ≈ 33. Recovery is
gradual and earned, not a snap back from a cap.

### 6.4 Single lapse in a nearly-formed habit (H = 0.95, past calibration)

`loss = 0.06·2.0·1·1·(0.05) = 0.006` → `H = 0.944` → cost stays at 2 (both
`1+19·0.05=1.95→2` and `1+19·0.056=2.06→2` round to the same value). **Literally
free** at this coarser granularity — an even stronger statement of Lally's
"missing one opportunity doesn't materially matter" than the old formula gave.

### 6.5 Mid-journey preview (H = 0.5, past calibration, no fail streak)

- Current cost: `1 + 19·0.5 = 10.5 → 11`.
- If pass: `H → 0.53`, cost `11 → 10`.
- If fail: `H → 0.44`, cost `11 → 12`.

These two numbers are exactly what the goal graph's ghost points show
(`nextIfPass` / `nextIfFail` in `GoalStatsDTO`). The fail projection uses the
goal's *current* consecutive-fail streak, so after a miss the red ghost point
visibly jumps further — "1 relapse isn't as bad as multiple," made visual.

### 6.6 Disuse decay (§3.6)

A goal sitting at `H = 0.5` (cost 11) that isn't scheduled again for 24 days
(14 days beyond the 10-day threshold): `H ← 0.5 · (0.97)^14 ≈ 0.5 · 0.6528 ≈
0.326` → cost `1 + 19·0.674 ≈ 13.8 → 14` — it got a little more expensive from
sitting idle, not from failing anything. A goal stuck at `H = −0.5` (cost 30)
under the same 24-day gap: `H ← −0.5 · 0.6528 ≈ −0.326` → cost
`20 + 19·0.326 ≈ 26.2 → 26` — partial forgiveness, pulled back toward neutral
rather than staying dug in.

## 7. Design rules preserved

- **No streaks.** `c` (consecutive fails) is internal damping, never displayed as a
  streak; passes are never chained into any displayed streak.
- **Unplanned days are neutral** in the sense that matters: a single day with no
  plan never triggers a fail step. Disuse decay (§3.6) is a DIFFERENT mechanic —
  entropy from a *prolonged* gap, pulling toward neutral, never toward the
  punishing floor — not a retroactive violation of this rule.
- **Non-punitive framing.** Costs rise, copy never shames. A fail affects only the
  goal that failed (per-goal contingency).
- **Honor system.** Nothing here changes the truthfulness confirm.

## 8. Implementation map

| Piece | File |
|---|---|
| Config type + defaults | `src/domain/value-objects/LockFormulaConfig.ts` |
| The formula (step/cost/initial/decay) | `src/domain/services/LockCostService.ts` |
| Replay over a goal's marks + gap-decay + projections | `src/domain/services/GoalTrajectoryService.ts` |
| Calendar-day arithmetic for decay gaps | `LocalDate.daysUntil` in `src/domain/value-objects/LocalDate.ts` |
| Persisted-cost recompute (needs a Clock for trailing decay) | `src/application/services/GoalCostRecomputeService.ts` |
| Stats + ghost-point projections | `src/application/use-cases/GetGoalStatsUseCase.ts` |
| Stored constant overrides | `app_config` table, key `lock_formula` (jsonb) |
| Dev-mode editor | `/profile` → Advanced → Developer mode (password-gated) |
| Goal graph (compact + full) | `src/interfaces/web/components/goals/HabitStrengthChart.tsx` |

Related: the rank / nightly-log progression and check-in window are specified in
`docs/progression.md`. The plain-language user-facing explainer is
`docs/how-it-works.md`.
