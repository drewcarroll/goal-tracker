import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { getTrinketById, trinketSource } from "@/domain/value-objects/TrinketCatalog";
import { getShopTrinketById, SHOP_TIER_TOTALS } from "@/domain/value-objects/ShopTrinketCatalog";
import type { TrinketRarity } from "@/domain/value-objects/Trinket";
import type { OwnedTrinketDTO, TrinketCollectionDTO } from "../dtos/TrinketCollectionDTO";

export interface GetTrinketCollectionDTO {
  userId: string;
}

const RARITIES: readonly TrinketRarity[] = ["common", "rare", "epic", "legendary"];

/**
 * Use Case: a user's owned trinkets with quantity — NOT a collect-once
 * model, duplicates show as ownedQuantity > 1 (user decision, 2026-07-16),
 * and every duplicate is +1 real level (2026-07-21, see Collection's level
 * badge). Also returns per-tier owned/total counts and a limited-edition
 * (battle-pass) owned count, for the Collection headline. Shared by "my
 * collection" and, later, a friend's collection view.
 */
export class GetTrinketCollectionUseCase {
  constructor(private readonly trinketInventoryRepository: TrinketInventoryRepository) {}

  async execute(dto: GetTrinketCollectionDTO): Promise<TrinketCollectionDTO> {
    const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
    const trinkets: OwnedTrinketDTO[] = [];
    const tierCounts = Object.fromEntries(
      RARITIES.map((rarity) => [rarity, { owned: 0, total: SHOP_TIER_TOTALS[rarity] }]),
    ) as TrinketCollectionDTO["tierCounts"];
    let limitedEditionOwned = 0;

    for (const [trinketId, entry] of inventory) {
      const trinket = getTrinketById(trinketId);
      const source = trinketSource(trinketId);
      if (!trinket || source === "unknown") continue; // defensive; every stored id should resolve
      const rarity = source === "shop" ? getShopTrinketById(trinketId)?.rarity : undefined;
      trinkets.push({
        id: trinket.id,
        emoji: trinket.emoji,
        name: trinket.name,
        quantity: entry.quantity,
        source,
        rarity,
        updatedAt: entry.updatedAt,
      });
      if (rarity) tierCounts[rarity].owned++;
      else limitedEditionOwned++;
    }

    trinkets.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));

    return { trinkets, tierCounts, limitedEditionOwned };
  }
}
