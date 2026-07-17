import { describe, it, expect } from "vitest";
import { CreateGoalsFromOnboardingUseCase } from "./CreateGoalsFromOnboardingUseCase";
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
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
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
let counter = 0;
const fixedIds: IdGenerator = { generate: () => `goal-${++counter}` };

describe("CreateGoalsFromOnboardingUseCase", () => {
  it("creates one goal per selection, each at the uniform starting cost", async () => {
    const repo = new InMemoryGoalRepository();
    const useCase = new CreateGoalsFromOnboardingUseCase(
      repo,
      new InMemoryConfigRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      selections: [
        { name: "Exercise", weeklyFrequencyTarget: 7 },
        { name: "Meditate", weeklyFrequencyTarget: 4 },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "Exercise", currentLockCost: 20, state: "active" });
    expect(result[1]).toMatchObject({ name: "Meditate", currentLockCost: 15, state: "active" }); // φ(4)=0.75
    expect(repo.saved).toHaveLength(2);
    expect(repo.saved.every((g) => g.userId === "user-1")).toBe(true);
  });

  it("rejects the whole batch when it would overflow the weekly capacity", async () => {
    const repo = new InMemoryGoalRepository();
    const useCase = new CreateGoalsFromOnboardingUseCase(
      repo,
      new InMemoryConfigRepository(),
      fixedIds,
      fixedClock,
    );

    // Six 7×/week goals at 20 each = 120 > 100.
    await expect(
      useCase.execute({
        userId: "user-1",
        selections: ["A", "B", "C", "D", "E", "F"].map((name) => ({
          name,
          weeklyFrequencyTarget: 7,
        })),
      }),
    ).rejects.toMatchObject({ code: "LOCK_CAPACITY_EXCEEDED" });
    expect(repo.saved).toHaveLength(0); // atomic: no partial batch
  });

  it("creates nothing for an empty selection list", async () => {
    const repo = new InMemoryGoalRepository();
    const useCase = new CreateGoalsFromOnboardingUseCase(
      repo,
      new InMemoryConfigRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({ userId: "user-1", selections: [] });

    expect(result).toEqual([]);
    expect(repo.saved).toHaveLength(0);
  });
});
