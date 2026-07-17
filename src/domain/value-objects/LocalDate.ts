import { ValidationError } from "../errors/DomainError";

const DATE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Value Object for a user-local calendar day, e.g. "2026-07-06".
 *
 * Goal planning/check-ins/journaling are anchored to the user's local day,
 * never server UTC — this type carries that day as an opaque, unambiguous
 * string rather than a `Date` (which always implies an instant + timezone,
 * inviting off-by-one-day bugs). Immutable; equality by value.
 */
export class LocalDate {
  private constructor(private readonly value: string) {}

  /** The current calendar day in `timezone` (an IANA name, e.g. "America/Denver"). */
  static todayInTimezone(now: Date, timezone: string): LocalDate {
    let formatted: string;
    try {
      formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      throw new ValidationError(`"${timezone}" is not a recognized timezone.`);
    }
    return LocalDate.create(formatted);
  }

  static create(value: string): LocalDate {
    const match = DATE_FORMAT.exec(value);
    if (!match) {
      throw new ValidationError(`Date must be in YYYY-MM-DD format, got "${value}".`);
    }
    const [, year, month, day] = match;
    const asDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const roundTrips =
      asDate.getUTCFullYear() === Number(year) &&
      asDate.getUTCMonth() === Number(month) - 1 &&
      asDate.getUTCDate() === Number(day);
    if (!roundTrips) {
      throw new ValidationError(`"${value}" is not a real calendar date.`);
    }
    return new LocalDate(value);
  }

  /** A new LocalDate offset by `days` (negative to go backward). */
  addDays(days: number): LocalDate {
    const match = DATE_FORMAT.exec(this.value)!;
    const [, year, month, day] = match.map(Number);
    const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
    const formatted = [
      shifted.getUTCFullYear(),
      String(shifted.getUTCMonth() + 1).padStart(2, "0"),
      String(shifted.getUTCDate()).padStart(2, "0"),
    ].join("-");
    return LocalDate.create(formatted);
  }

  /** Position within the Mon-Sun week: Monday = 0 … Sunday = 6. */
  dayOfWeekIndex(): number {
    const dayOfWeek = new Date(`${this.value}T00:00:00Z`).getUTCDay(); // 0 = Sun … 6 = Sat
    return (dayOfWeek + 6) % 7;
  }

  /** Monday of the Mon-Sun week this date falls in (this date if it's already Monday). */
  startOfWeek(): LocalDate {
    return this.addDays(-this.dayOfWeekIndex());
  }

  /** Calendar days from this date to `other` (negative if `other` is earlier). */
  daysUntil(other: LocalDate): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const start = new Date(`${this.value}T00:00:00Z`).getTime();
    const end = new Date(`${other.value}T00:00:00Z`).getTime();
    return Math.round((end - start) / msPerDay);
  }

  toString(): string {
    return this.value;
  }

  equals(other: LocalDate): boolean {
    return this.value === other.value;
  }

  isBefore(other: LocalDate): boolean {
    return this.value < other.value;
  }

  isAfter(other: LocalDate): boolean {
    return this.value > other.value;
  }
}
