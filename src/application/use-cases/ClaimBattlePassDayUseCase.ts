import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { BattlePassClaimRepository } from "@/domain/repositories/BattlePassClaimRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { ActivityEventRepository } from "@/domain/repositories/ActivityEventRepository";
import { BattlePassCalendarService } from "@/domain/services/BattlePassCalendarService";
import {
  getBattlePassMonthDefinition,
  type BattlePassTrinketDay,
} from "@/domain/value-objects/BattlePassCalendarMap";
import { Clock } from "../ports/Clock";
import { MaintenanceModeError, BattlePassDayNotClaimableError } from "../errors/ApplicationError";
import type { ClaimBattlePassDayDTO, ClaimBattlePassDayResultDTO } from "../dtos/BattlePassDTO";

/**
 * Use Case: claim a single battle-pass day's reward. Called automatically as
 * a side effect of a successful nightly check-in (sequenced from
 * checkin/actions.ts, right after SubmitCheckInUseCase) — there is no
 * separate "unclaimed inventory" state, claiming happens the moment the day
 * becomes eligible. Re-derives claimability from the same calendar math as
 * GetBattlePassCalendarUseCase rather than trusting the client, so a stale
 * UI can never claim a truncated or already-claimed day.
 */
export class ClaimBattlePassDayUseCase {
  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly battlePassClaimRepository: BattlePassClaimRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
    private readonly coinWalletRepository: CoinWalletRepository,
    private readonly trinketInventoryRepository: TrinketInventoryRepository,
    private readonly activityEventRepository: ActivityEventRepository,
    private readonly calendarService: BattlePassCalendarService,
    private readonly clock: Clock,
  ) {}

  async execute(dto: ClaimBattlePassDayDTO): Promise<ClaimBattlePassDayResultDTO> {
    const [year, month, day] = dto.date.split("-").map(Number) as [number, number, number];
    const monthDefinition = getBattlePassMonthDefinition(year, month);
    if (!monthDefinition) {
      throw new MaintenanceModeError();
    }

    if (await this.battlePassClaimRepository.hasClaimed(dto.userId, dto.date)) {
      throw new BattlePassDayNotClaimableError(dto.date);
    }

    const [checkIns, claimedDates, economyConfig] = await Promise.all([
      this.checkInRepository.findByUserId(dto.userId),
      this.battlePassClaimRepository.findClaimedDatesForMonth(dto.userId, year, month),
      this.economyConfigRepository.getEconomyConfig(),
    ]);
    const onTimeCheckInDates = new Set(
      checkIns.filter((c) => c.submittedOnTime).map((c) => c.date.toString()),
    );
    const missesSoFar = this.calendarService.countMisses({
      year,
      month,
      todayDate: dto.date,
      onTimeCheckInDates,
    });
    const cells = this.calendarService.buildCalendar({
      year,
      month,
      missesSoFar,
      monthDefinition,
      claimedDates,
      todayDate: dto.date,
      userId: dto.userId,
      economyConfig,
    });
    const cell = cells.find((c) => c.day === day);
    if (!cell || !cell.claimable) {
      throw new BattlePassDayNotClaimableError(dto.date);
    }

    if (cell.kind === "trinket") {
      const trinket = monthDefinition.trinketByDay[day as BattlePassTrinketDay]!;
      await this.battlePassClaimRepository.save({
        userId: dto.userId,
        date: dto.date,
        rewardType: "trinket",
        trinketId: trinket.id,
      });
      await this.trinketInventoryRepository.incrementQuantity(dto.userId, trinket.id, 1);
      const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
      await this.activityEventRepository.record({
        userId: dto.userId,
        type: "battle_pass_claim",
        trinketId: trinket.id,
        occurredAt: this.clock.now(),
      });
      return {
        kind: "trinket",
        trinket: { id: trinket.id, emoji: trinket.emoji, name: trinket.name },
        quantity: inventory.get(trinket.id)?.quantity ?? 1,
      };
    }

    await this.battlePassClaimRepository.save({
      userId: dto.userId,
      date: dto.date,
      rewardType: "coins",
      coinsAwarded: cell.coinAmount,
    });
    const balance = await this.coinWalletRepository.adjustBalance(dto.userId, cell.coinAmount);
    await this.activityEventRepository.record({
      userId: dto.userId,
      type: "battle_pass_claim",
      coins: cell.coinAmount,
      occurredAt: this.clock.now(),
    });
    return { kind: "coins", coinAmount: cell.coinAmount, balance };
  }
}
