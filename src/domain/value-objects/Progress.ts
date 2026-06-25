import { ValidationError } from "../errors/DomainError";

/**
 * Value Object representing a percentage of progress (0–100).
 * Immutable; protects its own invariants.
 */
export class Progress {
  private constructor(private readonly percent: number) {}

  static fromPercent(percent: number): Progress {
    if (!Number.isFinite(percent)) {
      throw new ValidationError("Progress must be a finite number.");
    }
    if (percent < 0 || percent > 100) {
      throw new ValidationError("Progress must be between 0 and 100.");
    }
    return new Progress(Math.round(percent));
  }

  static zero(): Progress {
    return new Progress(0);
  }

  static complete(): Progress {
    return new Progress(100);
  }

  value(): number {
    return this.percent;
  }

  isComplete(): boolean {
    return this.percent === 100;
  }

  equals(other: Progress): boolean {
    return this.percent === other.percent;
  }
}
