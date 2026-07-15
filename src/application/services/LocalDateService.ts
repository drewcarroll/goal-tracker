import { LocalDate } from "@/domain/value-objects/LocalDate";
import { Clock } from "../ports/Clock";

/**
 * Application Service: bridges the Clock port and a caller-supplied timezone
 * into date strings, so interfaces/ never needs to import the domain's
 * LocalDate directly just to ask "what day is it for this user right now".
 */
export class LocalDateService {
  constructor(private readonly clock: Clock) {}

  /** Today's date (YYYY-MM-DD) in `timezone`. */
  today(timezone: string): string {
    return LocalDate.todayInTimezone(this.clock.now(), timezone).toString();
  }

  /** Tomorrow's date (YYYY-MM-DD) in `timezone` — the day planning targets. */
  tomorrow(timezone: string): string {
    return LocalDate.todayInTimezone(this.clock.now(), timezone).addDays(1).toString();
  }

  /** The Mon-Sun week containing today in `timezone`, as YYYY-MM-DD bounds. */
  weekOf(timezone: string): { start: string; end: string } {
    const start = LocalDate.todayInTimezone(this.clock.now(), timezone).startOfWeek();
    return { start: start.toString(), end: start.addDays(6).toString() };
  }
}
