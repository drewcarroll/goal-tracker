import { describe, it, expect } from "vitest";
import { GetShopOfferUseCase } from "./GetShopOfferUseCase";
import { ShopPurchaseRepository, ShopPurchase } from "../../domain/repositories/ShopPurchaseRepository";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "../../domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "../../domain/repositories/TrinketInventoryRepository";
import { ShopRollService } from "../../domain/services/ShopRollService";
import { DeterministicRewardService } from "../../domain/services/DeterministicRewardService";
import { economyConfigFrom } from "../../domain/value-objects/EconomyConfig";

class InMemoryShopPurchaseRepository implements ShopPurchaseRepository {
  public purchases: ShopPurchase[] = [];
  async findPurchasedSlotsForDate(userId: string, date: string) {
    return new Set(
      this.purchases.filter((p) => p.userId === userId && p.date === date).map((p) => p.slotIndex),
    );
  }
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
  private balances: Record<string, number> = {};
  constructor(seed: Record<string, number> = {}) {
    this.balances = seed;
  }
  async getBalance(userId: string) {
    return this.balances[userId] ?? 0;
  }
  async adjustBalance(userId: string, delta: number) {
    const next = (this.balances[userId] ?? 0) + delta;
    this.balances[userId] = next;
    return next;
  }
}

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  private inventory: Record<string, Map<string, number>> = {};
  async incrementQuantity(userId: string, trinketId: string, by = 1) {
    const map = (this.inventory[userId] ??= new Map());
    map.set(trinketId, (map.get(trinketId) ?? 0) + by);
  }
  async getInventory(userId: string) {
    return this.inventory[userId] ?? new Map();
  }
}

describe("GetShopOfferUseCase", () => {
  it("returns 5 priced slots with purchased/owned state and coin balance", async () => {
    const useCase = new GetShopOfferUseCase(
      new InMemoryShopPurchaseRepository(),
      new InMemoryEconomyConfigRepository(),
      new InMemoryCoinWalletRepository({ "user-1": 500 }),
      new InMemoryTrinketInventoryRepository(),
      new ShopRollService(new DeterministicRewardService()),
    );

    const offer = await useCase.execute({ userId: "user-1", date: "2026-07-16" });

    expect(offer.slots).toHaveLength(5);
    expect(offer.coinBalance).toBe(500);
    for (const slot of offer.slots) {
      expect(slot.price).toBe(200); // DEFAULT_ECONOMY_CONFIG.shopTrinketPrice
      expect(slot.purchased).toBe(false);
      expect(slot.ownedQuantity).toBe(0);
    }
  });

  it("marks an already-purchased slot as purchased", async () => {
    const purchaseRepo = new InMemoryShopPurchaseRepository();
    await purchaseRepo.save({
      userId: "user-1",
      date: "2026-07-16",
      slotIndex: 0,
      trinketId: "shop:common:01",
      pricePaid: 200,
    });
    const useCase = new GetShopOfferUseCase(
      purchaseRepo,
      new InMemoryEconomyConfigRepository(),
      new InMemoryCoinWalletRepository(),
      new InMemoryTrinketInventoryRepository(),
      new ShopRollService(new DeterministicRewardService()),
    );

    const offer = await useCase.execute({ userId: "user-1", date: "2026-07-16" });
    expect(offer.slots[0]!.purchased).toBe(true);
  });
});
