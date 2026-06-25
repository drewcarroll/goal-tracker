import { ValidationError } from "../errors/DomainError";

/**
 * Value Object representing the lifecycle status of a Goal.
 * Immutable; equality is by value.
 */
export type GoalStatusValue = "active" | "completed" | "archived";

const VALID_STATUSES: ReadonlyArray<GoalStatusValue> = ["active", "completed", "archived"];

export class GoalStatus {
  private constructor(private readonly value: GoalStatusValue) {}

  static active(): GoalStatus {
    return new GoalStatus("active");
  }

  static completed(): GoalStatus {
    return new GoalStatus("completed");
  }

  static archived(): GoalStatus {
    return new GoalStatus("archived");
  }

  static fromString(value: string): GoalStatus {
    if (!VALID_STATUSES.includes(value as GoalStatusValue)) {
      throw new ValidationError(
        `Invalid goal status "${value}". Must be one of: ${VALID_STATUSES.join(", ")}.`,
      );
    }
    return new GoalStatus(value as GoalStatusValue);
  }

  toString(): GoalStatusValue {
    return this.value;
  }

  isActive(): boolean {
    return this.value === "active";
  }

  isCompleted(): boolean {
    return this.value === "completed";
  }

  equals(other: GoalStatus): boolean {
    return this.value === other.value;
  }
}
