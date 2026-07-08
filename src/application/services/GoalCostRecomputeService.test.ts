import { describe, it, expect } from "vitest";
import { GoalCostRecomputeService } from "./GoalCostRecomputeService";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";

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

describe("GoalCostRecomputeService", () => {
  it("recomputes cost from a full replay, not an increment from the current value", async () => {
    // Stored cost is deliberately wrong (as if stale/never updated) to prove
    // recompute derives fresh from history rather than incrementing from it.
    const goal = Goal.rehydrate({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "easy", // starts at 25
      currentLockCost: 7, // deliberately wrong — must be overwritten by recompute
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "g1", passed: true }]), // 25 -> 24
      checkIn("2026-01-02", [{ goalId: "g1", passed: true }]), // 24 -> 23
    ];
    const service = new GoalCostRecomputeService(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository(checkIns),
    );

    await service.recompute("user-1", "g1");

    expect(goal.currentLockCost).toBe(23);
  });

  it("falls back to the difficulty's starting cost when there's no check-in history", async () => {
    const goal = Goal.rehydrate({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "hard", // starts at 45
      currentLockCost: 10,
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const service = new GoalCostRecomputeService(
      new InMemoryGoalRepository([goal]),
      new InMemoryCheckInRepository([]),
    );

    await service.recompute("user-1", "g1");

    expect(goal.currentLockCost).toBe(45);
  });

  it("is a no-op when the goal no longer exists", async () => {
    const service = new GoalCostRecomputeService(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository([]),
    );

    await expect(service.recompute("user-1", "missing")).resolves.toBeUndefined();
  });

  it("recomputeMany deduplicates and recomputes each goal", async () => {
    const g1 = Goal.create({
      id: "g1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const g2 = Goal.create({
      id: "g2",
      userId: "user-1",
      name: "Meditate",
      weeklyFrequencyTarget: 7,
      difficulty: "medium",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ]),
    ];
    const service = new GoalCostRecomputeService(
      new InMemoryGoalRepository([g1, g2]),
      new InMemoryCheckInRepository(checkIns),
    );

    await service.recomputeMany("user-1", ["g1", "g2", "g1"]);

    // Both get the FAIL bump — g1 was individually passed, but the day's
    // overall result is FAIL because g2 missed, and that applies uniformly.
    expect(g1.currentLockCost).toBe(28); // 25 * 1.1 = 27.5 -> 28
    expect(g2.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
  });
});
