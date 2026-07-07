import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

const MAX_LOCKS = 100;

export interface DailyPlanProps {
  id: string;
  userId: string;
  /** The user-local day this plan is for. */
  date: LocalDate;
  /** Habit ids scheduled for this day. */
  habitIds: readonly string[];
  /** Sum of the scheduled habits' lock costs at planning time. Invariant: <= 100. */
  locksSpent: number;
  createdAt: Date;
}

/**
 * DailyPlan entity — the night-before commitment of which habits to attempt
 * tomorrow, within a 100-lock daily budget. Has identity; is fixed once
 * created (planning happens once, the night before — no auto-recurrence, no
 * same-day edits modeled here). Enforces its own invariants and knows nothing
 * about persistence or transport.
 */
export class DailyPlan {
  private constructor(private props: DailyPlanProps) {}

  static create(params: {
    id: string;
    userId: string;
    date: LocalDate;
    habitIds: readonly string[];
    locksSpent: number;
    now?: Date;
  }): DailyPlan {
    DailyPlan.assertValidHabitIds(params.habitIds);
    DailyPlan.assertValidLocksSpent(params.locksSpent);
    return new DailyPlan({
      id: params.id,
      userId: params.userId,
      date: params.date,
      habitIds: [...params.habitIds],
      locksSpent: params.locksSpent,
      createdAt: params.now ?? new Date(),
    });
  }

  static rehydrate(props: DailyPlanProps): DailyPlan {
    DailyPlan.assertValidHabitIds(props.habitIds);
    DailyPlan.assertValidLocksSpent(props.locksSpent);
    return new DailyPlan(props);
  }

  private static assertValidHabitIds(habitIds: readonly string[]): void {
    if (habitIds.length === 0) {
      throw new ValidationError("A daily plan must schedule at least one habit.");
    }
    if (new Set(habitIds).size !== habitIds.length) {
      throw new ValidationError("A daily plan cannot schedule the same habit twice.");
    }
  }

  private static assertValidLocksSpent(locksSpent: number): void {
    if (!Number.isFinite(locksSpent) || locksSpent < 0) {
      throw new ValidationError("Locks spent must be a non-negative number.");
    }
    if (locksSpent > MAX_LOCKS) {
      throw new ValidationError(`Locks spent cannot exceed the daily budget of ${MAX_LOCKS}.`);
    }
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get date(): LocalDate {
    return this.props.date;
  }
  get habitIds(): readonly string[] {
    return this.props.habitIds;
  }
  get locksSpent(): number {
    return this.props.locksSpent;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
