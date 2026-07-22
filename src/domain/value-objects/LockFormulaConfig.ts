import { ValidationError } from "../errors/DomainError";

/**
 * Every tweakable constant in the lock-cost formula. The full specification —
 * research grounding, sane ranges, worked examples, tuning interactions —
 * lives in docs/lock-formula.md §4; keep the two in sync.
 *
 * Runtime overrides are stored in the `app_config` table (key "lock_formula")
 * and edited through /profile's dev mode; anything missing there falls back to
 * DEFAULT_LOCK_FORMULA_CONFIG. Changing a constant retroactively rewrites all
 * replayed trajectories (see docs/lock-formula.md §5).
 */
export interface LockFormulaConfig {
  /**
   * Lock cost of a brand-new goal (C0), uniform across all goals — there is
   * no difficulty tier (removed 2026-07-16, see docs/lock-formula.md §3.1).
   * The goal's own pass/fail history is the only thing that differentiates
   * an easy goal from a hard one from here.
   */
  initialCost: number;
  /** Base fraction of the remaining gap closed per pass (g). */
  gainRate: number;
  /** Fail rate as a multiple of the pass rate (λ, Tversky–Kahneman ≈ 2). */
  lossAversion: number;
  /** Multiplier per additional consecutive fail (f, "don't miss twice"). */
  failEscalation: number;
  /** Consecutive fails beyond this stop escalating (c_max). */
  maxEscalationCount: number;
  /** Learning-rate multiplier on a goal's first planned day (K_cal, Elo provisional K). */
  calibrationBoost: number;
  /** Planned days over which the boost decays linearly back to 1 (N_cal). */
  calibrationDays: number;
  /** Habit-strength floor; maps to the 50-lock cap (S_min, always negative). */
  minStrength: number;
  /**
   * How much a lower weekly commitment discounts the lock cost (w). The cost
   * multiplier is φ(T) = 1 − w·(7−T)/6: a 7×/week goal pays full price, a
   * 1×/week goal pays (1−w). 0 disables commitment pricing.
   */
  frequencyWeight: number;
  /**
   * Consecutive calendar days a goal can go unscheduled (not appear in ANY
   * daily plan) before disuse decay starts (docs/lock-formula.md §3.6). A
   * short break under this threshold has no effect at all.
   */
  staleAfterDays: number;
  /**
   * Fraction of the remaining distance to NEUTRAL (H=0, not the punishing
   * floor) that closes per stale day beyond staleAfterDays. This is entropy,
   * not judgment: a formed habit gets a little rusty, a struggling one gets
   * a clean slate — see docs/lock-formula.md §3.6. 0 disables decay entirely.
   */
  decayRate: number;
}

export const DEFAULT_LOCK_FORMULA_CONFIG: LockFormulaConfig = {
  initialCost: 20,
  gainRate: 0.06,
  lossAversion: 2.0,
  failEscalation: 1.7,
  maxEscalationCount: 4,
  calibrationBoost: 2.5,
  calibrationDays: 10,
  minStrength: -1,
  frequencyWeight: 0.5,
  staleAfterDays: 10,
  decayRate: 0.03,
};

interface NumericBound {
  min: number;
  max: number;
  integer?: boolean;
  /** Plain-language explanation shown in the dev-mode panel. */
  description: string;
}

/** Sane ranges, mirrored in docs/lock-formula.md §4. Dev mode enforces these. */
export const LOCK_FORMULA_BOUNDS: Record<string, NumericBound> = {
  initialCost: {
    min: 5,
    max: 49,
    integer: true,
    description: "Starting key cost of a brand-new goal, before any pass/fail history.",
  },
  gainRate: {
    min: 0.01,
    max: 0.25,
    description:
      "How much cheaper a goal gets per pass, as a fraction of the remaining distance to fully formed.",
  },
  lossAversion: {
    min: 1,
    max: 3,
    description: "How much more a miss raises the cost than a pass lowers it — losses hurt more.",
  },
  failEscalation: {
    min: 1,
    max: 3,
    description: "Extra cost multiplier for each consecutive miss in a row.",
  },
  maxEscalationCount: {
    min: 1,
    max: 10,
    integer: true,
    description: "How many consecutive misses in a row before the escalating penalty stops growing.",
  },
  calibrationBoost: {
    min: 1,
    max: 5,
    description: "Extra learning speed on a goal's very first scheduled day, so it calibrates fast.",
  },
  calibrationDays: {
    min: 0,
    max: 30,
    integer: true,
    description: "How many scheduled days it takes for that early calibration boost to fade to normal.",
  },
  minStrength: {
    min: -3,
    max: -0.1,
    description: "The habit-strength floor — controls the 50-key cost cap.",
  },
  frequencyWeight: {
    min: 0,
    max: 0.8,
    description:
      "How much choosing a lower weekly target discounts the key cost. A 7×/week goal always pays full price.",
  },
  staleAfterDays: {
    min: 3,
    max: 60,
    integer: true,
    description: "How many days a goal can go unscheduled before it starts drifting back toward neutral.",
  },
  decayRate: {
    min: 0,
    max: 0.2,
    description:
      "How fast an unscheduled goal drifts back toward neutral once the days-unscheduled threshold passes.",
  },
};

function readPath(config: LockFormulaConfig, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], config);
}

export function assertValidLockFormulaConfig(config: LockFormulaConfig): void {
  for (const [path, bound] of Object.entries(LOCK_FORMULA_BOUNDS)) {
    const value = readPath(config, path);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ValidationError(`Lock formula "${path}" must be a number.`);
    }
    if (bound.integer && !Number.isInteger(value)) {
      throw new ValidationError(`Lock formula "${path}" must be an integer.`);
    }
    if (value < bound.min || value > bound.max) {
      throw new ValidationError(
        `Lock formula "${path}" must be between ${bound.min} and ${bound.max}, got ${value}.`,
      );
    }
  }
}

/**
 * Build a config from a partial override (e.g. the app_config jsonb row),
 * falling back to defaults per field, then validating the result. Unknown
 * keys in the override are ignored.
 */
export function lockFormulaConfigFrom(override: unknown): LockFormulaConfig {
  const partial = (override ?? {}) as Partial<LockFormulaConfig>;
  const config: LockFormulaConfig = {
    ...DEFAULT_LOCK_FORMULA_CONFIG,
    ...partial,
  };
  assertValidLockFormulaConfig(config);
  return config;
}
