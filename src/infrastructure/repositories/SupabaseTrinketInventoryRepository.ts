import type { SupabaseClient } from "@supabase/supabase-js";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";

const TABLE = "trinket_inventory";

export class SupabaseTrinketInventoryRepository implements TrinketInventoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async incrementQuantity(userId: string, trinketId: string, by = 1): Promise<void> {
    const { data, error: readError } = await this.client
      .from(TABLE)
      .select("quantity")
      .eq("user_id", userId)
      .eq("trinket_id", trinketId)
      .maybeSingle();

    if (readError) {
      throw new Error(`Failed to read trinket inventory for user "${userId}": ${readError.message}`);
    }

    const nextQuantity = ((data as { quantity: number } | null)?.quantity ?? 0) + by;
    const { error: writeError } = await this.client.from(TABLE).upsert(
      {
        user_id: userId,
        trinket_id: trinketId,
        quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,trinket_id" },
    );
    if (writeError) {
      throw new Error(`Failed to update trinket inventory for user "${userId}": ${writeError.message}`);
    }
  }

  async getInventory(userId: string): Promise<ReadonlyMap<string, number>> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("trinket_id, quantity")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to fetch trinket inventory for user "${userId}": ${error.message}`);
    }
    return new Map(
      (data as { trinket_id: string; quantity: number }[]).map((row) => [row.trinket_id, row.quantity]),
    );
  }
}
