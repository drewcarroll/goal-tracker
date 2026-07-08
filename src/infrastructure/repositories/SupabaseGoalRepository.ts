import type { SupabaseClient } from "@supabase/supabase-js";
import { Goal, type GoalDifficulty, type GoalState } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";

const GOALS_TABLE = "habits"; // physical table name predates the Goal/Habit merge — see docs/plan.md

/** Shape of a row in the `habits` (Goal) table. */
interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  weekly_frequency_target: number;
  difficulty: GoalDifficulty;
  current_lock_cost: number;
  state: GoalState;
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the GoalRepository port. Contains
 * zero business logic — just row <-> entity mapping.
 */
export class SupabaseGoalRepository implements GoalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Goal | null> {
    const { data, error } = await this.client
      .from(GOALS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch goal "${id}": ${error.message}`);
    }
    return data ? this.toDomain(data as GoalRow) : null;
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    const { data, error } = await this.client
      .from(GOALS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals for user "${userId}": ${error.message}`);
    }
    return (data as GoalRow[]).map((row) => this.toDomain(row));
  }

  async save(goal: Goal): Promise<void> {
    const { error } = await this.client.from(GOALS_TABLE).upsert(
      {
        id: goal.id,
        user_id: goal.userId,
        name: goal.name,
        weekly_frequency_target: goal.weeklyFrequencyTarget,
        difficulty: goal.difficulty,
        current_lock_cost: goal.currentLockCost,
        state: goal.state,
        created_at: goal.createdAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save goal "${goal.id}": ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(GOALS_TABLE).delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete goal "${id}": ${error.message}`);
    }
  }

  private toDomain(row: GoalRow): Goal {
    return Goal.rehydrate({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      weeklyFrequencyTarget: row.weekly_frequency_target,
      difficulty: row.difficulty,
      currentLockCost: row.current_lock_cost,
      state: row.state,
      createdAt: new Date(row.created_at),
    });
  }
}
