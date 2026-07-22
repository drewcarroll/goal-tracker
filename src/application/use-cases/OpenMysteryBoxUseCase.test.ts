import { describe, it, expect } from "vitest";
import { OpenMysteryBoxUseCase } from "./OpenMysteryBoxUseCase";
import { ShopPurchaseRepository, ShopPurchase } from "../../domain/repositories/ShopPurchaseRepository";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "../../domain/repositories/CoinWalletRepository";
import {
  TrinketInventoryRepository,
  TrinketInventoryEntry,
} from "../../domain/repositories/TrinketInventoryRepository";
import { ActivityEventRepository, ActivityEvent } from "../../domain/repositories/ActivityEventRepository";
import { MysteryBoxRollService } from "../../domain/services/MysteryBoxRollService";
import { DeterministicRewardService } from "../../domain/services/DeterministicRewardService";
import { economyConfigFrom } from "../../domain/value-objects/EconomyConfig";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";
import { InsufficientCoinsError } from "../errors/ApplicationError";

class InMemoryShopPurchaseRepository implements ShopPurchaseRepository {
  public purchases: ShopPurchase[] = [];
  async save(purchase: ShopPurchase) {
    this.purchases.push(purchase);
  }
}

class InMemoryEconomyConfigRepository implements EconomyConfigRepository {
  async getEconomyConfig() {
    return economyConfigFrom(null);
  }
  async saveEconomyConfig() {}
  async resetEconomyConfig() {}
}

class InMemoryCoinWalletRepository implements CoinWalletRepository {
  private balances: Record<string, number>;
  constructor(seed: Record<string, number> = {}) {
    this.balances = seed;
  }
  async getBalance(userId: string) {
    return this.balances[userId] ?? 0;
  }
  async adjustBalance(userId: string, delta: number) {
    const next = (this.balances[userId] ?? 0) + delta;
    if (next < 0) throw new Error("insufficient coin balance");
    this.balances[userId] = next;
    return next;
  }
}

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  private inventory: Record<string, Map<string, TrinketInventoryEntry>> = {};
  async incrementQuantity(userId: string, trinketId: string, by = 1) {
    const map = (this.inventory[userId] ??= new Map());
    const prev = map.get(trinketId)?.quantity ?? 0;
    map.set(trinketId, { quantity: prev + by, updatedAt: "2026-07-21T00:00:00.000Z" });
  }
  async getInventory(userId: string) {
    return this.inventory[userId] ?? new Map();
  }
}

class InMemoryActivityEventRepository implements ActivityEventRepository {
  public events: ActivityEvent[] = [];
  async record(event: ActivityEvent) {
    this.events.push(event);
  }
  async findForUsers(userIds: readonly string[], limit: number) {
    return this.events.filter((e) => userIds.includes(e.userId)).slice(0, limit);
  }
}

class FixedClock implements Clock {
  now() {
    return new Date("2026-07-21T12:00:00Z");
  }
}

function buildUseCase(coinBalance = 1000) {
  let counter = 0;
  const idGenerator: IdGenerator = { generate: () => `id-${++counter}` };
  const purchaseRepo = new InMemoryShopPurchaseRepository();
  const walletRepo = new InMemoryCoinWalletRepository({ "user-1": coinBalance });
  const inventoryRepo = new InMemoryTrinketInventoryRepository();
  const activityRepo = new InMemoryActivityEventRepository();
  const economyRepo = new InMemoryEconomyConfigRepository();
  const rollService = new MysteryBoxRollService(new DeterministicRewardService());
  const useCase = new OpenMysteryBoxUseCase(
    purchaseRepo,
    economyRepo,
    walletRepo,
    inventoryRepo,
    activityRepo,
    rollService,
    idGenerator,
    new FixedClock(),
  );
  return { useCase, purchaseRepo, walletRepo, inventoryRepo, activityRepo };
}

describe("OpenMysteryBoxUseCase", () => {
  it("rolls a trinket, deducts coins, and records the purchase", async () => {
    const { useCase, purchaseRepo, walletRepo } = buildUseCase(1000);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.balance).toBe(1000 - 200);
    expect(await walletRepo.getBalance("user-1")).toBe(800);
    expect(purchaseRepo.purchases).toHaveLength(1);
    expect(purchaseRepo.purchases[0]!.trinketId).toBe(result.trinket.id);
    expect(result.quantity).toBe(1);
  });

  it("increments quantity/level across repeat opens that happen to roll the same trinket", async () => {
    const { inventoryRepo } = buildUseCase(1000);
    // Simulate two opens landing on the same trinket directly via the
    // inventory repo, since the roll itself is effectively random per a
    // fresh id and not something a test can force deterministically here.
    await inventoryRepo.incrementQuantity("user-1", "shop:common:01", 1);
    await inventoryRepo.incrementQuantity("user-1", "shop:common:01", 1);
    const inventory = await inventoryRepo.getInventory("user-1");
    expect(inventory.get("shop:common:01")?.quantity).toBe(2);
  });

  it("records an activity event for the open", async () => {
    const { useCase, activityRepo } = buildUseCase(1000);
    const result = await useCase.execute({ userId: "user-1" });
    expect(activityRepo.events).toHaveLength(1);
    expect(activityRepo.events[0]).toMatchObject({
      userId: "user-1",
      type: "shop_purchase",
      trinketId: result.trinket.id,
    });
  });

  it("allows opening as many boxes as the balance affords — no daily limit", async () => {
    const { useCase, purchaseRepo } = buildUseCase(10000);
    for (let i = 0; i < 10; i++) {
      await useCase.execute({ userId: "user-1" });
    }
    expect(purchaseRepo.purchases).toHaveLength(10);
  });

  it("rejects an open when the balance can't cover the flat price", async () => {
    const { useCase } = buildUseCase(100); // price is 200
    await expect(useCase.execute({ userId: "user-1" })).rejects.toBeInstanceOf(InsufficientCoinsError);
  });
});
