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
import { Clock } from "../ports/Clock";

// Close to the check-ins used below, so recompute's disuse decay (10-day
// stale threshold) never accidentally kicks in on these tests.
const recomputeClock: Clock = { now: () => new Date("2026-01-06T00:00:00.000Z") };

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
    initialLockCost: 20,
    now: NOW,
  });
}

function buildUseCase(goals: Goal[], checkIns: CheckIn[] = []) {
  const goalRepository = new InMemoryGoalRepository(goals);
  const checkInRepository = new InMemoryCheckInRepository(checkIns);
  return new EditGoalUseCase(
    goalRepository,
    new GoalCostRecomputeService(
      goalRepository,
      checkInRepository,
      new InMemoryConfigRepository(),
      recomputeClock,
    ),
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
      isPublic: true,
    });

    expect(result.name).toBe("Exercise daily");
    expect(result.currentLockCost).toBe(20);
  });

  it("updates privacy", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise",
      weeklyFrequencyTarget: 7,
      isPublic: false,
    });

    expect(result.isPublic).toBe(false);
  });

  it("recomputes the cost when the weekly target changes (commitment pricing)", async () => {
    const useCase = buildUseCase([goal("g1", "user-1", 7)]);

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise",
      weeklyFrequencyTarget: 1,
      isPublic: true,
    });

    // No history: cost = 20·φ(1) = 20·0.5 = 10. Locks drop with the target.
    expect(result.weeklyFrequencyTarget).toBe(1);
    expect(result.currentLockCost).toBe(10);
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
      isPublic: true,
    });

    // The miss still counts (base 25.7), only the pricing changes: ·φ(4)=0.75 → 19.
    expect(result.currentLockCost).toBe(19);
  });

  it("rejects editing a goal the caller does not own", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    await expect(
      useCase.execute({
        userId: "intruder",
        goalId: "g1",
        name: "x",
        weeklyFrequencyTarget: 1,
        isPublic: true,
      }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects an invalid edit", async () => {
    const useCase = buildUseCase([goal("g1", "user-1")]);

    await expect(
      useCase.execute({
        userId: "user-1",
        goalId: "g1",
        name: "",
        weeklyFrequencyTarget: 3,
        isPublic: true,
      }),
    ).rejects.toThrow();
  });
});
