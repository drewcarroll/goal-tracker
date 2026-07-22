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
  /** Flat coin price to open one mystery box, regardless of what it rolls (renamed from shopTrinketPrice, 2026-07-21). */
  mysteryBoxPrice: number;
  /**
   * Relative weights for a single mystery-box roll — flavor only, not
   * price. Each box open is an independent roll (2026-07-21, replacing the
   * old 5-slot-per-day model), so these are the box's own odds directly:
   * default 5000/3300/1200/500 out of 10000 = 50%/33%/12%/5%
   * common/rare/epic/legendary (Drew's exact target numbers).
   */
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
  mysteryBoxPrice: 200,
  shopCommonWeight: 5000,
  shopRareWeight: 3300,
  shopEpicWeight: 1200,
  shopLegendaryWeight: 500,
  maxPinnedTrinkets: 6,
};

interface NumericBound {
  min: number;
  max: number;
  integer?: boolean;
  /** Plain-language explanation shown in the dev-mode panel. */
  description: string;
}

export const ECONOMY_CONFIG_BOUNDS: Record<string, NumericBound> = {
  coinsLowAmount: {
    min: 5,
    max: 500,
    integer: true,
    description: "The typical coin reward for an ordinary battle-pass day.",
  },
  coinsHighAmount: {
    min: 5,
    max: 1000,
    integer: true,
    description: "The occasional bigger coin reward for an ordinary battle-pass day.",
  },
  coinsHighProbability: {
    min: 0,
    max: 1,
    description: "Chance an ordinary day rolls the bigger reward instead of the typical one.",
  },
  mysteryBoxPrice: {
    min: 10,
    max: 5000,
    integer: true,
    description: "Flat coin price to open one mystery box, regardless of what it rolls.",
  },
  shopCommonWeight: {
    min: 0,
    max: 10000,
    integer: true,
    description: "Relative odds a mystery box rolls a common trinket.",
  },
  shopRareWeight: {
    min: 0,
    max: 10000,
    integer: true,
    description: "Relative odds a mystery box rolls a rare trinket.",
  },
  shopEpicWeight: {
    min: 0,
    max: 10000,
    integer: true,
    description: "Relative odds a mystery box rolls an epic trinket.",
  },
  shopLegendaryWeight: {
    min: 0,
    max: 10000,
    integer: true,
    description: "Relative odds a mystery box rolls a legendary trinket.",
  },
  maxPinnedTrinkets: {
    min: 1,
    max: 20,
    integer: true,
    description: "How many trinkets a user can showcase on their profile at once.",
  },
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
