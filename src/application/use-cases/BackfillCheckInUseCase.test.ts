import { describe, it, expect } from "vitest";
import { BackfillCheckInUseCase } from "./BackfillCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
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
import { IdGenerator } from "../ports/IdGenerator";

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
  public readonly saved: CheckIn[] = [];
  async findByUserIdAndDate(): Promise<CheckIn | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.saved.filter((c) => c.userId === userId);
  }
  async save(checkIn: CheckIn): Promise<void> {
    this.saved.push(checkIn);
  }
  async delete(): Promise<void> {}
}

class InMemoryConfigRepository implements ConfigRepository {
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

const fixedClock: Clock = { now: () => new Date("2026-01-25T18:00:00.000Z") };
const fixedIds: IdGenerator = { generate: () => "checkin-1" };

function buildUseCase(goals: Goal[]) {
  const goalRepository = new InMemoryGoalRepository(goals);
  const checkIns = new InMemoryCheckInRepository();
  return {
    useCase: new BackfillCheckInUseCase(
      goalRepository,
      checkIns,
      new GoalCostRecomputeService(goalRepository, checkIns, new InMemoryConfigRepository()),
      fixedIds,
      fixedClock,
    ),
    checkIns,
  };
}

function goal(id: string) {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty: "medium",
    initialLockCost: 35,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("BackfillCheckInUseCase", () => {
  it("saves the past day, stamps it NOT on-time, and still recomputes costs", async () => {
    const g1 = goal("g1");
    const { useCase, checkIns } = buildUseCase([g1]);

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [{ goalId: "g1", passed: true }],
    });

    expect(result.date).toBe("2026-01-20");
    expect(result.submittedOnTime).toBe(false); // honesty preserved, no rank point
    expect(checkIns.saved).toHaveLength(1);
    expect(g1.currentLockCost).toBe(30); // the pass still counts fully for the lock track
  });

  it("rejects a mark against a goal the caller does not own", async () => {
    const { useCase } = buildUseCase([]);

    await expect(
      useCase.execute({
        userId: "user-1",
        date: "2026-01-20",
        marks: [{ goalId: "missing", passed: true }],
      }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
