import { describe, it, expect } from "vitest";
import { MysteryBoxRollService } from "./MysteryBoxRollService";
import { DeterministicRewardService } from "./DeterministicRewardService";
import { DEFAULT_ECONOMY_CONFIG } from "../value-objects/EconomyConfig";
import { SHOP_TRINKETS } from "../value-objects/ShopTrinketCatalog";

describe("MysteryBoxRollService", () => {
  const service = new MysteryBoxRollService(new DeterministicRewardService());
  const shopIds = new Set(SHOP_TRINKETS.map((t) => t.id));

  it("always rolls a real shop trinket", () => {
    const trinket = service.roll({ seed: "purchase-1", economyConfig: DEFAULT_ECONOMY_CONFIG });
    expect(shopIds.has(trinket.id)).toBe(true);
  });

  it("is deterministic: the same seed always rolls the same trinket", () => {
    const a = service.roll({ seed: "purchase-1", economyConfig: DEFAULT_ECONOMY_CONFIG });
    const b = service.roll({ seed: "purchase-1", economyConfig: DEFAULT_ECONOMY_CONFIG });
    expect(a).toEqual(b);
  });

  it("a different seed rolls a different trinket (not guaranteed, but overwhelmingly likely)", () => {
    const a = service.roll({ seed: "purchase-1", economyConfig: DEFAULT_ECONOMY_CONFIG });
    const b = service.roll({ seed: "purchase-2", economyConfig: DEFAULT_ECONOMY_CONFIG });
    expect(a.id).not.toBe(b.id);
  });

  it("only ever rolls a rarity with a positive weight", () => {
    const zeroLegendary = { ...DEFAULT_ECONOMY_CONFIG, shopLegendaryWeight: 0 };
    for (let i = 0; i < 200; i++) {
      const trinket = service.roll({ seed: `seed-${i}`, economyConfig: zeroLegendary });
      expect(trinket.rarity).not.toBe("legendary");
    }
  });

  it("hits the target odds over many rolls: 50% common / 33% rare / 12% epic / 5% legendary (Drew's exact target, 2026-07-21)", () => {
    const rolls = 20000;
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };

    for (let i = 0; i < rolls; i++) {
      const trinket = service.roll({ seed: `stat-${i}`, economyConfig: DEFAULT_ECONOMY_CONFIG });
      counts[trinket.rarity] = (counts[trinket.rarity] ?? 0) + 1;
    }

    // Generous tolerance band — statistical check on a deterministic-but-
    // effectively-random hash, not an exact assertion.
    expect(counts.common! / rolls).toBeGreaterThan(0.46);
    expect(counts.common! / rolls).toBeLessThan(0.54);
    expect(counts.rare! / rolls).toBeGreaterThan(0.29);
    expect(counts.rare! / rolls).toBeLessThan(0.37);
    expect(counts.epic! / rolls).toBeGreaterThan(0.09);
    expect(counts.epic! / rolls).toBeLessThan(0.15);
    expect(counts.legendary! / rolls).toBeGreaterThan(0.03);
    expect(counts.legendary! / rolls).toBeLessThan(0.07);
  });
});
