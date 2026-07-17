import { describe, it, expect } from "vitest";
import { ShopRollService } from "./ShopRollService";
import { DeterministicRewardService } from "./DeterministicRewardService";
import { DEFAULT_ECONOMY_CONFIG } from "../value-objects/EconomyConfig";
import { SHOP_TRINKETS } from "../value-objects/ShopTrinketCatalog";

describe("ShopRollService", () => {
  const service = new ShopRollService(new DeterministicRewardService());
  const shopIds = new Set(SHOP_TRINKETS.map((t) => t.id));

  it("always offers exactly 5 slots, each a real shop trinket", () => {
    const offer = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-16",
      economyConfig: DEFAULT_ECONOMY_CONFIG,
    });
    expect(offer).toHaveLength(5);
    expect(offer.map((s) => s.slotIndex)).toEqual([0, 1, 2, 3, 4]);
    for (const slot of offer) {
      expect(shopIds.has(slot.trinket.id)).toBe(true);
    }
  });

  it("is deterministic: the same (userId, date) always rolls the same offer", () => {
    const a = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-16",
      economyConfig: DEFAULT_ECONOMY_CONFIG,
    });
    const b = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-16",
      economyConfig: DEFAULT_ECONOMY_CONFIG,
    });
    expect(a).toEqual(b);
  });

  it("a different day for the same user rolls a different offer (not guaranteed, but overwhelmingly likely)", () => {
    const a = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-16",
      economyConfig: DEFAULT_ECONOMY_CONFIG,
    });
    const b = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-17",
      economyConfig: DEFAULT_ECONOMY_CONFIG,
    });
    expect(a.map((s) => s.trinket.id)).not.toEqual(b.map((s) => s.trinket.id));
  });

  it("only ever offers a rarity with a positive weight", () => {
    const zeroLegendary = { ...DEFAULT_ECONOMY_CONFIG, shopLegendaryWeight: 0 };
    for (let day = 1; day <= 15; day++) {
      const offer = service.rollDailyOffer({
        userId: "user-1",
        date: `2026-07-${String(day).padStart(2, "0")}`,
        economyConfig: zeroLegendary,
      });
      expect(offer.some((s) => s.trinket.rarity === "legendary")).toBe(false);
    }
  });

  it("never repeats a trinket within the same day's offer, across many users and days (regression, 2026-07-17)", () => {
    for (let day = 1; day <= 60; day++) {
      for (const userId of ["user-1", "user-2", "user-3"]) {
        const offer = service.rollDailyOffer({
          userId,
          date: `2026-${String(Math.ceil(day / 28)).padStart(2, "0")}-${String(((day - 1) % 28) + 1).padStart(2, "0")}`,
          economyConfig: DEFAULT_ECONOMY_CONFIG,
        });
        const ids = offer.map((s) => s.trinket.id);
        expect(new Set(ids).size).toBe(5);
      }
    }
  });

  it("stays unique even when every slot rolls the 3-item legendary tier (forces the cross-tier fallback)", () => {
    const allLegendary = {
      ...DEFAULT_ECONOMY_CONFIG,
      shopCommonWeight: 0,
      shopRareWeight: 0,
      shopEpicWeight: 0,
      shopLegendaryWeight: 100,
    };
    const offer = service.rollDailyOffer({
      userId: "user-1",
      date: "2026-07-16",
      economyConfig: allLegendary,
    });
    const ids = offer.map((s) => s.trinket.id);
    expect(new Set(ids).size).toBe(5);
  });
});
