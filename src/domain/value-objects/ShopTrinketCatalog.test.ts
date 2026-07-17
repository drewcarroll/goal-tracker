import { describe, it, expect } from "vitest";
import { SHOP_TRINKETS, getShopTrinketById, shopTrinketsByRarity } from "./ShopTrinketCatalog";
import { allBattlePassTrinkets } from "./BattlePassCalendarMap";

describe("ShopTrinketCatalog", () => {
  it("has exactly 100 trinkets", () => {
    expect(SHOP_TRINKETS).toHaveLength(100);
  });

  it("every id is shop-namespaced and unique", () => {
    const ids = SHOP_TRINKETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("shop:"))).toBe(true);
  });

  it("rarity tiers match the 55/30/12/3 split", () => {
    expect(shopTrinketsByRarity("common")).toHaveLength(55);
    expect(shopTrinketsByRarity("rare")).toHaveLength(30);
    expect(shopTrinketsByRarity("epic")).toHaveLength(12);
    expect(shopTrinketsByRarity("legendary")).toHaveLength(3);
  });

  it("looks a trinket up by id", () => {
    const first = SHOP_TRINKETS[0]!;
    expect(getShopTrinketById(first.id)).toEqual(first);
    expect(getShopTrinketById("shop:legendary:99")).toBeUndefined();
  });

  it("never overlaps with the battle-pass trinket pool, even by id or emoji", () => {
    const battlePassIds = new Set(allBattlePassTrinkets().map((t) => t.id));
    const shopIds = new Set(SHOP_TRINKETS.map((t) => t.id));
    for (const id of shopIds) {
      expect(battlePassIds.has(id)).toBe(false);
    }
    expect([...shopIds].every((id) => !id.startsWith("bp:"))).toBe(true);
  });
});
