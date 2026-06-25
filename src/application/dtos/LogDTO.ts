import type { GoalDTO } from "./GoalDTO";

/**
 * Data Transfer Objects for logging progress — the contracts crossing the
 * application boundary. Use cases accept and return DTOs, never domain entities.
 */

export interface LogDTO {
  id: string;
  goalId: string;
  /** 0-based index of the goal-session week this value was attributed to. */
  weekIndex: number;
  value: number;
  createdAt: string; // ISO 8601
}

export interface CreateLogDTO {
  /** Owner of the goal — always derived from the session, never client input. */
  userId: string;
  goalId: string;
  /** The amount to log, in the goal's unit. */
  value: number;
  /**
   * Optional explicit week to log against (backfill). When omitted, the entry
   * is attributed to the current week. The goal validates that it is in range.
   */
  weekIndex?: number;
}

export interface LogProgressResultDTO {
  /** The log that was just recorded. */
  log: LogDTO;
  /** The goal with its projection re-derived to include the new log. */
  goal: GoalDTO;
  /** Accumulated total logged for the week this log targeted (in the goal's unit). */
  weekTotal: number;
}
