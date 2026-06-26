import type { SupabaseClient } from "@supabase/supabase-js";
import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import type { WeeklyLogEntry } from "@/domain/services/ProjectionService";
import { SessionTimeframe } from "@/domain/value-objects/SessionTimeframe";

const GOALS_TABLE = "goals";
const SESSIONS_TABLE = "goal_sessions";

/** Shape of a row in the `goals` table (DB concern, stays in infrastructure). */
interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_value: number | string;
  unit: string;
  created_at: string;
  updated_at: string;
  goal_sessions: SessionRow[] | SessionRow | null;
  logs: LogRow[] | null;
}

/** Shape of a row in the `goal_sessions` table. */
interface SessionRow {
  id: string;
  goal_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
}

/** Shape of a row in the `logs` table (only the fields the projection needs). */
interface LogRow {
  week_index: number;
  value: number | string;
}

const GOAL_SELECT =
  "*, goal_sessions(id, goal_id, user_id, start_date, end_date), logs(week_index, value)";

/**
 * Supabase/PostgreSQL implementation of the GoalRepository port.
 * A Goal aggregate spans two tables — `goals` and its one-to-one
 * `goal_sessions` row — which this adapter maps to/from a domain entity.
 * Contains zero business logic.
 */
export class SupabaseGoalRepository implements GoalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Goal | null> {
    const { data, error } = await this.client
      .from(GOALS_TABLE)
      .select(GOAL_SELECT)
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
      .from(GOALS_TABLE)
      .select(GOAL_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals for user "${userId}": ${error.message}`);
    }
    return (data as GoalRow[]).map((row) => this.toDomain(row));
  }

  async save(goal: Goal): Promise<void> {
    const { error: goalError } = await this.client.from(GOALS_TABLE).upsert(
      {
        id: goal.id,
        user_id: goal.userId,
        name: goal.name,
        // `target_value` stores the per-week rate (the source of truth); the
        // whole-session total is derived from it and never persisted.
        target_value: goal.weeklyTarget(),
        unit: goal.unit,
        updated_at: goal.updatedAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (goalError) {
      throw new Error(`Failed to save goal "${goal.id}": ${goalError.message}`);
    }

    const { error: sessionError } = await this.client.from(SESSIONS_TABLE).upsert(
      {
        id: goal.sessionId,
        goal_id: goal.id,
        user_id: goal.userId,
        start_date: goal.timeframe.startDate().toISOString(),
        end_date: goal.timeframe.endDate().toISOString(),
        updated_at: goal.updatedAt.toISOString(),
      },
      { onConflict: "goal_id" },
    );
    if (sessionError) {
      throw new Error(`Failed to save session for goal "${goal.id}": ${sessionError.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    // `goal_sessions` rows cascade-delete with their goal (FK onDelete: Cascade).
    const { error } = await this.client.from(GOALS_TABLE).delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete goal "${id}": ${error.message}`);
    }
  }

  // --- Mapping helpers ---

  private toDomain(row: GoalRow): Goal {
    const session = this.extractSession(row);
    return Goal.rehydrate({
      id: row.id,
      userId: row.user_id,
      sessionId: session.id,
      name: row.name,
      weeklyTarget: Number(row.target_value),
      unit: row.unit,
      timeframe: SessionTimeframe.create({
        start: new Date(session.start_date),
        end: new Date(session.end_date),
      }),
      logs: this.mapLogs(row.logs),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapLogs(logs: LogRow[] | null): WeeklyLogEntry[] {
    return (logs ?? []).map((log) => ({
      weekIndex: log.week_index,
      value: Number(log.value),
    }));
  }

  /** Supabase embeds a to-one relation as either an object or a single-item array. */
  private extractSession(row: GoalRow): SessionRow {
    const session = Array.isArray(row.goal_sessions) ? row.goal_sessions[0] : row.goal_sessions;
    if (!session) {
      throw new Error(`Goal "${row.id}" is missing its session.`);
    }
    return session;
  }
}
