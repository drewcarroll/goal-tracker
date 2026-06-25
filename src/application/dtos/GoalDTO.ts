/**
 * Data Transfer Objects — the contracts crossing the application boundary.
 * Use cases accept and return DTOs, never domain entities.
 */

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
