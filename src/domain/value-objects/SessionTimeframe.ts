import { ValidationError } from "../errors/DomainError";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Where `today` falls relative to a session's window. */
export type SessionPhase = "before" | "active" | "after";

/** The week-derivation result for a given moment. */
export interface WeekDerivation {
  /** Total number of weekly buckets the timeframe splits into (>= 1). */
  totalWeeks: number;
  /** 0-based index of the week `today` falls in, clamped to [0, totalWeeks - 1]. */
  currentWeekIndex: number;
  /** Weekly buckets still open, counting the current one (0 once the session ends). */
  remainingWeeks: number;
  /** Whether `today` is before, within, or after the session window. */
  phase: SessionPhase;
}

/**
 * Value Object for a goal session's [start, end) window.
 *
 * Splits the timeframe into calendar weeks that run Monday 00:00 → the
 * following Monday 00:00 (UTC), i.e. Monday through Sunday inclusive. Week
 * boundaries are anchored to the Monday of the week containing `start`, so the
 * first week begins on `start` (and is short when the session starts mid-week)
 * and the final week ends at `end`; every week in between is a full Mon–Sun
 * week. The window is half-open — `end` is the exclusive upper boundary.
 *
 * Boundaries are computed from absolute UTC instants, so they are unaffected by
 * DST or local-timezone offsets. Immutable; equality by value.
 */
export class SessionTimeframe {
  /** Monday 00:00 UTC of the week containing `start`; the week-bucket origin. */
  private readonly weekAnchor: number;

  private constructor(
    private readonly start: Date,
    private readonly end: Date,
  ) {
    this.weekAnchor = SessionTimeframe.mondayOf(start.getTime());
  }

  static create(params: { start: Date; end: Date }): SessionTimeframe {
    const { start, end } = params;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new ValidationError("Session start and end must be valid dates.");
    }
    if (end.getTime() <= start.getTime()) {
      throw new ValidationError("Session end date must be after the start date.");
    }
    return new SessionTimeframe(new Date(start.getTime()), new Date(end.getTime()));
  }

  /** Inclusive lower bound of the window. Returns a defensive copy. */
  startDate(): Date {
    return new Date(this.start.getTime());
  }

  /** Exclusive upper bound of the window. Returns a defensive copy. */
  endDate(): Date {
    return new Date(this.end.getTime());
  }

  /** Total number of Mon–Sun weeks the window touches (always >= 1). */
  totalWeeks(): number {
    return Math.ceil((this.end.getTime() - this.weekAnchor) / WEEK_MS);
  }

  /** Where `date` sits relative to the [start, end) window. */
  phaseOn(date: Date): SessionPhase {
    const t = date.getTime();
    if (t < this.start.getTime()) return "before";
    if (t >= this.end.getTime()) return "after";
    return "active";
  }

  /**
   * 0-based index of the week `date` falls in. Before the session it is 0;
   * after the session it is the final week index (totalWeeks - 1).
   */
  weekIndexOn(date: Date): number {
    const raw = Math.floor((date.getTime() - this.weekAnchor) / WEEK_MS);
    return this.clampWeekIndex(raw);
  }

  /**
   * The [start, end) bounds of the 0-based Mon–Sun week bucket at `index`,
   * clipped to the session window: week 0 begins at the session start (short
   * when it starts mid-week) and the final week ends at the session end. Throws
   * if `index` is outside [0, totalWeeks - 1].
   */
  weekRange(index: number): { start: Date; end: Date } {
    const lastIndex = this.totalWeeks() - 1;
    if (!Number.isInteger(index) || index < 0 || index > lastIndex) {
      throw new ValidationError(`Week index must be between 0 and ${lastIndex}.`);
    }
    const bucketStart = this.weekAnchor + index * WEEK_MS;
    const start = Math.max(bucketStart, this.start.getTime());
    const end = Math.min(bucketStart + WEEK_MS, this.end.getTime());
    return { start: new Date(start), end: new Date(end) };
  }

  /**
   * Weekly buckets still open on `date`, including the current one. Equals
   * totalWeeks before the session starts and 0 once it has ended.
   */
  remainingWeeksOn(date: Date): number {
    switch (this.phaseOn(date)) {
      case "before":
        return this.totalWeeks();
      case "after":
        return 0;
      case "active":
        return this.totalWeeks() - this.weekIndexOn(date);
    }
  }

  /** All three derivations plus the phase, computed in one pass. */
  derive(date: Date): WeekDerivation {
    return {
      totalWeeks: this.totalWeeks(),
      currentWeekIndex: this.weekIndexOn(date),
      remainingWeeks: this.remainingWeeksOn(date),
      phase: this.phaseOn(date),
    };
  }

  equals(other: SessionTimeframe): boolean {
    return (
      this.start.getTime() === other.start.getTime() && this.end.getTime() === other.end.getTime()
    );
  }

  private clampWeekIndex(index: number): number {
    const lastIndex = this.totalWeeks() - 1;
    if (index < 0) return 0;
    if (index > lastIndex) return lastIndex;
    return index;
  }

  /** Monday 00:00 UTC of the week containing the instant `t` (ms since epoch). */
  private static mondayOf(t: number): number {
    const dayOfWeek = new Date(t).getUTCDay(); // 0 = Sunday … 6 = Saturday
    const daysSinceMonday = (dayOfWeek + 6) % 7; // Monday = 0 … Sunday = 6
    const midnight = Math.floor(t / DAY_MS) * DAY_MS;
    return midnight - daysSinceMonday * DAY_MS;
  }
}
