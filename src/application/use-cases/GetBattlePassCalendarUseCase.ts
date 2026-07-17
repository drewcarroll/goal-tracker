import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { BattlePassClaimRepository } from "@/domain/repositories/BattlePassClaimRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { BattlePassCalendarService } from "@/domain/services/BattlePassCalendarService";
import {
  getBattlePassMonthDefinition,
  type BattlePassTrinketDay,
} from "@/domain/value-objects/BattlePassCalendarMap";
import { MaintenanceModeError } from "../errors/ApplicationError";
import type { BattlePassCalendarDTO, GetBattlePassCalendarDTO } from "../dtos/BattlePassDTO";

/**
 * Use Case: build a month's battle-pass calendar for display — which days
 * are visible after truncation, what each rewards, and claimed/claimable
 * state per day. Throws MaintenanceModeError for any (year, month) outside
 * BattlePassCalendarMap's 12 defined months (the app-wide maintenance guard
 * checks this same map before rendering anything, see GetMaintenanceStatusUseCase).
 */
export class GetBattlePassCalendarUseCase {
  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly battlePassClaimRepository: BattlePassClaimRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
    private readonly calendarService: BattlePassCalendarService,
  ) {}

  async execute(dto: GetBattlePassCalendarDTO): Promise<BattlePassCalendarDTO> {
    const monthDefinition = getBattlePassMonthDefinition(dto.year, dto.month);
    if (!monthDefinition) {
      throw new MaintenanceModeError();
    }

    const [checkIns, claimedDates, economyConfig] = await Promise.all([
      this.checkInRepository.findByUserId(dto.userId),
      this.battlePassClaimRepository.findClaimedDatesForMonth(dto.userId, dto.year, dto.month),
      this.economyConfigRepository.getEconomyConfig(),
    ]);

    const onTimeCheckInDates = new Set(
      checkIns.filter((c) => c.submittedOnTime).map((c) => c.date.toString()),
    );
    const missesSoFar = this.calendarService.countMisses({
      year: dto.year,
      month: dto.month,
      todayDate: dto.todayDate,
      onTimeCheckInDates,
    });
    const cells = this.calendarService.buildCalendar({
      year: dto.year,
      month: dto.month,
      missesSoFar,
      monthDefinition,
      claimedDates,
      todayDate: dto.todayDate,
      userId: dto.userId,
      economyConfig,
    });

    return {
      year: dto.year,
      month: dto.month,
      theme: monthDefinition.theme,
      daysInMonth: this.calendarService.daysInMonth(dto.year, dto.month),
      visibleDayCount: cells.length,
      missesSoFar,
      cells: cells.map((cell) => {
        if (cell.kind === "trinket") {
          const trinket = monthDefinition.trinketByDay[cell.day as BattlePassTrinketDay]!;
          return {
            day: cell.day,
            date: cell.date,
            kind: "trinket" as const,
            trinketId: trinket.id,
            trinketEmoji: trinket.emoji,
            trinketName: trinket.name,
            claimed: cell.claimed,
            claimable: cell.claimable,
          };
        }
        return {
          day: cell.day,
          date: cell.date,
          kind: "coins" as const,
          coinAmount: cell.coinAmount,
          claimed: cell.claimed,
          claimable: cell.claimable,
        };
      }),
    };
  }
}
