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
