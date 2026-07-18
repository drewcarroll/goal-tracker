import type { TrinketRarity } from "@/domain/value-objects/Trinket";

export interface OwnedTrinketDTO {
  id: string;
  emoji: string;
  name: string;
  quantity: number;
  source: "battle_pass" | "shop";
  /** Undefined for battle-pass trinkets — those show a "Limited edition" tag instead of a rarity. */
  rarity?: TrinketRarity;
}

export interface ActivityFeedItemDTO {
  userId: string;
  username: string;
  type: "battle_pass_claim" | "shop_purchase";
  trinket?: { id: string; emoji: string; name: string };
  coins?: number;
  occurredAt: string; // ISO 8601
}
