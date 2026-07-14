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
  /** Lock cost of a brand-new goal, per difficulty (C0). */
  initialCost: { easy: number; medium: number; hard: number };
  /** Base fraction of the remaining gap closed per pass (g). */
  gainRate: number;
  /** Per-difficulty multiplier on the gain rate (μ) — easy forms faster. */
  difficultyGainMultiplier: { easy: number; medium: number; hard: number };
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
}

export const DEFAULT_LOCK_FORMULA_CONFIG: LockFormulaConfig = {
  initialCost: { easy: 25, medium: 35, hard: 45 },
  gainRate: 0.06,
  difficultyGainMultiplier: { easy: 1.2, medium: 1.0, hard: 0.85 },
  lossAversion: 2.0,
  failEscalation: 1.7,
  maxEscalationCount: 4,
  calibrationBoost: 2.5,
  calibrationDays: 10,
  minStrength: -1,
};

interface NumericBound {
  min: number;
  max: number;
  integer?: boolean;
}

/** Sane ranges, mirrored in docs/lock-formula.md §4. Dev mode enforces these. */
export const LOCK_FORMULA_BOUNDS: Record<string, NumericBound> = {
  "initialCost.easy": { min: 5, max: 49, integer: true },
  "initialCost.medium": { min: 5, max: 49, integer: true },
  "initialCost.hard": { min: 5, max: 49, integer: true },
  gainRate: { min: 0.01, max: 0.25 },
  "difficultyGainMultiplier.easy": { min: 0.5, max: 2 },
  "difficultyGainMultiplier.medium": { min: 0.5, max: 2 },
  "difficultyGainMultiplier.hard": { min: 0.5, max: 2 },
  lossAversion: { min: 1, max: 3 },
  failEscalation: { min: 1, max: 3 },
  maxEscalationCount: { min: 1, max: 10, integer: true },
  calibrationBoost: { min: 1, max: 5 },
  calibrationDays: { min: 0, max: 30, integer: true },
  minStrength: { min: -3, max: -0.1 },
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
    initialCost: {
      ...DEFAULT_LOCK_FORMULA_CONFIG.initialCost,
      ...(partial.initialCost ?? {}),
    },
    difficultyGainMultiplier: {
      ...DEFAULT_LOCK_FORMULA_CONFIG.difficultyGainMultiplier,
      ...(partial.difficultyGainMultiplier ?? {}),
    },
  };
  assertValidLockFormulaConfig(config);
  return config;
}
