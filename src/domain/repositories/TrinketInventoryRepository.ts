export interface TrinketInventoryEntry {
  quantity: number;
  /** ISO 8601 — when this trinket was last obtained (a fresh row or a duplicate). Powers Collection's "most recently obtained" sort. */
  updatedAt: string;
}

/**
 * Per-user-per-trinket owned QUANTITY (not a boolean — duplicates are
 * expected and allowed, both from the battle pass replay-safe claim and the
 * mystery box). The UI shows the trinket's level from this quantity
 * directly (see Collection's level badge — every duplicate is +1 level).
 */
export interface TrinketInventoryRepository {
  incrementQuantity(userId: string, trinketId: string, by?: number): Promise<void>;
  /** trinketId -> { quantity, updatedAt }, for every trinket the user owns at least one of. */
  getInventory(userId: string): Promise<ReadonlyMap<string, TrinketInventoryEntry>>;
}
