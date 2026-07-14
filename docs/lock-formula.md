# The Lock Formula — Psychology-Grounded Habit-Strength Model

**Status:** Specification (Phase 6). This document is the single source of truth for
the lock-cost formula: the research behind it, the exact math, every tweakable
constant, and worked examples. If you are implementing or tuning the formula, read
this whole file. Progress tracking lives in `docs/plan.md` (Phase 6).

---

## 1. Why the old formula was replaced

The original mechanic was a placeholder: PASS → cost−1, FAIL → cost×1.1 (rounded,
capped 50), applied **uniformly** to every goal scheduled that day (one missed goal
bumped the cost of all of them). Problems:

1. **No calibration.** A goal you find trivially easy took just as long to get cheap
   as one you struggle with. Real skill/ability estimation systems (Elo) converge fast
   early, then stabilize.
2. **Linear pass progression.** Real habit formation is asymptotic — big early gains,
   diminishing returns near the plateau (Lally et al. 2010).
3. **Flat 10% fail penalty regardless of context.** Research says a single lapse in a
   well-established habit is nearly harmless, while early and *consecutive* lapses are
   what kill habits. A flat multiplier gets both ends wrong.
4. **Non-contingent punishment.** Bumping the cost of a goal you *passed* because a
   different goal failed violates basic operant contingency — reinforcement must be
   tied to the behavior itself. (Superseded design rule; see `docs/plan.md` changelog
   2026-07-13.)

## 2. Research base

Every term in the formula is traceable to one of these findings:

