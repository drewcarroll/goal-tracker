import { describe, it, expect } from "vitest";
import { CreateDailyPlanUseCase } from "./CreateDailyPlanUseCase";
import { Goal } from "../../domain/entities/Goal";
import { DailyPlan } from "../../domain/entities/DailyPlan";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { DailyPlanRepository } from "../../domain/repositories/DailyPlanRepository";
import {
  GoalNotFoundError,
  GoalNotSchedulableError,
  LockBudgetExceededError,
} from "../errors/ApplicationError";
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

class InMemoryDailyPlanRepository implements DailyPlanRepository {
  public readonly saved: DailyPlan[] = [];
  async findByUserIdAndDate(): Promise<DailyPlan | null> {
    return null;
  }
  async save(plan: DailyPlan): Promise<void> {
    this.saved.push(plan);
  }
}

const NOW = new Date("2026-01-20T00:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
const fixedIds: IdGenerator = { generate: () => "plan-1" };

function goal(id: string, initialLockCost: number, userId = "user-1") {
  return Goal.create({
    id,
    userId,
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    initialLockCost,
    now: NOW,
  });
}

describe("CreateDailyPlanUseCase", () => {
  it("sums the requested goals' server-side costs into locksSpent", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 25), goal("g2", 35)]);
    const plans = new InMemoryDailyPlanRepository();
    const useCase = new CreateDailyPlanUseCase(goals, plans, fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-21",
      goalIds: ["g1", "g2"],
    });

    expect(result.locksSpent).toBe(60); // 25 + 35
    expect(result.goalIds).toEqual(["g1", "g2"]);
    expect(plans.saved).toHaveLength(1);
  });

  it("allows scheduling exactly up to the 100-key daily budget", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 50), goal("g2", 50)]);
    const plans = new InMemoryDailyPlanRepository();
    const useCase = new CreateDailyPlanUseCase(goals, plans, fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-21",
      goalIds: ["g1", "g2"],
    });

    expect(result.locksSpent).toBe(100);
    expect(plans.saved).toHaveLength(1);
  });

  it("rejects scheduling over the 100-key daily budget (revived 2026-07-21, reversing the 2026-07-18 no-cap decision)", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 45), goal("g2", 45), goal("g3", 45)]);
    const plans = new InMemoryDailyPlanRepository();
    const useCase = new CreateDailyPlanUseCase(goals, plans, fixedIds, fixedClock);

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", goalIds: ["g1", "g2", "g3"] }),
    ).rejects.toBeInstanceOf(LockBudgetExceededError);
    expect(plans.saved).toHaveLength(0);
  });

  it("rejects scheduling a goal the caller does not own", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 25, "someone-else")]);
    const useCase = new CreateDailyPlanUseCase(
      goals,
      new InMemoryDailyPlanRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", goalIds: ["g1"] }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects scheduling a paused goal", async () => {
    const paused = goal("g1", 25);
    paused.pause();
    const useCase = new CreateDailyPlanUseCase(
      new InMemoryGoalRepository([paused]),
      new InMemoryDailyPlanRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", goalIds: ["g1"] }),
    ).rejects.toBeInstanceOf(GoalNotSchedulableError);
  });
});
