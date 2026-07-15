import { describe, it, expect } from "vitest";
import { EditGoalUseCase } from "./EditGoalUseCase";
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
import { GoalNotFoundError } from "../errors/ApplicationError";
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
  constructor(private readonly checkIns: CheckIn[] = []) {}
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
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

const NOW = new Date("2026-01-20T00:00:00.000Z");

function goal(id: string, userId: string, weeklyFrequencyTarget = 7) {
  return Goal.create({
    id,
    userId,
    name: "Exercise",
    weeklyFrequencyTarget,
    difficulty: "medium",
    initialLockCost: 35,
    now: NOW,
  });
}

function buildUseCase(goals: Goal[], checkIns: CheckIn[] = []) {
  const goalRepository = new InMemoryGoalRepository(goals);
  const checkInRepository = new InMemoryCheckInRepository(checkIns);
  return new EditGoalUseCase(
    goalRepository,
    new GoalCostRecomputeService(goalRepository, checkInRepository, new InMemoryConfigRepository()),
  );
}

describe("EditGoalUseCase", () => {
  it("renames without touching cost when the target is unchanged", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise daily",
      weeklyFrequencyTarget: 7,
    });

    expect(result.name).toBe("Exercise daily");
    expect(result.currentLockCost).toBe(35);
  });

  it("recomputes the cost when the weekly target changes (commitment pricing)", async () => {
    const useCase = buildUseCase([goal("g1", "user-1", 7)]);

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise",
      weeklyFrequencyTarget: 1,
    });

    // No history: cost = 35·φ(1) = 35·0.5 = 17.5 → 18. Locks drop with the target.
    expect(result.weeklyFrequencyTarget).toBe(1);
    expect(result.currentLockCost).toBe(18);
  });

  it("lowering the target re-prices history but never erases a miss", async () => {
    const g = goal("g1", "user-1", 7);
    const monMiss = CheckIn.create({
      id: "c1",
      userId: "user-1",
      date: LocalDate.create("2026-01-05"),
      marks: [{ goalId: "g1", passed: false }],
      submittedOnTime: true,
    });
    const useCase = buildUseCase([g], [monMiss]);

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise",
      weeklyFrequencyTarget: 4,
    });

    // The miss still counts (base 39.5), only the pricing changes: ·φ(4)=0.75 → 30.
    expect(result.currentLockCost).toBe(30);
  });

  it("rejects editing a goal the caller does not own", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    await expect(
      useCase.execute({ userId: "intruder", goalId: "g1", name: "x", weeklyFrequencyTarget: 1 }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects an invalid edit", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    await expect(
      useCase.execute({ userId: "user-1", goalId: "g1", name: "", weeklyFrequencyTarget: 3 }),
    ).rejects.toThrow();
  });
});
