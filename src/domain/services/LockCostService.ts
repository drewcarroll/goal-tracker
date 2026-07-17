import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../value-objects/LockFormulaConfig";

const MIN_COST = 1;
const MAX_COST = 50;

/**
 * The replayed formula state for one goal: everything the next step of the
 * update rule needs. Never persisted — always rebuilt from check-in history
 * (see GoalTrajectoryService).
 */
export interface HabitState {
  /** Habit strength H ∈ [minStrength, 1]. 0 = fresh, 1 = formed, <0 = resistance. */
  strength: number;
  /** How many planned days this goal has been through (drives calibration decay). */
  plannedDays: number;
  /** Current run of consecutive fails (any pass resets to 0). */
  consecutiveFails: number;
}

/**
 * Domain service owning the lock-cost formula — a habit-strength model built
 * on real habit-formation research. The full derivation, citations, constants
 * reference, and hand-checkable worked examples live in docs/lock-formula.md;
 * the shape in brief:
 *
 *   PASS:  H ← min(1,     H + g·κ(n)·(1 − H))
 *   FAIL:  H ← max(S_min, H − g·λ·κ(n)·f^(min(c, c_max) − 1)·(1 − H))
 *
 * κ(n) is an Elo-style calibration boost (big early moves, both directions,
 * decaying to 1), the (1 − H) fragility term makes formed habits shrug off a
 * lapse (Lally 2010) while fresh ones move fast, λ is loss aversion, and
 * f^(c−1) escalates consecutive misses ("don't miss twice"). Cost maps
 * linearly from H: 1 (formed) … C0 (fresh) … 50 (floor/forced focus).
 *
 * There is no difficulty tier (removed 2026-07-16): every goal starts at the
 * same C0. A prior self-reported "how hard is this" guess doesn't actually
 * know how hard the goal is FOR YOU — the pass/fail history does, and it's
 * the only thing that differentiates goals from here on. See
 * docs/lock-formula.md §3.1 for the reasoning.
 *
 * No streaks, no shame — see docs/plan.md's non-negotiable design rules.
 * Stateless per instance; constructed with a (possibly dev-tweaked) config.
 */
export class LockCostService {
  constructor(private readonly config: LockFormulaConfig = DEFAULT_LOCK_FORMULA_CONFIG) {}

  /**
   * Starting cost for a newly-created goal: the uniform base cost scaled by
   * the weekly-commitment multiplier φ(T) — a 7×/week promise costs full
   * price, lighter commitments cost less (docs/lock-formula.md §3.4).
   */
  initialCostFor(weeklyFrequencyTarget: number): number {
    return this.costFor(this.initialState(), weeklyFrequencyTarget);
  }

  /** The state of a goal that has never been through a check-in. */
  initialState(): HabitState {
    return { strength: 0, plannedDays: 0, consecutiveFails: 0 };
  }

  /** Apply one planned day's own pass/fail mark to the goal's state. */
  step(state: HabitState, passed: boolean): HabitState {
    const cfg = this.config;
    const kappa =
      cfg.calibrationDays === 0
        ? 1
        : 1 +
          (cfg.calibrationBoost - 1) *
            Math.max(0, (cfg.calibrationDays - state.plannedDays) / cfg.calibrationDays);
    const fragility = 1 - state.strength;

    if (passed) {
      const gain = cfg.gainRate * kappa * fragility;
      return {
        strength: Math.min(1, state.strength + gain),
        plannedDays: state.plannedDays + 1,
        consecutiveFails: 0,
      };
    }

    const failCount = Math.min(state.consecutiveFails + 1, cfg.maxEscalationCount);
    const loss =
      cfg.gainRate *
      cfg.lossAversion *
      kappa *
      Math.pow(cfg.failEscalation, failCount - 1) *
      fragility;
    return {
      strength: Math.max(cfg.minStrength, state.strength - loss),
      plannedDays: state.plannedDays + 1,
      consecutiveFails: state.consecutiveFails + 1,
    };
  }

  /**
   * Apply `days` of disuse decay: strength drifts geometrically toward
   * NEUTRAL (0), never toward the punishing floor — this is entropy from not
   * showing up, structurally distinct from a judged miss (docs/lock-formula.md
   * §3.6). A formed habit gets a little rusty; a goal dug into a hole gets
   * partial forgiveness. Resets the consecutive-fail streak (a stale gap
   * makes any prior escalation context moot) but does NOT advance
   * plannedDays — no check-in happened, so calibration shouldn't either.
   */
  decay(state: HabitState, days: number): HabitState {
    if (days <= 0) return state;
    const factor = Math.pow(1 - this.config.decayRate, days);
    return {
      strength: state.strength * factor,
      plannedDays: state.plannedDays,
      consecutiveFails: 0,
    };
  }

  /**
   * Lock cost for a state: linear in H with ONE slope on both sides of fresh
   * — (C0 − 1) locks per unit of strength — then scaled by the commitment
   * multiplier φ(T) = 1 − w·(7−T)/6, rounded half-up, clamped to [1, 50].
   * H ≥ 0 interpolates 1 (formed) … C0 (fresh); H < 0 continues past C0 on
   * the same slope until the 50 cap (docs/lock-formula.md §3.3).
   *
   * The symmetric slope is deliberate (2026-07-16): squeezing C0…50 into the
   * whole strength floor made an early miss barely move the cost while an
   * early pass moved it plenty. Now a miss is priced on the same scale as a
   * pass, and loss aversion (λ) shows up in the cost the user actually sees.
   *
   * φ makes a 7×/week promise cost full price while lighter commitments cost
   * less — and makes "lower your target and your locks drop" true, since
   * costs are always replayed against the goal's CURRENT target.
   */
  costFor(state: HabitState, weeklyFrequencyTarget: number): number {
    const c0 = this.config.initialCost;
    const base =
      state.strength >= 0
        ? MIN_COST + (c0 - MIN_COST) * (1 - state.strength)
        : c0 + (c0 - MIN_COST) * -state.strength;
    const phi = 1 - this.config.frequencyWeight * ((7 - weeklyFrequencyTarget) / 6);
    return Math.min(MAX_COST, Math.max(MIN_COST, Math.round(base * phi)));
  }

  /**
   * Habit strength normalized for display: 1 = formed, 0 = the strength
   * floor (S_min), a fresh goal sits in between (0.5 at the default
   * S_min = −1). This is what the goal graphs plot — the UI never shows raw
   * H or lock costs on the chart, just "Habit formed" (top) down to
   * "Falling off" (bottom).
   */
  displayStrength(state: HabitState): number {
    const sMin = this.config.minStrength;
    return (state.strength - sMin) / (1 - sMin);
  }

  /** A goal is "formed" once its cost has been driven all the way down to 1. */
  isFormed(cost: number): boolean {
    return cost <= MIN_COST;
  }

  /** How many unscheduled calendar days a goal tolerates before decay starts. */
  get staleAfterDays(): number {
    return this.config.staleAfterDays;
  }
}
