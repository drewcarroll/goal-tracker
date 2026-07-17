import type { SupabaseClient } from "@supabase/supabase-js";
import { PinnedTrinketRepository } from "@/domain/repositories/PinnedTrinketRepository";

const TABLE = "pinned_trinkets";

export class SupabasePinnedTrinketRepository implements PinnedTrinketRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getPinned(userId: string): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("trinket_id, position")
      .eq("user_id", userId)
      .order("position", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pinned trinkets for user "${userId}": ${error.message}`);
    }
    return (data as { trinket_id: string }[]).map((row) => row.trinket_id);
  }

  async setPinned(userId: string, trinketIds: readonly string[]): Promise<void> {
    const { error: deleteError } = await this.client.from(TABLE).delete().eq("user_id", userId);
    if (deleteError) {
      throw new Error(`Failed to clear pinned trinkets for user "${userId}": ${deleteError.message}`);
    }
    if (trinketIds.length === 0) return;

    const rows = trinketIds.map((trinketId, position) => ({
      user_id: userId,
      trinket_id: trinketId,
      position,
    }));
    const { error: insertError } = await this.client.from(TABLE).insert(rows);
    if (insertError) {
      throw new Error(`Failed to save pinned trinkets for user "${userId}": ${insertError.message}`);
    }
  }
}
