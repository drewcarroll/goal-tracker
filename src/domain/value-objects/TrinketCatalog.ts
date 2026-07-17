import type { Trinket } from "./Trinket";
import { allBattlePassTrinkets } from "./BattlePassCalendarMap";
import { getShopTrinketById } from "./ShopTrinketCatalog";

const BATTLE_PASS_TRINKETS_BY_ID: ReadonlyMap<string, Trinket> = new Map(
  allBattlePassTrinkets().map((trinket) => [trinket.id, trinket]),
);

/**
 * Looks a trinket up across BOTH pools by its namespaced id (`bp:*` or
 * `shop:*`) — the one place inventory/feed code needs to resolve an owned
 * trinket id back to its emoji/name without caring which pool it came from.
 */
export function getTrinketById(id: string): Trinket | undefined {
  if (id.startsWith("bp:")) return BATTLE_PASS_TRINKETS_BY_ID.get(id);
  if (id.startsWith("shop:")) return getShopTrinketById(id);
  return undefined;
}

export function trinketSource(id: string): "battle_pass" | "shop" | "unknown" {
  if (id.startsWith("bp:")) return "battle_pass";
  if (id.startsWith("shop:")) return "shop";
  return "unknown";
}
