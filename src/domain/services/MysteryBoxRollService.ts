import { DeterministicRewardService } from "./DeterministicRewardService";
import { SHOP_TRINKETS, shopTrinketsByRarity, type ShopTrinket } from "../value-objects/ShopTrinketCatalog";
import type { TrinketRarity } from "../value-objects/Trinket";
import type { EconomyConfig } from "../value-objects/EconomyConfig";

/**
 * A single mystery-box roll (replaces the old 5-slot daily shop rotation,
 * 2026-07-21): one independent weighted-rarity pick, then a uniform pick
 * within that rarity tier. Unlike the old `ShopRollService`, there is no
 * "distinct slots" exclusion — duplicates are the whole point now, since
 * they're what levels a trinket up (see the Collection's ×N badge).
 *
 * Deterministic per seed (same pattern as the rest of the domain's
 * randomness — see DeterministicRewardService), but the seed is a fresh id
 * minted per purchase (application layer), so in practice every open is
 * independently random while still being reproducible if replayed with the
 * same seed.
 */
export class MysteryBoxRollService {
  constructor(private readonly rewardService: DeterministicRewardService) {}

  roll(params: { seed: string; economyConfig: EconomyConfig }): ShopTrinket {
    const rarity = this.rewardService.weightedPick<TrinketRarity>(`box-rarity:${params.seed}`, [
      { value: "common", weight: params.economyConfig.shopCommonWeight },
      { value: "rare", weight: params.economyConfig.shopRareWeight },
      { value: "epic", weight: params.economyConfig.shopEpicWeight },
      { value: "legendary", weight: params.economyConfig.shopLegendaryWeight },
    ]);

    const pool = shopTrinketsByRarity(rarity);
    const source = pool.length > 0 ? pool : SHOP_TRINKETS; // defensive; every tier is non-empty today
    const index = Math.floor(this.rewardService.hash01(`box-trinket:${params.seed}`) * source.length);
    return source[Math.min(index, source.length - 1)]!;
  }
}
