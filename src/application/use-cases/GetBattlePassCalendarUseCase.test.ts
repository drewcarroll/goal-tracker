import { describe, it, expect } from "vitest";
import { GetBattlePassCalendarUseCase } from "./GetBattlePassCalendarUseCase";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { BattlePassClaimRepository, BattlePassClaim } from "../../domain/repositories/BattlePassClaimRepository";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import { BattlePassCalendarService } from "../../domain/services/BattlePassCalendarService";
import { DeterministicRewardService } from "../../domain/services/DeterministicRewardService";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { economyConfigFrom } from "../../domain/value-objects/EconomyConfig";
import { MaintenanceModeError } from "../errors/ApplicationError";

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private checkIns: CheckIn[] = []) {}
  async findByUserIdAndDate(userId: string, date: LocalDate) {
    return this.checkIns.find((c) => c.userId === userId && c.date.equals(date)) ?? null;
  }
  async findByUserId(userId: string) {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(checkIn: CheckIn) {
    this.checkIns.push(checkIn);
  }
  async delete() {}
}

class InMemoryBattlePassClaimRepository implements BattlePassClaimRepository {
  public claims: BattlePassClaim[] = [];
  async findClaimedDatesForMonth(userId: string, year: number, month: number) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return new Set(
      this.claims.filter((c) => c.userId === userId && c.date.startsWith(prefix)).map((c) => c.date),
    );
  }
  async hasClaimed(userId: string, date: string) {
    return this.claims.some((c) => c.userId === userId && c.date === date);
  }
  async save(claim: BattlePassClaim) {
    this.claims.push(claim);
  }
}

class InMemoryEconomyConfigRepository implements EconomyConfigRepository {
  async getEconomyConfig() {
    return economyConfigFrom(null);
  }
  async saveEconomyConfig() {}
  async resetEconomyConfig() {}
}

function checkIn(userId: string, date: string, submittedOnTime: boolean): CheckIn {
  return CheckIn.create({
    id: `ci-${date}`,
    userId,
    date: LocalDate.create(date),
    marks: [{ goalId: "goal-1", passed: true }],
    submittedOnTime,
  });
}

describe("GetBattlePassCalendarUseCase", () => {
  const calendarService = new BattlePassCalendarService(new DeterministicRewardService());

  it("throws MaintenanceModeError for a month outside the 12-month map", async () => {
    const useCase = new GetBattlePassCalendarUseCase(
      new InMemoryCheckInRepository(),
      new InMemoryBattlePassClaimRepository(),
      new InMemoryEconomyConfigRepository(),
      calendarService,
    );

    await expect(
      useCase.execute({ userId: "user-1", year: 2030, month: 1, todayDate: "2030-01-01" }),
    ).rejects.toBeInstanceOf(MaintenanceModeError);
  });

  it("truncates the visible calendar based on missed on-time check-ins", async () => {
    const checkIns = new InMemoryCheckInRepository([
      checkIn("user-1", "2026-07-01", true),
      // 07-02 missing entirely = a miss
      checkIn("user-1", "2026-07-03", false), // submitted late = counts as a miss too
    ]);
    const useCase = new GetBattlePassCalendarUseCase(
      checkIns,
      new InMemoryBattlePassClaimRepository(),
      new InMemoryEconomyConfigRepository(),
      calendarService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      year: 2026,
      month: 7,
      todayDate: "2026-07-03",
    });

    expect(result.missesSoFar).toBe(2); // 07-02 and 07-03 (late doesn't count as on-time)
    expect(result.visibleDayCount).toBe(29); // 31 - 2
    expect(result.cells).toHaveLength(29);
  });

  it("attaches trinket emoji/name for the milestone days", async () => {
    const onTimeAllMonth = Array.from({ length: 31 }, (_, i) =>
      checkIn("user-1", `2026-07-${String(i + 1).padStart(2, "0")}`, true),
    );
    const useCase = new GetBattlePassCalendarUseCase(
      new InMemoryCheckInRepository(onTimeAllMonth),
      new InMemoryBattlePassClaimRepository(),
      new InMemoryEconomyConfigRepository(),
      calendarService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      year: 2026,
      month: 7,
      todayDate: "2026-07-31",
    });

    const day25 = result.cells.find((c) => c.day === 25)!;
    expect(day25.kind).toBe("trinket");
    expect(day25.trinketEmoji).toBe("🗽");
    expect(day25.trinketId).toBe("bp:2026-07:d25");
  });
});
