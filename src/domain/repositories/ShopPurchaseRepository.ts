export interface ShopPurchase {
  userId: string;
  trinketId: string;
  pricePaid: number;
}

/**
 * A flat purchase log — one row per mystery box opened. Simplified
 * 2026-07-21: the old slot/date/uniqueness shape existed only to rate-limit
 * the daily 5-slot rotation, which no longer exists (a box can be opened
 * any time, bounded only by coin balance).
 */
export interface ShopPurchaseRepository {
  save(purchase: ShopPurchase): Promise<void>;
}
