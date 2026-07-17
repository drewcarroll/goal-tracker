import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

export interface DailyPlanProps {
  id: string;
  userId: string;
  /** The user-local day this plan is for. */
  date: LocalDate;
  /** Goal ids scheduled for this day. */
  goalIds: readonly string[];
  /** Sum of the scheduled goals' lock costs at planning time. Display only, no daily cap. */
  locksSpent: number;
  createdAt: Date;
}

/**
 * DailyPlan entity — the night-before commitment of which goals to attempt
 * tomorrow. Has identity; is fixed once created (planning happens once, the
 * night before — no auto-recurrence, no same-day edits modeled here).
 * Enforces its own invariants and knows nothing about persistence or
 * transport. No daily key cap (removed 2026-07-18, user decision: "daily
 * should be uncapped") — the weekly budget lives entirely in the UI as an
 * informational ceiling, not a domain invariant.
 */
export class DailyPlan {
  private constructor(private props: DailyPlanProps) {}

  static create(params: {
    id: string;
    userId: string;
    date: LocalDate;
    goalIds: readonly string[];
    locksSpent: number;
    now?: Date;
  }): DailyPlan {
    DailyPlan.assertValidGoalIds(params.goalIds);
    DailyPlan.assertValidLocksSpent(params.locksSpent);
    return new DailyPlan({
      id: params.id,
      userId: params.userId,
      date: params.date,
      goalIds: [...params.goalIds],
      locksSpent: params.locksSpent,
      createdAt: params.now ?? new Date(),
    });
  }

  static rehydrate(props: DailyPlanProps): DailyPlan {
    DailyPlan.assertValidGoalIds(props.goalIds);
    DailyPlan.assertValidLocksSpent(props.locksSpent);
    return new DailyPlan(props);
  }

  private static assertValidGoalIds(goalIds: readonly string[]): void {
    if (goalIds.length === 0) {
      throw new ValidationError("A daily plan must schedule at least one goal.");
    }
    if (new Set(goalIds).size !== goalIds.length) {
      throw new ValidationError("A daily plan cannot schedule the same goal twice.");
    }
  }

  private static assertValidLocksSpent(locksSpent: number): void {
    if (!Number.isFinite(locksSpent) || locksSpent < 0) {
      throw new ValidationError("Locks spent must be a non-negative number.");
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
  get goalIds(): readonly string[] {
    return this.props.goalIds;
  }
  get locksSpent(): number {
    return this.props.locksSpent;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
