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

export class LogNotFoundError extends ApplicationError {
  public readonly code = "LOG_NOT_FOUND";

  constructor(logId: string) {
    super(`Log entry "${logId}" was not found.`);
  }
}

export class HabitNotFoundError extends ApplicationError {
  public readonly code = "HABIT_NOT_FOUND";

  constructor(habitId: string) {
    super(`Habit "${habitId}" was not found.`);
  }
}

export class LockBudgetExceededError extends ApplicationError {
  public readonly code = "LOCK_BUDGET_EXCEEDED";

  constructor(locksRequested: number) {
    super(`That plan would spend ${locksRequested} locks, over the 100-lock daily budget.`);
  }
}

export class HabitNotSchedulableError extends ApplicationError {
  public readonly code = "HABIT_NOT_SCHEDULABLE";

  constructor(habitId: string) {
    super(`Habit "${habitId}" is paused and cannot be scheduled.`);
  }
}

export class CheckInNotFoundError extends ApplicationError {
  public readonly code = "CHECK_IN_NOT_FOUND";

  constructor(date: string) {
    super(`No check-in for "${date}" was found.`);
  }
}
