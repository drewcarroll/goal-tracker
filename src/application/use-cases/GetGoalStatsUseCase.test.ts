import { describe, it, expect } from "vitest";
import { GetGoalStatsUseCase } from "./GetGoalStatsUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
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

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private readonly checkIns: CheckIn[]) {}
  async findByUserIdAndDate(): Promise<CheckIn | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

function checkIn(date: string, marks: { goalId: string; passed: boolean }[]) {
  return CheckIn.create({ id: `c-${date}`, userId: "user-1", date: LocalDate.create(date), marks });
}

describe("GetGoalStatsUseCase", () => {
  it("returns the full trajectory, last-30-day pass rate, and this week's count", async () => {
    const goal = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    // 2026-07-06 is a Monday; 07-07/08 fall in the same Mon-Sun week.
    const checkIns = [
      checkIn("2026-07-06", [{ goalId: "g1", passed: true }]),
      checkIn("2026-07-07", [{ goalId: "g1", passed: false }]),
      checkIn("2026-07-08", [{ goalId: "g1", passed: true }]),
    ];
    const useCase = new GetGoalStatsUseCase(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({ userId: "user-1", goalId: "g1", today: "2026-07-08" });

    expect(result.label).toBe("Exercise");
    expect(result.trajectory).toHaveLength(3);
    expect(result.last30).toEqual({ checkedInDays: 3, passedDays: 2, passRate: 67 });
    expect(result.thisWeek).toEqual({ completed: 2, target: 3 });
  });

  it("excludes last week's check-ins from this week's count", async () => {
    const goal = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      // 2026-06-29 is a Monday of the PREVIOUS week relative to 2026-07-08.
      checkIn("2026-06-29", [{ goalId: "g1", passed: true }]),
      checkIn("2026-07-06", [{ goalId: "g1", passed: true }]), // this week's Monday
    ];
    const useCase = new GetGoalStatsUseCase(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({ userId: "user-1", goalId: "g1", today: "2026-07-08" });

    expect(result.thisWeek).toEqual({ completed: 1, target: 3 });
  });

  it("rejects a goal the caller does not own", async () => {
    const goal = Goal.create({
      id: "g1",
      userId: "someone-else",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const useCase = new GetGoalStatsUseCase(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository([]),
    );

    await expect(
      useCase.execute({ userId: "user-1", goalId: "g1", today: "2026-01-15" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
