/**
 * Per-user-per-trinket owned QUANTITY (not a boolean — duplicates are
 * expected and allowed, both from the battle pass replay-safe claim and,
 * later, the shop). The UI shows a "×N" badge when N>1.
 */
export interface TrinketInventoryRepository {
  incrementQuantity(userId: string, trinketId: string, by?: number): Promise<void>;
  /** trinketId -> quantity owned, for every trinket the user owns at least one of. */
  getInventory(userId: string): Promise<ReadonlyMap<string, number>>;
}
