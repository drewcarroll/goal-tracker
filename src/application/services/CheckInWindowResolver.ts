import { LocalDate } from "@/domain/value-objects/LocalDate";
import { ValidationError } from "@/domain/errors/DomainError";
import { CheckInWindowService } from "@/domain/services/CheckInWindowService";
import { UserSettingsRepository } from "@/domain/repositories/UserSettingsRepository";
import { Clock } from "../ports/Clock";

export type ResolvedCheckInWindow =
  | {
      open: true;
      /** YYYY-MM-DD the submission reports on (yesterday when past midnight). */
      targetDate: string;
      window: { start: string; end: string };
    }
  | {
      open: false;
      opensAt: string;
      closedAt: string;
      window: { start: string; end: string };
    };

/**
 * Application Service: answers "is the nightly check-in open for this user
 * right now, and for which logical day?" by combining the Clock, the user's
 * timezone, and their stored window settings through the domain's
 * CheckInWindowService. Shared by SubmitCheckInUseCase (server-side
 * enforcement — the client's clock and date are never trusted) and
 * GetCheckInWindowUseCase (UI gating on /checkin).
 */
export class CheckInWindowResolver {
  private static readonly windowService = new CheckInWindowService();

  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly clock: Clock,
  ) {}

  async resolve(userId: string, timezone: string): Promise<ResolvedCheckInWindow> {
    const settings = await this.userSettingsRepository.findByUserId(userId);
    const now = this.clock.now();
    const localDate = LocalDate.todayInTimezone(now, timezone);
    const minutes = CheckInWindowResolver.minutesSinceMidnightIn(now, timezone);

    const resolution = CheckInWindowResolver.windowService.resolve(
      localDate,
      minutes,
      settings.checkInWindow,
    );
    if (resolution.open) {
      return {
        open: true,
        targetDate: resolution.targetDate.toString(),
        window: settings.checkInWindow,
      };
    }
    return {
      open: false,
      opensAt: resolution.opensAt,
      closedAt: resolution.closedAt,
      window: settings.checkInWindow,
    };
  }

  /** Wall-clock minutes since midnight in `timezone` at instant `now`. */
  private static minutesSinceMidnightIn(now: Date, timezone: string): number {
    let formatted: string;
    try {
      formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(now);
    } catch {
      throw new ValidationError(`"${timezone}" is not a recognized timezone.`);
    }
    const [hours, mins] = formatted.split(":").map(Number);
    return hours! * 60 + mins!;
  }
}
