export interface ShopPurchase {
  userId: string;
  date: string;
  slotIndex: number;
  trinketId: string;
  pricePaid: number;
}

/**
 * One row per purchase — also the rate-limit guard: at most one row per
 * (user, date, slot_index), i.e. one purchase per offered slot per day
 * (unique constraint in schema.sql), so ≤5 purchases/day total.
 */
export interface ShopPurchaseRepository {
  findPurchasedSlotsForDate(userId: string, date: string): Promise<ReadonlySet<number>>;
  save(purchase: ShopPurchase): Promise<void>;
}
