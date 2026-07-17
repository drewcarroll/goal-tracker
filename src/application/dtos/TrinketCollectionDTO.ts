export interface OwnedTrinketDTO {
  id: string;
  emoji: string;
  name: string;
  quantity: number;
  source: "battle_pass" | "shop";
}

export interface ActivityFeedItemDTO {
  userId: string;
  username: string;
  type: "battle_pass_claim" | "shop_purchase";
  trinket?: { id: string; emoji: string; name: string };
  coins?: number;
  occurredAt: string; // ISO 8601
}
