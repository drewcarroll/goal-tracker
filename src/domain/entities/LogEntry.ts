import { ValidationError } from "../errors/DomainError";
import type { WeeklyLogEntry } from "../services/ProjectionService";

export interface LogEntryProps {
  id: string;
  goalId: string;
  userId: string;
  /** 0-based index of the goal-session week this value is attributed to. */
  weekIndex: number;
  /** The amount logged, in the goal's unit. Always > 0. */
  value: number;
  createdAt: Date;
}

/**
 * LogEntry entity — a single value logged against a goal for one week of its
 * session. Has identity (id) and is append-only: many logs may target the same
 * (goal, week) and accumulate toward the target. Enforces its own invariants
 * and knows nothing about persistence or transport.
 *
 * LogEntries are created by the Goal aggregate root (`Goal.logProgress`), which
 * owns the timeframe needed to derive the correct week. The projection engine
 * consumes the lighter {@link WeeklyLogEntry} shape, produced via `toWeekly`.
 */
export class LogEntry {
  private constructor(private readonly props: LogEntryProps) {}

  /** Create a brand new log entry, validating every invariant. */
  static create(params: {
    id: string;
    goalId: string;
    userId: string;
    weekIndex: number;
    value: number;
    now?: Date;
  }): LogEntry {
    LogEntry.assertValidWeekIndex(params.weekIndex);
    LogEntry.assertValidValue(params.value);
    return new LogEntry({
      id: params.id,
      goalId: params.goalId,
      userId: params.userId,
      weekIndex: params.weekIndex,
      value: params.value,
      createdAt: params.now ?? new Date(),
    });
  }

  /** Reconstitute an existing log entry (e.g. from a repository). */
  static rehydrate(props: LogEntryProps): LogEntry {
    LogEntry.assertValidWeekIndex(props.weekIndex);
    LogEntry.assertValidValue(props.value);
    return new LogEntry(props);
  }

  private static assertValidWeekIndex(weekIndex: number): void {
    if (!Number.isInteger(weekIndex) || weekIndex < 0) {
      throw new ValidationError("Log week index must be a non-negative integer.");
    }
  }

  private static assertValidValue(value: number): void {
    if (!Number.isFinite(value)) {
      throw new ValidationError("Logged amount must be a number.");
    }
    if (value <= 0) {
      throw new ValidationError("Logged amount must be greater than zero.");
    }
  }

  /** The projection-facing view of this log (week + value only). */
  toWeekly(): WeeklyLogEntry {
    return { weekIndex: this.props.weekIndex, value: this.props.value };
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get goalId(): string {
    return this.props.goalId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get weekIndex(): number {
    return this.props.weekIndex;
  }
  get value(): number {
    return this.props.value;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
