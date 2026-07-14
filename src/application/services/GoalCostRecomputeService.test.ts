import { describe, it, expect } from "vitest";
import { GoalCostRecomputeService } from "./GoalCostRecomputeService";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";

class InMemoryGoalRepository implements GoalRepository {
  constructor(private readonly goals: Goal[]) {}
  async findById(id: string): Promise<Goal | null> {
    return this.goals.find((g) => g.id === id) ?? null;
  }
  async findByUserId(userId: string): Promise<Goal[]> {
    return this.goals.filter((g) => g.userId === userId);
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private readonly checkIns: CheckIn[]) {}
  async findByUserIdAndDate(): Promise<CheckIn | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

class InMemoryConfigRepository implements ConfigRepository {
  constructor(private config: LockFormulaConfig = DEFAULT_LOCK_FORMULA_CONFIG) {}
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return this.config;
  }
  async saveLockFormulaConfig(config: LockFormulaConfig): Promise<void> {
    this.config = config;
  }
  async resetLockFormulaConfig(): Promise<void> {
    this.config = DEFAULT_LOCK_FORMULA_CONFIG;
  }
}

function checkIn(date: string, marks: { goalId: string; passed: boolean }[]) {
  return CheckIn.create({
    id: `c-${date}`,
    userId: "user-1",
    date: LocalDate.create(date),
    marks,
    submittedOnTime: true,
  });
}

function buildService(goals: Goal[], checkIns: CheckIn[]) {
  return new GoalCostRecomputeService(
    new InMemoryGoalRepository(goals),
    new InMemoryCheckInRepository(checkIns),
    new InMemoryConfigRepository(),
  );
}

describe("GoalCostRecomputeService", () => {
  it("recomputes cost from a full replay, not an increment from the current value", async () => {
    // Stored cost is deliberately wrong (as if stale/never updated) to prove
    // recompute derives fresh from history rather than incrementing from it.
    const goal = Goal.rehydrate({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      difficulty: "easy", // starts at 25
      currentLockCost: 7, // deliberately wrong — must be overwritten by recompute
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "g1", passed: true }]), // κ=2.50 → H=0.18   → 21
      checkIn("2026-01-02", [{ goalId: "g1", passed: true }]), // κ=2.35 → H≈0.319 → 17
    ];
    const service = buildService([goal], checkIns);

    await service.recompute("user-1", "g1");

    expect(goal.currentLockCost).toBe(17);
  });

  it("falls back to the difficulty's starting cost when there's no check-in history", async () => {
    const goal = Goal.rehydrate({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      difficulty: "hard", // starts at 45
      currentLockCost: 10,
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const service = buildService([goal], []);

    await service.recompute("user-1", "g1");

    expect(goal.currentLockCost).toBe(45);
  });

  it("is a no-op when the goal no longer exists", async () => {
    const service = buildService([], []);

    await expect(service.recompute("user-1", "missing")).resolves.toBeUndefined();
  });

  it("recomputeMany deduplicates and applies each goal's OWN mark (per-goal contingency)", async () => {
    const g1 = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      difficulty: "easy",
      initialLockCost: 25,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const g2 = Goal.create({
      id: "g2",
      userId: "user-1",
      name: "Meditate",
      weeklyFrequencyTarget: 7,
      difficulty: "medium",
      initialLockCost: 35,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ]),
    ];
    const service = buildService([g1, g2], checkIns);

    await service.recomputeMany("user-1", ["g1", "g2", "g1"]);

    // g1 passed → its cost DROPS even though g2's miss failed the day;
    // g2's own fail pushes only g2 up. (Phase 6 per-goal contingency.)
    expect(g1.currentLockCost).toBe(21); // easy pass, κ=2.5 → H=0.18 → 21
    expect(g2.currentLockCost).toBe(40); // medium first-day fail → 40 (docs §6.2)
  });

  it("recomputes with the CURRENT config (dev-mode tweaks are retroactive)", async () => {
    const goal = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      difficulty: "medium",
      initialLockCost: 35,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [checkIn("2026-01-01", [{ goalId: "g1", passed: true }])];
    const service = new GoalCostRecomputeService(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository(checkIns),
      new InMemoryConfigRepository({
        ...DEFAULT_LOCK_FORMULA_CONFIG,
        calibrationBoost: 1, // no calibration phase
        gainRate: 0.1,
      }),
    );

    await service.recompute("user-1", "g1");

    // gain = 0.1·(1−0) = 0.1 → cost = 1 + 34·0.9 = 31.6 → 32 (not the default 30)
    expect(goal.currentLockCost).toBe(32);
  });
});
