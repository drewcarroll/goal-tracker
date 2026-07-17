import { DeterministicRewardService } from "./DeterministicRewardService";
import { SHOP_TRINKETS, shopTrinketsByRarity, type ShopTrinket } from "../value-objects/ShopTrinketCatalog";
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
 *
 * The 5 slots are always 5 DISTINCT trinkets (user requirement, 2026-07-17,
 * after a live bug produced duplicates in the same day's offer) — enforced
 * structurally by excluding already-picked ids before each pick, not just by
 * trusting the hash to avoid collisions.
 */
export class ShopRollService {
  constructor(private readonly rewardService: DeterministicRewardService) {}

  rollDailyOffer(params: { userId: string; date: string; economyConfig: EconomyConfig }): ShopSlot[] {
    const slots: ShopSlot[] = [];
    const usedIds = new Set<string>();

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

      const seedBase = `shop-trinket:${params.userId}:${params.date}:${slotIndex}`;
      const trinket =
        this.pickUnused(`${seedBase}:tier`, shopTrinketsByRarity(rarity), usedIds) ??
        // The rolled rarity tier is fully exhausted (only possible for the
        // 3-item legendary tier under an unlucky run of rolls) — fall back
        // to the whole catalog so 5 unique slots are always achievable.
        this.pickUnused(`${seedBase}:all`, SHOP_TRINKETS, usedIds)!;

      usedIds.add(trinket.id);
      slots.push({ slotIndex, trinket });
    }

    return slots;
  }

  private pickUnused(
    seed: string,
    pool: readonly ShopTrinket[],
    usedIds: ReadonlySet<string>,
  ): ShopTrinket | undefined {
    const available = pool.filter((t) => !usedIds.has(t.id));
    if (available.length === 0) return undefined;
    const index = Math.floor(this.rewardService.hash01(seed) * available.length);
    return available[Math.min(index, available.length - 1)];
  }
}
