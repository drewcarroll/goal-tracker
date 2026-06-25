/**
 * Base class for all domain-level errors.
 * The domain layer throws these; outer layers translate them
 * into HTTP statuses, CLI exit codes, etc.
 */
export abstract class DomainError extends Error {
  public abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore prototype chain for instanceof checks under transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  public readonly code = "VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
  }
}

export class GoalAlreadyCompletedError extends DomainError {
  public readonly code = "GOAL_ALREADY_COMPLETED";

  constructor(goalId: string) {
    super(`Goal "${goalId}" is already completed.`);
  }
}
