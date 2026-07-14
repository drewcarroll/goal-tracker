import { describe, it, expect } from "vitest";
import { EditGoalUseCase } from "./EditGoalUseCase";
import { Goal } from "../../domain/entities/Goal";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";

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

const NOW = new Date("2026-01-20T00:00:00.000Z");

function goal(id: string, userId: string) {
  return Goal.create({
    id,
    userId,
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty: "medium",
    initialLockCost: 35,
    now: NOW,
  });
}

describe("EditGoalUseCase", () => {
  it("updates name and weekly frequency target without touching cost", async () => {
    const useCase = new EditGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "g1",
      name: "Exercise daily",
      weeklyFrequencyTarget: 7,
    });

    expect(result.name).toBe("Exercise daily");
    expect(result.weeklyFrequencyTarget).toBe(7);
    expect(result.currentLockCost).toBe(35);
  });

  it("rejects editing a goal the caller does not own", async () => {
    const useCase = new EditGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    await expect(
      useCase.execute({ userId: "intruder", goalId: "g1", name: "x", weeklyFrequencyTarget: 1 }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects an invalid edit", async () => {
    const useCase = new EditGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    await expect(
      useCase.execute({ userId: "user-1", goalId: "g1", name: "", weeklyFrequencyTarget: 3 }),
    ).rejects.toThrow();
  });
});
