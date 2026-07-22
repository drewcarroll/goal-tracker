import type { TrinketRarity } from "@/domain/value-objects/Trinket";

export interface OwnedTrinketDTO {
  id: string;
  emoji: string;
  name: string;
  quantity: number;
  source: "battle_pass" | "shop";
  /** Undefined for battle-pass trinkets — those show a "Limited edition" tag instead of a rarity. */
  rarity?: TrinketRarity;
  /** ISO 8601 — when this trinket was last obtained (a fresh row or a duplicate). */
  updatedAt: string;
}

export interface TrinketCollectionDTO {
  trinkets: OwnedTrinketDTO[];
  /** Owned/total per shop rarity tier, e.g. { legendary: { owned: 1, total: 3 } }. */
  tierCounts: Record<TrinketRarity, { owned: number; total: number }>;
  /** Owned battle-pass exclusives — no denominator shown (the pool is large and partially unobtainable retroactively, see docs/plan.md). */
  limitedEditionOwned: number;
}

export interface ActivityFeedItemDTO {
  userId: string;
  username: string;
  type: "battle_pass_claim" | "shop_purchase";
  trinket?: { id: string; emoji: string; name: string };
  coins?: number;
  occurredAt: string; // ISO 8601
}
