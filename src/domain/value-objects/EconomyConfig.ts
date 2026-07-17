import { ValidationError } from "../errors/DomainError";

/**
 * Every tweakable constant in the coin/trinket economy — the battle pass and
 * the shop. Mirrors LockFormulaConfig's pattern exactly (see that file):
 * runtime overrides live in `app_config` (key "economy"), dev-mode
 * tweakable, missing keys fall back to defaults.
 */
export interface EconomyConfig {
  /** Ordinary battle-pass day reward, the common case (docs/plan.md Phase 11). */
  coinsLowAmount: number;
  /** Ordinary battle-pass day reward, the occasional case. */
  coinsHighAmount: number;
  /** Chance (0-1) an ordinary day rolls the high amount instead of the low one. */
  coinsHighProbability: number;
  /** Flat price for every shop trinket, regardless of rarity (user decision, 2026-07-16). */
  shopTrinketPrice: number;
  /** Relative weights for the daily 5-slot shop roll — flavor only, not price. */
  shopCommonWeight: number;
  shopRareWeight: number;
  shopEpicWeight: number;
  shopLegendaryWeight: number;
  /** How many trinkets a user can showcase on their profile/friends view at once. */
  maxPinnedTrinkets: number;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  coinsLowAmount: 50,
  coinsHighAmount: 100,
  coinsHighProbability: 0.2,
  shopTrinketPrice: 200,
  shopCommonWeight: 55,
  shopRareWeight: 30,
  shopEpicWeight: 12,
  shopLegendaryWeight: 3,
  maxPinnedTrinkets: 6,
};

interface NumericBound {
  min: number;
  max: number;
  integer?: boolean;
}

export const ECONOMY_CONFIG_BOUNDS: Record<string, NumericBound> = {
  coinsLowAmount: { min: 5, max: 500, integer: true },
  coinsHighAmount: { min: 5, max: 1000, integer: true },
  coinsHighProbability: { min: 0, max: 1 },
  shopTrinketPrice: { min: 10, max: 5000, integer: true },
  shopCommonWeight: { min: 0, max: 100, integer: true },
  shopRareWeight: { min: 0, max: 100, integer: true },
  shopEpicWeight: { min: 0, max: 100, integer: true },
  shopLegendaryWeight: { min: 0, max: 100, integer: true },
  maxPinnedTrinkets: { min: 1, max: 20, integer: true },
};

export function assertValidEconomyConfig(config: EconomyConfig): void {
  for (const [key, bound] of Object.entries(ECONOMY_CONFIG_BOUNDS)) {
    const value = (config as unknown as Record<string, number>)[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ValidationError(`Economy config "${key}" must be a number.`);
    }
    if (bound.integer && !Number.isInteger(value)) {
      throw new ValidationError(`Economy config "${key}" must be an integer.`);
    }
    if (value < bound.min || value > bound.max) {
      throw new ValidationError(
        `Economy config "${key}" must be between ${bound.min} and ${bound.max}, got ${value}.`,
      );
    }
  }
}

/** Build a config from a partial override, falling back to defaults, then validate. */
export function economyConfigFrom(override: unknown): EconomyConfig {
  const partial = (override ?? {}) as Partial<EconomyConfig>;
  const config: EconomyConfig = { ...DEFAULT_ECONOMY_CONFIG, ...partial };
  assertValidEconomyConfig(config);
  return config;
}
