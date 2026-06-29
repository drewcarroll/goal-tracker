import type { WeekKindDTO } from "./GoalDTO";
import type { LogDTO } from "./LogDTO";

/**
 * Data Transfer Objects for the history view — the per-week breakdown of a
 * goal's session with the individual log entries that make up each week, so the
 * UI can show and remove entries retroactively.
 */

export interface HistoryWeekDTO {
  /** 0-based index within the session. */
  index: number;
  startDate: string; // ISO 8601 (inclusive lower bound)
  endDate: string; // ISO 8601 (exclusive upper bound)
  kind: WeekKindDTO;
  /** The per-week target reference (the goal's weekly rate). */
  weeklyTarget: number;
  /** Sum of every entry attributed to this week. */
  total: number;
  /** The individual entries in this week, newest first. */
  entries: LogDTO[];
}

export interface GoalHistoryDTO {
  goalId: string;
  goalName: string;
  unit: string;
  weeklyTarget: number;
  totalWeeks: number;
  currentWeekIndex: number;
  weeks: HistoryWeekDTO[];
}

export interface GetHistoryDTO {
  userId: string;
}

export interface DeleteLogDTO {
  /** Owner of the log — used to enforce that callers only delete their own data. */
  userId: string;
  goalId: string;
  logId: string;
}
