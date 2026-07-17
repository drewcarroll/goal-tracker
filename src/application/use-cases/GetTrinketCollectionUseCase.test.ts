import { describe, it, expect } from "vitest";
import { GetTrinketCollectionUseCase } from "./GetTrinketCollectionUseCase";
import { TrinketInventoryRepository } from "../../domain/repositories/TrinketInventoryRepository";

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  constructor(private inventory: Map<string, number> = new Map()) {}
  async incrementQuantity(_userId: string, trinketId: string, by = 1) {
    this.inventory.set(trinketId, (this.inventory.get(trinketId) ?? 0) + by);
  }
  async getInventory() {
    return this.inventory;
  }
}

describe("GetTrinketCollectionUseCase", () => {
  it("resolves owned trinket ids to emoji/name/source and sorts by quantity desc", async () => {
    const inventory = new Map([
      ["bp:2026-07:d25", 1],
      ["shop:common:01", 3],
    ]);
    const useCase = new GetTrinketCollectionUseCase(new InMemoryTrinketInventoryRepository(inventory));

    const collection = await useCase.execute({ userId: "user-1" });

    expect(collection).toHaveLength(2);
    expect(collection[0]).toMatchObject({ id: "shop:common:01", quantity: 3, source: "shop" });
    expect(collection[1]).toMatchObject({ id: "bp:2026-07:d25", quantity: 1, source: "battle_pass" });
  });

  it("returns an empty list for a user with nothing owned", async () => {
    const useCase = new GetTrinketCollectionUseCase(new InMemoryTrinketInventoryRepository());
    expect(await useCase.execute({ userId: "user-1" })).toEqual([]);
  });
});
