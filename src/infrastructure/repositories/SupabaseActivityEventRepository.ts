import type { SupabaseClient } from "@supabase/supabase-js";
import { ActivityEvent, ActivityEventRepository } from "@/domain/repositories/ActivityEventRepository";

const TABLE = "activity_events";

interface ActivityEventRow {
  user_id: string;
  type: "battle_pass_claim" | "shop_purchase";
  trinket_id: string | null;
  coins: number | null;
  occurred_at: string;
}

function toDomain(row: ActivityEventRow): ActivityEvent {
  return {
    userId: row.user_id,
    type: row.type,
    trinketId: row.trinket_id ?? undefined,
    coins: row.coins ?? undefined,
    occurredAt: new Date(row.occurred_at),
  };
}

export class SupabaseActivityEventRepository implements ActivityEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(event: ActivityEvent): Promise<void> {
    const { error } = await this.client.from(TABLE).insert({
      user_id: event.userId,
      type: event.type,
      trinket_id: event.trinketId ?? null,
      coins: event.coins ?? null,
      occurred_at: event.occurredAt.toISOString(),
    });
    if (error) {
      throw new Error(`Failed to record activity event for user "${event.userId}": ${error.message}`);
    }
  }

  async findForUsers(userIds: readonly string[], limit: number): Promise<ActivityEvent[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await this.client
      .from(TABLE)
      .select("user_id, type, trinket_id, coins, occurred_at")
      .in("user_id", userIds)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch activity events: ${error.message}`);
    }
    return (data as ActivityEventRow[]).map(toDomain);
  }
}
