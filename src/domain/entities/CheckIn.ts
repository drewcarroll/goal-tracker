import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

export type DayResult = "PASS" | "FAIL";

export interface HabitMark {
  habitId: string;
  passed: boolean;
}

export interface CheckInProps {
  id: string;
  userId: string;
  /** The user-local day this check-in reports on. */
  date: LocalDate;
  /** One mark per habit that was scheduled in that day's plan. */
  marks: readonly HabitMark[];
  createdAt: Date;
}

/**
 * CheckIn entity — the end-of-day honor-system report against a DailyPlan:
 * one pass/fail mark per scheduled habit. Has identity; immutable once
 * submitted (see `EditPastCheckInUseCase` for corrections, which create a new
 * CheckIn rather than mutating this one). Enforces its own invariants and
 * knows nothing about persistence or transport.
 *
 * dayResult is derived, never stored: PASS only if every marked habit passed;
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
    marks: readonly HabitMark[];
    now?: Date;
  }): CheckIn {
    CheckIn.assertValidMarks(params.marks);
    return new CheckIn({
      id: params.id,
      userId: params.userId,
      date: params.date,
      marks: [...params.marks],
      createdAt: params.now ?? new Date(),
    });
  }

  static rehydrate(props: CheckInProps): CheckIn {
    CheckIn.assertValidMarks(props.marks);
    return new CheckIn(props);
  }

  private static assertValidMarks(marks: readonly HabitMark[]): void {
    if (marks.length === 0) {
      throw new ValidationError("A check-in must mark at least one habit.");
    }
    const habitIds = marks.map((mark) => mark.habitId);
    if (new Set(habitIds).size !== habitIds.length) {
      throw new ValidationError("A check-in cannot mark the same habit twice.");
    }
  }

  /** PASS only if every marked habit passed; any miss makes the day FAIL. */
  get dayResult(): DayResult {
    return this.props.marks.every((mark) => mark.passed) ? "PASS" : "FAIL";
  }

  /** Whether a specific habit passed on this day. Undefined if it wasn't marked. */
  markFor(habitId: string): boolean | undefined {
    return this.props.marks.find((mark) => mark.habitId === habitId)?.passed;
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
  get marks(): readonly HabitMark[] {
    return this.props.marks;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
