import { DeterministicRewardService } from "./DeterministicRewardService";
import { shopTrinketsByRarity, type ShopTrinket } from "../value-objects/ShopTrinketCatalog";
import type { TrinketRarity } from "../value-objects/Trinket";
import type { EconomyConfig } from "../value-objects/EconomyConfig";

export interface ShopSlot {
  slotIndex: number;
  trinket: ShopTrinket;
}

const SLOT_COUNT = 5;

/**
 * The shop's daily 5-slot rotation. Deterministic per (userId, date, slot) —
 * the same day always offers the same 5 trinkets to the same user, without
 * needing to persist "what was rolled" ahead of a purchase (only the actual
 * purchase gets persisted, see ShopPurchaseRepository). Rarity only affects
 * how often a trinket is OFFERED, never its price (EconomyConfig.shopTrinketPrice
 * is flat — user decision, 2026-07-16).
 */
export class ShopRollService {
  constructor(private readonly rewardService: DeterministicRewardService) {}

  rollDailyOffer(params: { userId: string; date: string; economyConfig: EconomyConfig }): ShopSlot[] {
    const slots: ShopSlot[] = [];
    for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex++) {
      const rarity = this.rewardService.weightedPick<TrinketRarity>(
        `shop-rarity:${params.userId}:${params.date}:${slotIndex}`,
        [
          { value: "common", weight: params.economyConfig.shopCommonWeight },
          { value: "rare", weight: params.economyConfig.shopRareWeight },
          { value: "epic", weight: params.economyConfig.shopEpicWeight },
          { value: "legendary", weight: params.economyConfig.shopLegendaryWeight },
        ],
      );
      const tierTrinkets = shopTrinketsByRarity(rarity);
      const trinket = this.rewardService.weightedPick(
        `shop-trinket:${params.userId}:${params.date}:${slotIndex}`,
        tierTrinkets.map((t) => ({ value: t, weight: 1 })),
      );
      slots.push({ slotIndex, trinket });
    }
    return slots;
  }
}
