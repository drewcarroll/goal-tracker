import type { SupabaseClient } from "@supabase/supabase-js";
import { Habit, type HabitDifficulty, type HabitState } from "@/domain/entities/Habit";
import { HabitRepository } from "@/domain/repositories/HabitRepository";

const HABITS_TABLE = "habits";

/** Shape of a row in the `habits` table. */
interface HabitRow {
  id: string;
  user_id: string;
  catalog_id: string;
  difficulty: HabitDifficulty;
  current_lock_cost: number;
  state: HabitState;
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the HabitRepository port. Contains
 * zero business logic — just row <-> entity mapping.
 */
export class SupabaseHabitRepository implements HabitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Habit | null> {
    const { data, error } = await this.client
      .from(HABITS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch habit "${id}": ${error.message}`);
    }
    return data ? this.toDomain(data as HabitRow) : null;
  }

  async findByUserId(userId: string): Promise<Habit[]> {
    const { data, error } = await this.client
      .from(HABITS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch habits for user "${userId}": ${error.message}`);
    }
    return (data as HabitRow[]).map((row) => this.toDomain(row));
  }

  async save(habit: Habit): Promise<void> {
    const { error } = await this.client.from(HABITS_TABLE).upsert(
      {
        id: habit.id,
        user_id: habit.userId,
        catalog_id: habit.catalogId,
        difficulty: habit.difficulty,
        current_lock_cost: habit.currentLockCost,
        state: habit.state,
        created_at: habit.createdAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save habit "${habit.id}": ${error.message}`);
    }
  }

  private toDomain(row: HabitRow): Habit {
    return Habit.rehydrate({
      id: row.id,
      userId: row.user_id,
      catalogId: row.catalog_id,
      difficulty: row.difficulty,
      currentLockCost: row.current_lock_cost,
      state: row.state,
      createdAt: new Date(row.created_at),
    });
  }
}
