import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckIn, type GoalMark } from "@/domain/entities/CheckIn";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { LocalDate } from "@/domain/value-objects/LocalDate";

const CHECK_INS_TABLE = "check_ins";

/** Raw shape of one entry in the `marks` jsonb column — key predates the Goal/Habit merge. */
interface MarkRow {
  habitId: string;
  passed: boolean;
}

/** Shape of a row in the `check_ins` table. */
interface CheckInRow {
  id: string;
  user_id: string;
  date: string;
  marks: MarkRow[];
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the CheckInRepository port. Contains
 * zero business logic — just row <-> entity mapping. `marks` is stored as
 * jsonb since it's a small, check-in-owned list with no independent identity.
 * The jsonb key is `habitId` (predates the Goal/Habit merge, kept as-is to
 * avoid a data migration); mapped to the domain's `goalId` here.
 */
export class SupabaseCheckInRepository implements CheckInRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<CheckIn | null> {
    const { data, error } = await this.client
      .from(CHECK_INS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("date", date.toString())
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch check-in for user "${userId}" on "${date.toString()}": ${error.message}`,
      );
    }
    return data ? this.toDomain(data as CheckInRow) : null;
  }

  async findByUserId(userId: string): Promise<CheckIn[]> {
    const { data, error } = await this.client
      .from(CHECK_INS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch check-ins for user "${userId}": ${error.message}`);
    }
    return (data as CheckInRow[]).map((row) => this.toDomain(row));
  }

  async save(checkIn: CheckIn): Promise<void> {
    const { error } = await this.client.from(CHECK_INS_TABLE).upsert(
      {
        id: checkIn.id,
        user_id: checkIn.userId,
        date: checkIn.date.toString(),
        marks: checkIn.marks.map((mark): MarkRow => ({ habitId: mark.goalId, passed: mark.passed })),
        created_at: checkIn.createdAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save check-in "${checkIn.id}": ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(CHECK_INS_TABLE).delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete check-in "${id}": ${error.message}`);
    }
  }

  private toDomain(row: CheckInRow): CheckIn {
    const marks: GoalMark[] = row.marks.map((mark) => ({
      goalId: mark.habitId,
      passed: mark.passed,
    }));
    return CheckIn.rehydrate({
      id: row.id,
      userId: row.user_id,
      date: LocalDate.create(row.date),
      marks,
      createdAt: new Date(row.created_at),
    });
  }
}
