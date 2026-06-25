import { ValidationError } from "../errors/DomainError";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
 * Splits the timeframe into fixed 7-day buckets measured from `start`:
 * week 0 is [start, start+7d), week 1 is [start+7d, start+14d), and so on.
 * The window is half-open — `end` is the exclusive upper boundary — so a
 * duration that is an exact multiple of 7 days yields exactly that many weeks.
 *
 * Buckets are measured in absolute elapsed time (UTC instants), so they are
 * unaffected by DST or local-timezone offsets. Immutable; equality by value.
 */
export class SessionTimeframe {
  private constructor(
    private readonly start: Date,
    private readonly end: Date,
  ) {}

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

  /** Total number of weekly buckets covering the window (always >= 1). */
  totalWeeks(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / WEEK_MS);
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
    const raw = Math.floor((date.getTime() - this.start.getTime()) / WEEK_MS);
    return this.clampWeekIndex(raw);
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
}
