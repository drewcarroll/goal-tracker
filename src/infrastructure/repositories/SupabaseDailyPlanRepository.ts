import type { SupabaseClient } from "@supabase/supabase-js";
import { DailyPlan } from "@/domain/entities/DailyPlan";
import { DailyPlanRepository } from "@/domain/repositories/DailyPlanRepository";
import { LocalDate } from "@/domain/value-objects/LocalDate";

const DAILY_PLANS_TABLE = "daily_plans";

/**
 * Shape of a row in the `daily_plans` table. The `habit_ids` column name
 * predates the Goal/Habit merge — kept as-is to avoid a data migration; maps
 * to the domain's `goalIds` here at the repository boundary.
 */
interface DailyPlanRow {
  id: string;
  user_id: string;
  date: string;
  habit_ids: string[];
  locks_spent: number;
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the DailyPlanRepository port.
 * Contains zero business logic — just row <-> entity mapping.
 */
export class SupabaseDailyPlanRepository implements DailyPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<DailyPlan | null> {
    const { data, error } = await this.client
      .from(DAILY_PLANS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("date", date.toString())
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch daily plan for user "${userId}" on "${date.toString()}": ${error.message}`,
      );
    }
    return data ? this.toDomain(data as DailyPlanRow) : null;
  }

  async save(plan: DailyPlan): Promise<void> {
    const { error } = await this.client.from(DAILY_PLANS_TABLE).upsert(
      {
        id: plan.id,
        user_id: plan.userId,
        date: plan.date.toString(),
        habit_ids: [...plan.goalIds],
        locks_spent: plan.locksSpent,
        created_at: plan.createdAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save daily plan "${plan.id}": ${error.message}`);
    }
  }

  private toDomain(row: DailyPlanRow): DailyPlan {
    return DailyPlan.rehydrate({
      id: row.id,
      userId: row.user_id,
      date: LocalDate.create(row.date),
      goalIds: row.habit_ids,
      locksSpent: row.locks_spent,
      createdAt: new Date(row.created_at),
    });
  }
}
