import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

/** "HH:MM" 24-hour wall-clock times in the user's local timezone. */
export interface CheckInWindowTimes {
  /** Earliest time the nightly log opens (afternoon, e.g. "14:00"). */
  start: string;
  /** Deadline the next morning (e.g. "07:00"). */
  end: string;
}

export const DEFAULT_CHECKIN_WINDOW: CheckInWindowTimes = { start: "14:00", end: "07:00" };

export type CheckInWindowResolution =
  | {
      open: true;
      /** The logical day this submission reports on (yesterday when after midnight). */
      targetDate: LocalDate;
    }
  | {
      open: false;
      /** When tonight's log opens, "HH:MM" local. */
      opensAt: string;
      /** When last night's log closed, "HH:MM" local. */
      closedAt: string;
    };

const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;
const NOON = 12 * 60;

function toMinutes(time: string, label: string): number {
  const match = TIME_FORMAT.exec(time);
  if (!match) {
    throw new ValidationError(`${label} must be a HH:MM time, got "${time}".`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Domain service for the nightly check-in window and the "logical day" it
 * implies (docs/progression.md §3). The window runs from `start` (afternoon)
 * through midnight to `end` (next morning), all user-local wall-clock time:
 *
 *   t ≥ start          → open, reporting on today
 *   t < end            → open, reporting on YESTERDAY (up past midnight)
 *   end ≤ t < start    → closed (last night's log expired; tonight's not open)
 *
 * The constraint end < 12:00 ≤ start keeps that mapping unambiguous
 * ("as late as 7 AM, as early as 2 PM"). Pure — callers supply the current
 * local date and minutes-since-midnight (see LocalDateService).
 */
export class CheckInWindowService {
  static assertValidWindow(times: CheckInWindowTimes): void {
    const start = toMinutes(times.start, "Check-in window start");
    const end = toMinutes(times.end, "Check-in window end");
    if (start < NOON) {
      throw new ValidationError("Check-in window must open at or after 12:00 (noon).");
    }
    if (end >= NOON) {
      throw new ValidationError("Check-in window must close before 12:00 (noon).");
    }
  }

  resolve(
    localDate: LocalDate,
    minutesSinceMidnight: number,
    times: CheckInWindowTimes,
  ): CheckInWindowResolution {
    CheckInWindowService.assertValidWindow(times);
    const start = toMinutes(times.start, "Check-in window start");
    const end = toMinutes(times.end, "Check-in window end");

    if (minutesSinceMidnight >= start) {
      return { open: true, targetDate: localDate };
    }
    if (minutesSinceMidnight < end) {
      return { open: true, targetDate: localDate.addDays(-1) };
    }
    return { open: false, opensAt: times.start, closedAt: times.end };
  }
}
