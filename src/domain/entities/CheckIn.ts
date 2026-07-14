import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

export type DayResult = "PASS" | "FAIL";

export interface GoalMark {
  goalId: string;
  passed: boolean;
}

export interface CheckInProps {
  id: string;
  userId: string;
  /** The user-local day this check-in reports on. */
  date: LocalDate;
  /** One mark per goal that was scheduled in that day's plan. */
  marks: readonly GoalMark[];
  /**
   * Whether this check-in was originally submitted within the nightly
   * check-in window (docs/progression.md §3). Stamped once at submission and
   * preserved by edits — backfilled past days are always false, so they never
   * earn rank points. Frozen even if the user later changes their window.
   */
  submittedOnTime: boolean;
  createdAt: Date;
}

/**
 * CheckIn entity — the end-of-day honor-system report against a DailyPlan:
 * one pass/fail mark per scheduled goal. Has identity; immutable once
 * submitted (see EditCheckInUseCase for corrections, which replace this
 * check-in's marks rather than mutating it directly). Enforces its own
 * invariants and knows nothing about persistence or transport.
 *
 * dayResult is derived, never stored: PASS only if every marked goal passed;
 * a single miss makes the whole day FAIL. Per the non-negotiable design rules,
 * this is neutral bookkeeping for the lock-cost trajectory — never shame UI,
 * never a streak.
 */
export class CheckIn {
  private constructor(private readonly props: CheckInProps) {}

  static create(params: {
    id: string;
    userId: string;
    date: LocalDate;
    marks: readonly GoalMark[];
    submittedOnTime: boolean;
    now?: Date;
  }): CheckIn {
    CheckIn.assertValidMarks(params.marks);
    return new CheckIn({
      id: params.id,
      userId: params.userId,
      date: params.date,
      marks: [...params.marks],
      submittedOnTime: params.submittedOnTime,
      createdAt: params.now ?? new Date(),
    });
  }

  static rehydrate(props: CheckInProps): CheckIn {
    CheckIn.assertValidMarks(props.marks);
    return new CheckIn(props);
  }

  private static assertValidMarks(marks: readonly GoalMark[]): void {
    if (marks.length === 0) {
      throw new ValidationError("A check-in must mark at least one goal.");
    }
    const goalIds = marks.map((mark) => mark.goalId);
    if (new Set(goalIds).size !== goalIds.length) {
      throw new ValidationError("A check-in cannot mark the same goal twice.");
    }
  }

  /**
   * PASS only if every marked goal passed; any miss makes the day FAIL.
   * As of Phase 6 this is display bookkeeping (the /progress calendar) only —
   * lock costs move per-goal via each goal's own mark, and rank points come
   * from submittedOnTime, not from passing.
   */
  get dayResult(): DayResult {
    return this.props.marks.every((mark) => mark.passed) ? "PASS" : "FAIL";
  }

  /** Whether a specific goal passed on this day. Undefined if it wasn't marked. */
  markFor(goalId: string): boolean | undefined {
    return this.props.marks.find((mark) => mark.goalId === goalId)?.passed;
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
  get marks(): readonly GoalMark[] {
    return this.props.marks;
  }
  get submittedOnTime(): boolean {
    return this.props.submittedOnTime;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
