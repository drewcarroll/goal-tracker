import { describe, it, expect } from "vitest";
import { ClaimBattlePassDayUseCase } from "./ClaimBattlePassDayUseCase";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { BattlePassClaimRepository, BattlePassClaim } from "../../domain/repositories/BattlePassClaimRepository";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "../../domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "../../domain/repositories/TrinketInventoryRepository";
import { ActivityEventRepository, ActivityEvent } from "../../domain/repositories/ActivityEventRepository";
import { BattlePassCalendarService } from "../../domain/services/BattlePassCalendarService";
import { DeterministicRewardService } from "../../domain/services/DeterministicRewardService";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { economyConfigFrom } from "../../domain/value-objects/EconomyConfig";
import { Clock } from "../ports/Clock";
import { BattlePassDayNotClaimableError, MaintenanceModeError } from "../errors/ApplicationError";

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

class InMemoryCoinWalletRepository implements CoinWalletRepository {
  private balances: Record<string, number> = {};
  async getBalance(userId: string) {
    return this.balances[userId] ?? 0;
  }
  async adjustBalance(userId: string, delta: number) {
    const next = (this.balances[userId] ?? 0) + delta;
    this.balances[userId] = next;
    return next;
  }
}

class InMemoryTrinketInventoryRepository implements TrinketInventoryRepository {
  private inventory: Record<string, Map<string, number>> = {};
  async incrementQuantity(userId: string, trinketId: string, by = 1) {
    const map = (this.inventory[userId] ??= new Map());
    map.set(trinketId, (map.get(trinketId) ?? 0) + by);
  }
  async getInventory(userId: string) {
    return this.inventory[userId] ?? new Map();
  }
}

class InMemoryActivityEventRepository implements ActivityEventRepository {
  public events: ActivityEvent[] = [];
  async record(event: ActivityEvent) {
    this.events.push(event);
  }
  async findForUsers(userIds: readonly string[], limit: number) {
    return this.events.filter((e) => userIds.includes(e.userId)).slice(0, limit);
  }
}

class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now() {
    return this.date;
  }
}

function buildUseCase(checkIns: CheckIn[] = []) {
  const claimRepo = new InMemoryBattlePassClaimRepository();
  const walletRepo = new InMemoryCoinWalletRepository();
  const inventoryRepo = new InMemoryTrinketInventoryRepository();
  const activityRepo = new InMemoryActivityEventRepository();
  const useCase = new ClaimBattlePassDayUseCase(
    new InMemoryCheckInRepository(checkIns),
    claimRepo,
    new InMemoryEconomyConfigRepository(),
    walletRepo,
    inventoryRepo,
    activityRepo,
    new BattlePassCalendarService(new DeterministicRewardService()),
    new FixedClock(new Date("2026-07-01T12:00:00Z")),
  );
  return { useCase, claimRepo, walletRepo, inventoryRepo, activityRepo };
}

describe("ClaimBattlePassDayUseCase", () => {
  it("credits coins for an ordinary day and records the claim + activity event", async () => {
    const { useCase, claimRepo, walletRepo, activityRepo } = buildUseCase();

    const result = await useCase.execute({ userId: "user-1", date: "2026-07-01" });

    expect(result.kind).toBe("coins");
    expect(claimRepo.claims).toHaveLength(1);
    expect(claimRepo.claims[0]!.rewardType).toBe("coins");
    expect(await walletRepo.getBalance("user-1")).toBeGreaterThan(0);
    expect(activityRepo.events).toHaveLength(1);
  });

  it("awards a trinket on a milestone day and tracks quantity", async () => {
    const { useCase, inventoryRepo } = buildUseCase();

    const result = await useCase.execute({ userId: "user-1", date: "2026-07-05" });

    expect(result.kind).toBe("trinket");
    if (result.kind === "trinket") {
      expect(result.trinket.id).toBe("bp:2026-07:d5");
      expect(result.quantity).toBe(1);
    }
    const inventory = await inventoryRepo.getInventory("user-1");
    expect(inventory.get("bp:2026-07:d5")).toBe(1);
  });

  it("rejects a second claim of the same day", async () => {
    const { useCase } = buildUseCase();
    await useCase.execute({ userId: "user-1", date: "2026-07-01" });

    await expect(useCase.execute({ userId: "user-1", date: "2026-07-01" })).rejects.toBeInstanceOf(
      BattlePassDayNotClaimableError,
    );
  });

  it("rejects claiming a day that's been truncated off the end by misses", async () => {
    // Simulate 30 misses so far this month by faking a clock at day 30 with no on-time check-ins.
    const claimRepo = new InMemoryBattlePassClaimRepository();
    const useCase = new ClaimBattlePassDayUseCase(
      new InMemoryCheckInRepository([]),
      claimRepo,
      new InMemoryEconomyConfigRepository(),
      new InMemoryCoinWalletRepository(),
      new InMemoryTrinketInventoryRepository(),
      new InMemoryActivityEventRepository(),
      new BattlePassCalendarService(new DeterministicRewardService()),
      new FixedClock(new Date("2026-07-30T12:00:00Z")),
    );

    // Days 1-30 all uncredited -> 30 misses -> visible = 31-30 = 1, so day 30 is truncated.
    await expect(useCase.execute({ userId: "user-1", date: "2026-07-30" })).rejects.toBeInstanceOf(
      BattlePassDayNotClaimableError,
    );
  });

  it("throws MaintenanceModeError for a date outside the 12-month map", async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute({ userId: "user-1", date: "2030-01-01" })).rejects.toBeInstanceOf(
      MaintenanceModeError,
    );
  });
});
