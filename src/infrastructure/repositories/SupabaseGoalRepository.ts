import type { SupabaseClient } from "@supabase/supabase-js";
import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalStatus } from "@/domain/value-objects/GoalStatus";
import { Progress } from "@/domain/value-objects/Progress";

const TABLE = "goals";

/** Shape of a row in the `goals` table (DB concern, stays in infrastructure). */
interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the GoalRepository port.
 * Maps DB rows <-> domain entities. Contains zero business logic.
 */
export class SupabaseGoalRepository implements GoalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Goal | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch goal "${id}": ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return this.toDomain(data as GoalRow);
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals for user "${userId}": ${error.message}`);
    }
    return (data as GoalRow[]).map((row) => this.toDomain(row));
  }

  async save(goal: Goal): Promise<void> {
    const row = this.toRow(goal);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(`Failed to save goal "${goal.id}": ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete goal "${id}": ${error.message}`);
    }
  }

  // --- Mapping helpers ---

  private toDomain(row: GoalRow): Goal {
    return Goal.rehydrate({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      status: GoalStatus.fromString(row.status),
      progress: Progress.fromPercent(row.progress),
      dueDate: row.due_date ? new Date(row.due_date) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private toRow(goal: Goal): GoalRow {
    return {
      id: goal.id,
      user_id: goal.userId,
      title: goal.title,
      description: goal.description,
      status: goal.status.toString(),
      progress: goal.progress.value(),
      due_date: goal.dueDate ? goal.dueDate.toISOString() : null,
      created_at: goal.createdAt.toISOString(),
      updated_at: goal.updatedAt.toISOString(),
    };
  }
}
