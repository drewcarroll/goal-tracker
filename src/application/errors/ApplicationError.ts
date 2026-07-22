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
    super(`That schedule would spend ${locksRequested} keys, over the 100-key daily budget.`);
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

export class CheckInWindowClosedError extends ApplicationError {
  public readonly code = "CHECKIN_WINDOW_CLOSED";

  constructor(opensAt: string) {
    super(`The nightly check-in isn't open right now — it opens at ${opensAt}.`);
  }
}

export class UserNotFoundError extends ApplicationError {
  public readonly code = "USER_NOT_FOUND";

  constructor(username: string) {
    super(`No user named "${username}" was found.`);
  }
}

export class FriendRequestAlreadyExistsError extends ApplicationError {
  public readonly code = "FRIEND_REQUEST_ALREADY_EXISTS";

  constructor() {
    super("There's already a pending or accepted friendship with this person.");
  }
}

export class FriendshipNotFoundError extends ApplicationError {
  public readonly code = "FRIENDSHIP_NOT_FOUND";

  constructor() {
    super("That friend request was not found.");
  }
}

export class NotFriendsError extends ApplicationError {
  public readonly code = "NOT_FRIENDS";

  constructor() {
    super("You are not friends with this user.");
  }
}

export class MaintenanceModeError extends ApplicationError {
  public readonly code = "MAINTENANCE_MODE";

  constructor() {
    super("The app is currently experiencing difficulties. Please come back later.");
  }
}

export class BattlePassDayNotClaimableError extends ApplicationError {
  public readonly code = "BATTLE_PASS_DAY_NOT_CLAIMABLE";

  constructor(date: string) {
    super(`"${date}" isn't claimable — it's already claimed, truncated, or hasn't happened yet.`);
  }
}

export class InsufficientCoinsError extends ApplicationError {
  public readonly code = "INSUFFICIENT_COINS";

  constructor() {
    super("Not enough coins for that.");
  }
}

export class TooManyPinnedTrinketsError extends ApplicationError {
  public readonly code = "TOO_MANY_PINNED_TRINKETS";

  constructor(max: number) {
    super(`You can only display up to ${max} trinkets at once.`);
  }
}
