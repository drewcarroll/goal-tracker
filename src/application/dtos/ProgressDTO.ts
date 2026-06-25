/**
 * Data Transfer Objects for the progress-data aggregation — the chart-ready
 * contract crossing the application boundary. Returned by GetProgressDataUseCase.
 */

import type { WeekKindDTO } from "./GoalDTO";

/** One week of a goal's progress chart, oldest first. */
export interface ProgressWeekPointDTO {
  /** 0-based index within the session. */
  index: number;
  startDate: string; // ISO 8601 (inclusive lower bound)
  endDate: string; // ISO 8601 (exclusive upper bound)
  kind: WeekKindDTO;
  /** Total logged against this week (in the goal's unit; 0 if nothing logged). */
  weeklyActual: number;
  /** The per-week target reference value (the flat target line). */
  weeklyTarget: number;
  /** The target line as a cumulative series — reaches targetValue at the end. */
  cumulativeTarget: number;
  /**
   * Running sum of actual logged values through this week. `null` for weeks
   * that have not started yet, so the actual line stops at the current week.
   */
  cumulativeActual: number | null;
  /** Running sum of projected per-week contributions through this week. */
  cumulativeProjected: number;
}

/** Chart-ready progress data for a single goal. */
export interface ProgressChartDTO {
  goalId: string;
  goalName: string;
  unit: string;
  /** The goal's overall target value. */
  targetValue: number;
  /** targetValue split evenly across the session's weeks (per-week rate). */
  weeklyTarget: number;
  totalWeeks: number;
  /** 0-based index of the week containing "now", clamped to the session. */
  currentWeekIndex: number;
  /** Projected end-of-session total (the projected series' end value). */
  projectedTotal: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  /** Per-week chart points across the whole session, oldest first. */
  weeks: ProgressWeekPointDTO[];
}

export interface GetProgressDataDTO {
  /** Owner of the goals — always derived from the session, never client input. */
  userId: string;
}
