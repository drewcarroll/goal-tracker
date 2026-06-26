import { describe, it, expect } from "vitest";
import { GetProgressDataUseCase } from "./GetProgressDataUseCase";
import { Goal } from "../../domain/entities/Goal";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { Clock } from "../ports/Clock";

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

// Jan 20 sits in week index 2 of a Jan 5 -> Feb 9 (5-week) session.
const NOW = new Date("2026-01-20T00:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };

function makeGoal(overrides: Partial<{ id: string; userId: string }> = {}) {
  const goal = Goal.create({
    id: overrides.id ?? "goal-1",
    userId: overrides.userId ?? "user-1",
    sessionId: "session-1",
    name: "Read books",
    weeklyTarget: 10, // 10/week × 5 weeks = 50 total
    unit: "books",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    endDate: new Date("2026-02-09T00:00:00.000Z"),
    now: new Date("2026-01-05T00:00:00.000Z"),
  });
  // Log against past and current weeks via the aggregate root.
  goal.logProgress({ id: "l0", value: 6, today: NOW, weekIndex: 0 });
  goal.logProgress({ id: "l1", value: 8, today: NOW, weekIndex: 1 });
  goal.logProgress({ id: "l2", value: 4, today: NOW });
  return goal;
}

describe("GetProgressDataUseCase", () => {
  it("returns chart-ready series per goal for the user", async () => {
    const useCase = new GetProgressDataUseCase(
      new InMemoryGoalRepository([makeGoal()]),
      fixedClock,
    );

    const charts = await useCase.execute({ userId: "user-1" });
    expect(charts).toHaveLength(1);
    const chart = charts[0]!;

    expect(chart).toMatchObject({
      goalId: "goal-1",
      goalName: "Read books",
      unit: "books",
      targetValue: 50,
      weeklyTarget: 10,
      totalWeeks: 5,
      currentWeekIndex: 2,
      projectedTotal: 38,
    });
    expect(chart.weeks).toHaveLength(5);
    expect(chart.weeks.map((w) => w.weeklyActual)).toEqual([6, 8, 4, 0, 0]);
    expect(chart.weeks.map((w) => w.cumulativeActual)).toEqual([6, 14, 18, null, null]);
    expect(chart.weeks.map((w) => w.cumulativeProjected)).toEqual([6, 14, 18, 28, 38]);
    expect(chart.weeks.map((w) => w.cumulativeTarget)).toEqual([10, 20, 30, 40, 50]);
    // Each week is labelled with its calendar date range.
    expect(chart.weeks[0]?.startDate).toBe("2026-01-05T00:00:00.000Z");
    expect(chart.weeks[0]?.endDate).toBe("2026-01-12T00:00:00.000Z");
  });

  it("only returns the caller's own goals (AC #4)", async () => {
    const repo = new InMemoryGoalRepository([
      makeGoal({ id: "mine", userId: "user-1" }),
      makeGoal({ id: "theirs", userId: "user-2" }),
    ]);
    const useCase = new GetProgressDataUseCase(repo, fixedClock);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.goalId).toBe("mine");
  });

  it("returns an empty list when the user has no goals", async () => {
    const useCase = new GetProgressDataUseCase(new InMemoryGoalRepository([]), fixedClock);
    expect(await useCase.execute({ userId: "user-1" })).toEqual([]);
  });
});
