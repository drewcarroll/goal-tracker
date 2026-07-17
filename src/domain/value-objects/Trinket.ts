export type TrinketRarity = "common" | "rare" | "epic" | "legendary";

/**
 * A collectible. Battle-pass trinkets (`bp:*`) and shop trinkets (`shop:*`)
 * share this shape but live in disjoint pools — the id prefix is what keeps
 * them structurally disjoint, not a runtime check (see BattlePassCalendarMap
 * and ShopTrinketCatalog).
 */
export interface Trinket {
  id: string;
  emoji: string;
  name: string;
}
