import { describe, it, expect } from "vitest";
import { SetPinnedTrinketsUseCase } from "./SetPinnedTrinketsUseCase";
import { PinnedTrinketRepository } from "../../domain/repositories/PinnedTrinketRepository";
import { TrinketInventoryRepository } from "../../domain/repositories/TrinketInventoryRepository";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import { economyConfigFrom } from "../../domain/value-objects/EconomyConfig";
import { TooManyPinnedTrinketsError } from "../errors/ApplicationError";

class InMemoryPinnedTrinketRepository implements PinnedTrinketRepository {
  public pinned: string[] = [];
  async getPinned() {
    return this.pinned;
  }
  async setPinned(_userId: string, trinketIds: readonly string[]) {
    this.pinned = [...trinketIds];
  }
}

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  constructor(private inventory: Map<string, number> = new Map()) {}
  async incrementQuantity() {}
  async getInventory() {
    return this.inventory;
  }
}

class InMemoryEconomyConfigRepository implements EconomyConfigRepository {
  constructor(private override: Partial<{ maxPinnedTrinkets: number }> = {}) {}
  async getEconomyConfig() {
    return economyConfigFrom(this.override);
  }
  async saveEconomyConfig() {}
  async resetEconomyConfig() {}
}

describe("SetPinnedTrinketsUseCase", () => {
  it("saves the pinned set when within the cap and all owned", async () => {
    const pinnedRepo = new InMemoryPinnedTrinketRepository();
    const inventory = new Map([
      ["shop:common:01", 1],
      ["bp:2026-07:d5", 2],
    ]);
    const useCase = new SetPinnedTrinketsUseCase(
      pinnedRepo,
      new InMemoryTrinketInventoryRepository(inventory),
      new InMemoryEconomyConfigRepository(),
    );

    await useCase.execute({ userId: "user-1", trinketIds: ["shop:common:01", "bp:2026-07:d5"] });

    expect(pinnedRepo.pinned).toEqual(["shop:common:01", "bp:2026-07:d5"]);
  });

  it("drops ids the user doesn't own rather than erroring", async () => {
    const pinnedRepo = new InMemoryPinnedTrinketRepository();
    const inventory = new Map([["shop:common:01", 1]]);
    const useCase = new SetPinnedTrinketsUseCase(
      pinnedRepo,
      new InMemoryTrinketInventoryRepository(inventory),
      new InMemoryEconomyConfigRepository(),
    );

    await useCase.execute({ userId: "user-1", trinketIds: ["shop:common:01", "shop:common:02"] });

    expect(pinnedRepo.pinned).toEqual(["shop:common:01"]);
  });

  it("rejects more than the configured max", async () => {
    const useCase = new SetPinnedTrinketsUseCase(
      new InMemoryPinnedTrinketRepository(),
      new InMemoryTrinketInventoryRepository(),
      new InMemoryEconomyConfigRepository({ maxPinnedTrinkets: 2 }),
    );

    await expect(
      useCase.execute({ userId: "user-1", trinketIds: ["a", "b", "c"] }),
    ).rejects.toBeInstanceOf(TooManyPinnedTrinketsError);
  });
});
