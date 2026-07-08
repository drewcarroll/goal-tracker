import { describe, it, expect } from "vitest";
import { GetAllGoalsUseCase } from "./GetAllGoalsUseCase";
import { Goal } from "../../domain/entities/Goal";
import { GoalRepository } from "../../domain/repositories/GoalRepository";

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
    now: NOW,
  });
}

describe("GetAllGoalsUseCase", () => {
  it("includes paused goals, unlike GetActiveGoalsUseCase", async () => {
    const paused = goal("g1", "user-1");
    paused.pause();
    const useCase = new GetAllGoalsUseCase(new InMemoryGoalRepository([paused]));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.state).toBe("paused");
  });

  it("returns only the caller's goals", async () => {
    const useCase = new GetAllGoalsUseCase(
      new InMemoryGoalRepository([goal("g1", "user-1"), goal("g2", "user-2")]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
  });
});
