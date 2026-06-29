import type { SupabaseClient } from "@supabase/supabase-js";
import { LogEntry } from "@/domain/entities/LogEntry";
import { LogRepository } from "@/domain/repositories/LogRepository";

const LOGS_TABLE = "logs";

/** Shape of a row in the `logs` table. */
interface LogRow {
  id: string;
  goal_id: string;
  user_id: string;
  week_index: number;
  value: number | string;
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the LogRepository port. Contains zero
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

  async findById(id: string): Promise<LogEntry | null> {
    const { data, error } = await this.client
      .from(LOGS_TABLE)
      .select("id, goal_id, user_id, week_index, value, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch log "${id}": ${error.message}`);
    }
    return data ? this.toDomain(data as LogRow) : null;
  }

  async findByGoalId(goalId: string): Promise<LogEntry[]> {
    const { data, error } = await this.client
      .from(LOGS_TABLE)
      .select("id, goal_id, user_id, week_index, value, created_at")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch logs for goal "${goalId}": ${error.message}`);
    }
    return (data as LogRow[]).map((row) => this.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(LOGS_TABLE).delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete log "${id}": ${error.message}`);
    }
  }

  private toDomain(row: LogRow): LogEntry {
    return LogEntry.rehydrate({
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      weekIndex: row.week_index,
      value: Number(row.value),
      createdAt: new Date(row.created_at),
    });
  }
}
