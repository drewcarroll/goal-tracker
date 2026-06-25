import type { SupabaseClient } from "@supabase/supabase-js";
import { LogEntry } from "@/domain/entities/LogEntry";
import { LogRepository } from "@/domain/repositories/LogRepository";

const LOGS_TABLE = "logs";

/**
 * Supabase/PostgreSQL implementation of the LogRepository port.
 * Logs are append-only, so this adapter only inserts rows. Contains zero
 * business logic. Per-user scoping is enforced upstream in the use case; the
 * denormalised `user_id` is persisted so logs can be queried by owner.
 */
export class SupabaseLogRepository implements LogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async add(entry: LogEntry): Promise<void> {
    const { error } = await this.client.from(LOGS_TABLE).insert({
      id: entry.id,
      goal_id: entry.goalId,
      user_id: entry.userId,
      week_index: entry.weekIndex,
      value: entry.value,
      created_at: entry.createdAt.toISOString(),
    });
    if (error) {
      throw new Error(`Failed to save log for goal "${entry.goalId}": ${error.message}`);
    }
  }
}
