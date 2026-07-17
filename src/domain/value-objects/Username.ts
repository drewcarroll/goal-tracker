import { ValidationError } from "../errors/DomainError";

const MAX_LENGTH = 60;

/**
 * A normalized username — trimmed and lowercased, matching the existing
 * login flow's own normalization (see interfaces/web/http/session.ts's
 * `normalizeUsername`, which this deliberately mirrors rather than imports,
 * since domain can't depend on interfaces/). Intentionally does NOT enforce
 * a charset: this app's login has never restricted what a username can
 * contain, and rejecting characters here that login already accepts would
 * silently make some already-logged-in users unfindable by friends without
 * ever telling them why.
 */
export class Username {
  private constructor(private readonly value: string) {}

  static create(raw: string): Username {
    const normalized = raw.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError("Username must not be empty.");
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ValidationError(`Username must be ${MAX_LENGTH} characters or fewer.`);
    }
    return new Username(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
