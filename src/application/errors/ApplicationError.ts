/**
 * Application-level errors. Distinct from domain errors: these describe
 * orchestration failures (e.g. "not found") rather than invariant violations.
 */
export abstract class ApplicationError extends Error {
  public abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GoalNotFoundError extends ApplicationError {
  public readonly code = "GOAL_NOT_FOUND";

  constructor(goalId: string) {
    super(`Goal "${goalId}" was not found.`);
  }
}

export class LockBudgetExceededError extends ApplicationError {
  public readonly code = "LOCK_BUDGET_EXCEEDED";

  constructor(locksRequested: number) {
    super(`That plan would spend ${locksRequested} locks, over the 100-lock daily budget.`);
  }
}

export class GoalNotSchedulableError extends ApplicationError {
  public readonly code = "GOAL_NOT_SCHEDULABLE";

  constructor(goalId: string) {
    super(`Goal "${goalId}" is paused and cannot be scheduled.`);
  }
}

export class CheckInNotFoundError extends ApplicationError {
  public readonly code = "CHECK_IN_NOT_FOUND";

  constructor(date: string) {
    super(`No check-in for "${date}" was found.`);
  }
}

export class LockCapacityExceededError extends ApplicationError {
  public readonly code = "LOCK_CAPACITY_EXCEEDED";

  constructor(wouldBe: number, capacity: number) {
    super(
      `That would put your active goals at ${wouldBe}/${capacity} locks. Pause or delete a goal, or lower a weekly target, to make room.`,
    );
  }
}

export class CheckInWindowClosedError extends ApplicationError {
  public readonly code = "CHECKIN_WINDOW_CLOSED";

  constructor(opensAt: string) {
    super(`The nightly check-in isn't open right now — it opens at ${opensAt}.`);
  }
}
