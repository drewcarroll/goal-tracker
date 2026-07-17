import { LocalDate } from "@/domain/value-objects/LocalDate";
import { isBattlePassMonthSupported } from "@/domain/value-objects/BattlePassCalendarMap";
import { Clock } from "../ports/Clock";

export interface MaintenanceStatusDTO {
  blocked: boolean;
}

/**
 * Use Case: the app-wide maintenance trip-wire (user requirement,
 * 2026-07-16). BattlePassCalendarMap only defines July 2026 - June 2027,
 * deliberately keyed by literal (year, month) rather than a cycling lookup —
 * this use case is what turns "current month has no map entry" into a
 * blocking signal the (app) layout checks before rendering anything.
 */
export class GetMaintenanceStatusUseCase {
  constructor(private readonly clock: Clock) {}

  execute(timezone: string): MaintenanceStatusDTO {
    const today = LocalDate.todayInTimezone(this.clock.now(), timezone);
    const [year, month] = today.toString().split("-").map(Number) as [number, number];
    return { blocked: !isBattlePassMonthSupported(year, month) };
  }
}
