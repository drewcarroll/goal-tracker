import type { SupabaseClient } from "@supabase/supabase-js";
import { ShopPurchase, ShopPurchaseRepository } from "@/domain/repositories/ShopPurchaseRepository";

const TABLE = "shop_purchases";

export class SupabaseShopPurchaseRepository implements ShopPurchaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(purchase: ShopPurchase): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      user_id: purchase.userId,
      trinket_id: purchase.trinketId,
      price_paid: purchase.pricePaid,
    });
    if (error) {
      throw new Error(`Failed to save shop purchase for user "${purchase.userId}": ${error.message}`);
    }
  }
}
