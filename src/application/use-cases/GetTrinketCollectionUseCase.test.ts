import { describe, it, expect } from "vitest";
import { GetTrinketCollectionUseCase } from "./GetTrinketCollectionUseCase";
import {
  TrinketInventoryRepository,
  TrinketInventoryEntry,
} from "../../domain/repositories/TrinketInventoryRepository";
import { SHOP_TIER_TOTALS } from "../../domain/value-objects/ShopTrinketCatalog";

const UPDATED_AT = "2026-07-21T00:00:00.000Z";

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  constructor(private inventory: Map<string, TrinketInventoryEntry> = new Map()) {}
  async incrementQuantity(_userId: string, trinketId: string, by = 1) {
    const prev = this.inventory.get(trinketId)?.quantity ?? 0;
    this.inventory.set(trinketId, { quantity: prev + by, updatedAt: UPDATED_AT });
  }
  async getInventory() {
    return this.inventory;
  }
}

describe("GetTrinketCollectionUseCase", () => {
  it("resolves owned trinket ids to emoji/name/source and sorts by quantity desc", async () => {
    const inventory = new Map<string, TrinketInventoryEntry>([
      ["bp:2026-07:d25", { quantity: 1, updatedAt: UPDATED_AT }],
      ["shop:common:01", { quantity: 3, updatedAt: UPDATED_AT }],
    ]);
    const useCase = new GetTrinketCollectionUseCase(new InMemoryTrinketInventoryRepository(inventory));

    const collection = await useCase.execute({ userId: "user-1" });

    expect(collection.trinkets).toHaveLength(2);
    expect(collection.trinkets[0]).toMatchObject({
      id: "shop:common:01",
      quantity: 3,
      source: "shop",
      rarity: "common",
      updatedAt: UPDATED_AT,
    });
    expect(collection.trinkets[1]).toMatchObject({
      id: "bp:2026-07:d25",
      quantity: 1,
      source: "battle_pass",
      rarity: undefined,
    });
  });

  it("computes per-tier owned/total counts and the limited-edition owned count", async () => {
    const inventory = new Map<string, TrinketInventoryEntry>([
      ["bp:2026-07:d25", { quantity: 1, updatedAt: UPDATED_AT }],
      ["shop:common:01", { quantity: 3, updatedAt: UPDATED_AT }],
      ["shop:rare:01", { quantity: 1, updatedAt: UPDATED_AT }],
    ]);
    const useCase = new GetTrinketCollectionUseCase(new InMemoryTrinketInventoryRepository(inventory));

    const collection = await useCase.execute({ userId: "user-1" });

    expect(collection.tierCounts.common).toEqual({ owned: 1, total: SHOP_TIER_TOTALS.common });
    expect(collection.tierCounts.rare).toEqual({ owned: 1, total: SHOP_TIER_TOTALS.rare });
    expect(collection.tierCounts.epic).toEqual({ owned: 0, total: SHOP_TIER_TOTALS.epic });
    expect(collection.tierCounts.legendary).toEqual({ owned: 0, total: SHOP_TIER_TOTALS.legendary });
    expect(collection.limitedEditionOwned).toBe(1);
  });

  it("returns an empty collection for a user with nothing owned", async () => {
    const useCase = new GetTrinketCollectionUseCase(new InMemoryTrinketInventoryRepository());
    const collection = await useCase.execute({ userId: "user-1" });
    expect(collection.trinkets).toEqual([]);
    expect(collection.limitedEditionOwned).toBe(0);
    expect(collection.tierCounts.common.owned).toBe(0);
  });
});
