import { describe, it, expect } from "vitest";
import { CreateGoalUseCase } from "./CreateGoalUseCase";
import { Goal } from "../../domain/entities/Goal";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

class InMemoryConfigRepository implements ConfigRepository {
  constructor(private readonly config: LockFormulaConfig = DEFAULT_LOCK_FORMULA_CONFIG) {}
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return this.config;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

class InMemoryGoalRepository implements GoalRepository {
  public readonly saved: Goal[] = [];
  async findById(id: string): Promise<Goal | null> {
    return this.saved.find((g) => g.id === id) ?? null;
  }
  async findByUserId(userId: string): Promise<Goal[]> {
    return this.saved.filter((g) => g.userId === userId);
  }
  async save(goal: Goal): Promise<void> {
    this.saved.push(goal);
  }
  async delete(): Promise<void> {}
}

const NOW = new Date("2026-01-20T00:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
const fixedIds: IdGenerator = { generate: () => "goal-1" };

describe("CreateGoalUseCase", () => {
  it("creates a goal at its difficulty's starting cost", async () => {
    const repo = new InMemoryGoalRepository();
    const useCase = new CreateGoalUseCase(repo, new InMemoryConfigRepository(), fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "medium",
    });

    expect(result).toMatchObject({
      id: "goal-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      currentLockCost: 35,
      state: "active",
    });
    expect(repo.saved).toHaveLength(1);
  });

  it("uses the CURRENT config's initial cost, not the shipped default", async () => {
    const repo = new InMemoryGoalRepository();
    const useCase = new CreateGoalUseCase(
      repo,
      new InMemoryConfigRepository({
        ...DEFAULT_LOCK_FORMULA_CONFIG,
        initialCost: { ...DEFAULT_LOCK_FORMULA_CONFIG.initialCost, medium: 30 },
      }),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "medium",
    });

    expect(result.currentLockCost).toBe(30);
  });
});
