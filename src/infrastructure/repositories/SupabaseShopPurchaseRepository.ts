import type { SupabaseClient } from "@supabase/supabase-js";
import { ShopPurchase, ShopPurchaseRepository } from "@/domain/repositories/ShopPurchaseRepository";

const TABLE = "shop_purchases";

export class SupabaseShopPurchaseRepository implements ShopPurchaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findPurchasedSlotsForDate(userId: string, date: string): Promise<ReadonlySet<number>> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("slot_index")
      .eq("user_id", userId)
      .eq("date", date);

    if (error) {
      throw new Error(`Failed to fetch shop purchases for user "${userId}": ${error.message}`);
    }
    return new Set((data as { slot_index: number }[]).map((row) => row.slot_index));
  }

  async save(purchase: ShopPurchase): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      user_id: purchase.userId,
      date: purchase.date,
      slot_index: purchase.slotIndex,
      trinket_id: purchase.trinketId,
      price_paid: purchase.pricePaid,
    });
    if (error) {
      throw new Error(`Failed to save shop purchase for user "${purchase.userId}": ${error.message}`);
    }
  }
}
