import { describe, it, expect } from "vitest";
import { RecomputeAllGoalsUseCase } from "./RecomputeAllGoalsUseCase";
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
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

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

class TweakedConfigRepository implements ConfigRepository {
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    // No calibration phase + doubled gain, as if dev mode just changed it.
    return { ...DEFAULT_LOCK_FORMULA_CONFIG, calibrationBoost: 1, gainRate: 0.12 };
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

describe("RecomputeAllGoalsUseCase", () => {
  it("re-replays every goal of the user under the current config", async () => {
    const g1 = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      difficulty: "medium",
      initialLockCost: 35,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-02"),
        marks: [{ goalId: "g1", passed: true }],
        submittedOnTime: true,
      }),
    ];
    const goalRepository = new InMemoryGoalRepository([g1]);
    const checkInRepository = new InMemoryCheckInRepository(checkIns);
    const useCase = new RecomputeAllGoalsUseCase(
      goalRepository,
      new GoalCostRecomputeService(goalRepository, checkInRepository, new TweakedConfigRepository()),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.recomputed).toBe(1);
    // Under the tweaked config: gain 0.12 → H=0.12 → cost 1 + 34·0.88 = 30.92 → 31.
    expect(g1.currentLockCost).toBe(31);
  });
});
