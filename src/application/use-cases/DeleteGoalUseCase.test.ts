import { describe, it, expect } from "vitest";
import { DeleteGoalUseCase } from "./DeleteGoalUseCase";
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
  public deletedIds: string[] = [];
  async delete(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
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

describe("DeleteGoalUseCase", () => {
  it("deletes a goal the caller owns", async () => {
    const repo = new InMemoryGoalRepository([goal("g1", "user-1")]);
    const useCase = new DeleteGoalUseCase(repo);

    await useCase.execute({ userId: "user-1", goalId: "g1" });

    expect(repo.deletedIds).toEqual(["g1"]);
  });

  it("rejects deleting a goal the caller does not own", async () => {
    const useCase = new DeleteGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    await expect(
      useCase.execute({ userId: "intruder", goalId: "g1" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects deleting a missing goal", async () => {
    const useCase = new DeleteGoalUseCase(new InMemoryGoalRepository([]));

    await expect(
      useCase.execute({ userId: "user-1", goalId: "missing" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