| Finding | Source | Where it shows up in the formula |
|---|---|---|
| Automaticity grows along an **asymptotic curve**: each successful repetition closes a fraction of the remaining gap. Median 66 days to 95% of asymptote (range 18–254, n=96). | [Lally et al. 2010, *European Journal of Social Psychology*](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674) | PASS gain is `∝ (1 − H)` — the classic saturating update. Defaults are tuned so a medium goal forms in ~60 all-pass days. |
| **Missing a single opportunity does not materially affect habit formation.** | Lally et al. 2010 (same study) | FAIL loss is also `∝ (1 − H)`: when H is high (habit nearly formed), a lapse costs almost nothing. |
| **No magic number**: easy habits (handwashing) form in weeks, hard ones (gym) in ~68–77 days / months. Formed habits become insensitive to disruption. | [Buyalskaya et al. 2023, *PNAS*](https://www.pnas.org/doi/10.1073/pnas.2216115120) | Per-difficulty gain multiplier `μ`: easy forms in ~43 days, medium ~60, hard ~77 at defaults. Fragility weighting gives the insensitivity-once-formed. |
| Error-correction learning: `ΔV = αβ(λ − V)` produces exactly that negatively-accelerated curve. | [Rescorla–Wagner model, 1972](http://www.scholarpedia.org/article/Rescorla-Wagner_model) | The PASS update *is* a delta rule with asymptote 1. |
| Computational habit models: gain `∝ (1 − HS)` on performance, proportional decay otherwise; growth empirically **faster than decay**. `HS(t+1) = HS − HS·HDP + (1−HS)·Beh·Cue·HGP` (Klein et al. 2011; also Tobias 2009, Miller et al. 2019, Psarra 2016). | [Theory-based Habit Modeling, arXiv:2101.01637](https://arxiv.org/abs/2101.01637), Fig. 1 | Overall update structure. We deviate in one place: decay only happens on an explicit FAIL (planned + missed), because this app's non-negotiable rule is that unplanned days are neutral. |
| **"Don't miss twice"**: one miss is noise; consecutive misses cascade into abandonment. Early-stage lapses matter more than late-stage ones. | Lapse/relapse literature (see plan research notes) | Consecutive-fail escalation `f^(c−1)`, reset by any pass. |
| **Loss aversion**: losses weigh ≈2.0–2.5× equivalent gains (median λ ≈ 2.25). | [Tversky & Kahneman; meta-analysis](https://www.sciencedirect.com/science/article/pii/S0167487024000485) | FAIL rate = λ × PASS rate at the same point (λ = 2.0 default, deliberately at the gentle end — this app is non-punitive by design). |
| **Provisional ratings**: new Elo players get a high K-factor (~40 vs ~20) for their first ~10–30 games so the estimate converges fast, then stabilizes. | Elo rating system practice | Calibration multiplier `κ(n)`: 2.5× on a goal's first planned day, linearly decaying to 1× by planned day 10. |

## 3. The model

### 3.1 Habit strength `H`

Each goal carries a hidden **habit strength** `H ∈ [S_min, 1]`, starting at `0` when
the goal is created.

- `H = 1` → fully formed (lock cost 1).
- `H = 0` → fresh start (lock cost = difficulty's initial cost).
- `H < 0` → "resistance" territory: repeated early failures push the cost *above* the
  starting cost, up to the 50-lock cap. This is the deliberate forced-focus mechanic —
  a goal you keep missing eventually crowds out everything else in the 100-lock
  budget, forcing you to either commit to it or pause it.

`H` is **never stored**. It is replayed from the goal's full check-in history every
time a cost is needed (see §5 Retroactivity).

### 3.2 Update rules

For each check-in that includes the goal, in date order, using the goal's **own
mark** (its individual ✓/✗ — not the day's overall result):

```
κ(n)  = 1 + (K_cal − 1) · max(0, (N_cal − n) / N_cal)

PASS:  H ← min(1,     H + g · μ(difficulty) · κ(n) · (1 − H))
FAIL:  H ← max(S_min, H − g · λ · κ(n) · f^(min(c, c_max) − 1) · (1 − H))
```

where:

- `n` = how many planned days this goal had **before** this one (0 for its first
  check-in). Drives the calibration boost κ.
- `c` = current consecutive-fail count **including this fail** (c=1 on the first fail;
  any pass resets the counter to 0).
- Both updates scale with **fragility** `(1 − H)`:
  - Early on (`H ≈ 0`, fragility ≈ 1) everything moves fast — the calibration ask.
  - Near formation (`H ≈ 1`, fragility ≈ 0) a lapse is nearly free — Lally's
    "missing one opportunity doesn't matter" and Buyalskaya's insensitivity of formed
    habits.

### 3.3 Cost mapping

Lock cost is a pure function of `H` and difficulty — piecewise linear, rounded
half-up, clamped to `[1, 50]`:

```
H ≥ 0:  cost = 1 + (C0(difficulty) − 1) · (1 − H)            // 1 (formed) … C0 (fresh)
H < 0:  cost = C0(difficulty) + (C_cap − C0) · (−H / |S_min|) // C0 … 50 (cap)
```

**Formed** stays defined as `cost ≤ 1` (existing `Goal.recomputeCost` semantics —
a goal can also *un-form* if an edited past check-in pushes its replayed cost back
above 1).

## 4. Constants reference

All of these live in `DEFAULT_LOCK_FORMULA_CONFIG`
(`src/domain/value-objects/LockFormulaConfig.ts`) and are runtime-tweakable through
dev mode on `/profile` (password-gated). Stored overrides live in the `app_config`
table (key `lock_formula`); missing keys fall back to defaults.

| Key | Default | Sane range | What it does | Grounding |
|---|---|---|---|---|
| `initialCost.easy` | 25 | 5–49 | Lock cost of a brand-new easy goal | existing product decision |
| `initialCost.medium` | 35 | 5–49 | ... medium | " |
| `initialCost.hard` | 45 | 5–49 | ... hard | " |
| `maxCost` | 50 | fixed | Hard cap; also the DB check constraint. Not editable in dev mode. | forced-focus mechanic |
| `gainRate` (`g`) | 0.06 | 0.01–0.25 | Base fraction of the remaining gap closed per pass. Raising it shortens time-to-formed roughly proportionally. | tuned to Lally's 66-day median |
| `difficultyGainMultiplier.easy` (`μ`) | 1.2 | 0.5–2 | Easy goals form faster | Buyalskaya: weeks vs months |
| `difficultyGainMultiplier.medium` | 1.0 | 0.5–2 | Reference | |
| `difficultyGainMultiplier.hard` | 0.85 | 0.5–2 | Hard goals form slower | Buyalskaya gym ≈ 68–77 days |
| `lossAversion` (`λ`) | 2.0 | 1–3 | Fail rate as a multiple of the pass rate | Tversky–Kahneman λ ≈ 2.25; kept slightly gentle |
| `failEscalation` (`f`) | 1.7 | 1–3 | Multiplier per additional *consecutive* fail (`f^(c−1)`). `f = 1` disables escalation entirely. | "don't miss twice" |
| `maxEscalationCount` (`c_max`) | 4 | 1–10 | Consecutive fails beyond this stop escalating (prevents float blowups; H is floored anyway) | numerical safety |
| `calibrationBoost` (`K_cal`) | 2.5 | 1–5 | Learning-rate multiplier on a goal's first planned day. `K_cal = 1` disables the calibration phase. | Elo provisional K-factor |
| `calibrationDays` (`N_cal`) | 10 | 0–30 | Planned days over which the boost decays linearly to 1 | Elo provisional period ≈ 10–30 games |
| `minStrength` (`S_min`) | −1 | −3–0 | Strength floor; maps to cost 50. More negative = deeper hole possible after many fails (slower recovery). | forced-focus depth |

**Interactions to know when tuning:**

- Time-to-formed ≈ `N_cal` boosted days + `ln(0.5 / (C0−1) / P_cal) / ln(1 − g·μ)`
  where `P_cal` is the fragility remaining after calibration. Practically: **halving
  `g` roughly doubles** the post-calibration stretch.
- The worst-case early hit is `g·λ·K_cal·f^(c−1)` — at defaults a *second* consecutive
  fail on a fresh goal moves H by `0.06·2·2.35·1.7·(1−H)` ≈ 0.62·(1−H). Two immediate
  fails on a fresh medium goal ≈ cost 49 (see worked example 6.3). If that feels too
  brutal, lower `f` or `λ` first, not `g`.
- `κ` multiplies **both** directions on purpose: the calibration phase is about
  *information* (finding your true level fast), not generosity.

## 5. Retroactivity — read before tuning

There is no cost-history table. Every chart and every stored `current_lock_cost` is
produced by replaying the goal's full check-in history through this formula
(`GoalTrajectoryService` → `GoalCostRecomputeService`). Consequences:

1. **Changing any constant rewrites history** — trajectories on `/progress` will
   redraw as if the new constants had always been in effect. This is intentional (it
   is what makes tuning possible at all), but don't be surprised.
2. Stored costs only refresh when a goal is next recomputed (any check-in
   submit/edit/delete touching it). Dev mode has a **"Recompute all goals"** button to
   force-refresh everything immediately after tuning.
3. Editing or deleting a *past* check-in via `/history` naturally recomputes the
   affected goals forward — same replay, no special code path.

## 6. Worked examples (at defaults, medium goal unless stated)

Hand-check any implementation against these. κ by planned-day index n:
`n=0: 2.50, 1: 2.35, 2: 2.20, 3: 2.05, 4: 1.90, 5: 1.75, 6: 1.60, 7: 1.45, 8: 1.30, 9: 1.15, ≥10: 1.00`.

### 6.1 Perfect run — time to formed

All-pass, medium (`g·μ = 0.06`): after the 10 calibration days, fragility
`(1−H) = 0.85·0.859·0.868·…·0.931 ≈ 0.3123` → `H ≈ 0.688`, **cost 35 → 12 in 10
days** ("do it every day with ease → cheap pretty fast"). Thereafter fragility shrinks
×0.94/day; cost hits 1 (needs `1−H < 0.5/34`) after ~50 more days.

| Difficulty | Days to formed (all-pass) | Research anchor |
|---|---|---|
| Easy | ~43 | "weeks" (Buyalskaya handwashing) |
| Medium | ~60 | Lally median 66 |
| Hard | ~77 | Buyalskaya gym 68–77 |

### 6.2 First-day fail (fresh medium goal)

`loss = 0.06·2.0·2.5·1.7⁰·(1−0) = 0.30` → `H = −0.30` → `cost = 35 + 15·0.30 =
39.5 → 40`. Comparable to the old formula's 35→39, but now it *recovers faster* if
the next days pass (calibration works both ways).

### 6.3 Two consecutive fails out of the gate

Second fail: `c=2`, `loss = 0.06·2.0·2.35·1.7·(1−(−0.30)) ≈ 0.623` → `H ≈ −0.923` →
**cost ≈ 49**. The goal now nearly fills half the budget: the app is saying "this one
is too hard for you right now — commit to it or pause it." A pass from there:
`gain = 0.06·2.20·(1.923) ≈ 0.254` → `H ≈ −0.669` → cost ≈ 45. Recovery is real but
earned.

### 6.4 Single lapse in a nearly-formed habit (H = 0.9, past calibration)

`loss = 0.06·2.0·1·1·(0.1) = 0.012` → `H = 0.888` → cost goes 4 → 5. **One lock.**
This is Lally's "missing one opportunity doesn't materially matter", enforced by the
`(1−H)` fragility term.

### 6.5 Mid-journey preview (H = 0.5, past calibration, no fail streak)

- If pass: `H → 0.53`, cost `18 → 17`.
- If fail: `H → 0.44`, cost `18 → 20`.

These two numbers are exactly what the `/progress` chart's ghost points show
(`nextIfPass` / `nextIfFail` in `GoalStatsDTO`). The fail projection uses the goal's
*current* consecutive-fail streak, so after a miss the red ghost point visibly jumps
further — "1 relapse isn't as bad as multiple," made visual.

## 7. Design rules preserved

- **No streaks.** `c` (consecutive fails) is internal damping, never displayed as a
  streak; passes are never chained into any displayed streak.
- **Unplanned days are neutral.** The replay only steps on check-ins that include the
  goal. No plan → no step, no decay. (Deliberate deviation from Klein's always-on
  decay term.)
- **Non-punitive framing.** Costs rise, copy never shames. A fail affects only the
  goal that failed (per-goal contingency, new in Phase 6).
- **Honor system.** Nothing here changes the truthfulness confirm.

## 8. Implementation map

| Piece | File |
|---|---|
| Config type + defaults | `src/domain/value-objects/LockFormulaConfig.ts` |
| The formula (step/cost/initial) | `src/domain/services/LockCostService.ts` |
| Replay over a goal's marks | `src/domain/services/GoalTrajectoryService.ts` |
| Persisted-cost recompute | `src/application/services/GoalCostRecomputeService.ts` |
| Stats + ghost-point projections | `src/application/use-cases/GetGoalStatsUseCase.ts` |
| Stored constant overrides | `app_config` table, key `lock_formula` (jsonb) |
| Dev-mode editor | `/profile` → Developer mode (password-gated) |

Related: the rank / nightly-log progression and check-in window are specified in
`docs/progression.md`.
