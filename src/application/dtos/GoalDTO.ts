/**
 * Data Transfer Objects — the contracts crossing the application boundary.
 * Use cases accept and return DTOs, never domain entities.
 */

/** Whether a week has fully elapsed, is in progress, or is yet to come. */
export type WeekKindDTO = "past" | "current" | "future";

/** One week of a goal's session — used to target and label log entries. */
export interface GoalWeekDTO {
  /** 0-based index within the session. */
  index: number;
  startDate: string; // ISO 8601 (inclusive lower bound)
  endDate: string; // ISO 8601 (exclusive upper bound)
  kind: WeekKindDTO;
  /** Amount already logged against this week (in the goal's unit). */
  actual: number;
}

export interface GoalDTO {
  id: string;
  userId: string;
  name: string;
  targetValue: number;
  unit: string;
  /** targetValue split evenly across the session's weeks (per-week rate). */
  weeklyTarget: number;
  /** Number of weekly buckets the session spans (always >= 1). */
  totalWeeks: number;
  /** 0-based index of the week containing "now", clamped to the session. */
  currentWeekIndex: number;
  /** Per-week breakdown across the session, oldest first. */
  weeks: GoalWeekDTO[];
  /**
   * Projected end-of-session total from the projection engine: past actuals
   * plus on-target current/future weeks, with over-delivery kept as bonus.
   */
  projectedTotal: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateGoalDTO {
  /** Owner of the goal — always derived from the session, never client input. */
  userId: string;
  name: string;
  targetValue: number;
  unit: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

export interface UpdateGoalDTO {
  /** Owner of the goal — used to enforce that callers only mutate their own data. */
  userId: string;
  goalId: string;
  name: string;
  targetValue: number;
  unit: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}
