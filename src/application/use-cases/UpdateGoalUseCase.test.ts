import { describe, it, expect } from "vitest";
import { UpdateGoalUseCase } from "./UpdateGoalUseCase";
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

function goal(id: string, userId: string, initialLockCost = 20) {
  return Goal.create({
    id,
    userId,
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    initialLockCost,
    now: NOW,
  });
}

describe("UpdateGoalUseCase", () => {
  it("pauses an active goal", async () => {
    const useCase = new UpdateGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    const result = await useCase.execute({ userId: "user-1", goalId: "g1", action: "pause" });

    expect(result.state).toBe("paused");
  });

  it("resumes a paused goal", async () => {
    const g = goal("g1", "user-1");
    g.pause();
    const useCase = new UpdateGoalUseCase(new InMemoryGoalRepository([g]));

    const result = await useCase.execute({ userId: "user-1", goalId: "g1", action: "resume" });

    expect(result.state).toBe("active");
  });

  it("allows resuming a goal even when the active portfolio is already well over the daily budget", async () => {
    // No capacity limit on resume (2026-07-21) — only scheduling is gated.
    const a1 = goal("a1", "user-1", 50);
    const a2 = goal("a2", "user-1", 45);
    const paused = goal("p1", "user-1", 10);
    paused.pause();
    const useCase = new UpdateGoalUseCase(new InMemoryGoalRepository([a1, a2, paused]));

    const result = await useCase.execute({ userId: "user-1", goalId: "p1", action: "resume" });

    expect(result.state).toBe("active");
  });

  it("rejects mutating a goal the caller does not own", async () => {
    const useCase = new UpdateGoalUseCase(new InMemoryGoalRepository([goal("g1", "user-1")]));

    await expect(
      useCase.execute({ userId: "intruder", goalId: "g1", action: "pause" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects mutating a missing goal", async () => {
    const useCase = new UpdateGoalUseCase(new InMemoryGoalRepository([]));

    await expect(
      useCase.execute({ userId: "user-1", goalId: "missing", action: "pause" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
