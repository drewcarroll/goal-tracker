import { describe, it, expect } from "vitest";
import { CreateDailyPlanUseCase } from "./CreateDailyPlanUseCase";
import { Habit } from "../../domain/entities/Habit";
import { DailyPlan } from "../../domain/entities/DailyPlan";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { DailyPlanRepository } from "../../domain/repositories/DailyPlanRepository";
import {
  HabitNotFoundError,
  HabitNotSchedulableError,
  LockBudgetExceededError,
} from "../errors/ApplicationError";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

class InMemoryHabitRepository implements HabitRepository {
  constructor(private readonly habits: Habit[]) {}
  async findById(id: string): Promise<Habit | null> {
    return this.habits.find((h) => h.id === id) ?? null;
  }
  async findByUserId(userId: string): Promise<Habit[]> {
    return this.habits.filter((h) => h.userId === userId);
  }
  async save(): Promise<void> {}
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

function habit(id: string, difficulty: "easy" | "medium" | "hard", userId = "user-1") {
  return Habit.create({ id, userId, catalogId: "exercise", difficulty, now: NOW });
}

describe("CreateDailyPlanUseCase", () => {
  it("sums the requested habits' server-side costs into locksSpent", async () => {
    const habits = new InMemoryHabitRepository([habit("h1", "easy"), habit("h2", "medium")]);
    const plans = new InMemoryDailyPlanRepository();
    const useCase = new CreateDailyPlanUseCase(habits, plans, fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-21",
      habitIds: ["h1", "h2"],
    });

    expect(result.locksSpent).toBe(60); // 25 + 35
    expect(result.habitIds).toEqual(["h1", "h2"]);
    expect(plans.saved).toHaveLength(1);
  });

  it("rejects a plan that exceeds the 100-lock budget", async () => {
    const habits = new InMemoryHabitRepository([habit("h1", "hard"), habit("h2", "hard"), habit("h3", "hard")]);
    const plans = new InMemoryDailyPlanRepository();
    const useCase = new CreateDailyPlanUseCase(habits, plans, fixedIds, fixedClock);

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", habitIds: ["h1", "h2", "h3"] }),
    ).rejects.toBeInstanceOf(LockBudgetExceededError); // 45 * 3 = 135
    expect(plans.saved).toHaveLength(0);
  });

  it("rejects scheduling a habit the caller does not own", async () => {
    const habits = new InMemoryHabitRepository([habit("h1", "easy", "someone-else")]);
    const useCase = new CreateDailyPlanUseCase(
      habits,
      new InMemoryDailyPlanRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", habitIds: ["h1"] }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });

  it("rejects scheduling a paused habit", async () => {
    const paused = habit("h1", "easy");
    paused.pause();
    const useCase = new CreateDailyPlanUseCase(
      new InMemoryHabitRepository([paused]),
      new InMemoryDailyPlanRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-21", habitIds: ["h1"] }),
    ).rejects.toBeInstanceOf(HabitNotSchedulableError);
  });
});
