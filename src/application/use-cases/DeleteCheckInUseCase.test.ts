import { describe, it, expect } from "vitest";
import { DeleteCheckInUseCase } from "./DeleteCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { CheckInNotFoundError } from "../errors/ApplicationError";

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
  constructor(public readonly checkIns: CheckIn[]) {}
  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<CheckIn | null> {
    return this.checkIns.find((c) => c.userId === userId && c.date.equals(date)) ?? null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(checkIn: CheckIn): Promise<void> {
    this.checkIns.push(checkIn);
  }
  async delete(id: string): Promise<void> {
    const index = this.checkIns.findIndex((c) => c.id === id);
    if (index >= 0) this.checkIns.splice(index, 1);
  }
}

function goal(id: string) {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty: "easy",
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("DeleteCheckInUseCase", () => {
  it("removes the check-in and recomputes affected goals", async () => {
    const g1 = goal("g1");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ goalId: "g1", passed: false }],
      }),
    ];
    const checkInRepo = new InMemoryCheckInRepository(checkIns);
    const useCase = new DeleteCheckInUseCase(new InMemoryGoalRepository([g1]), checkInRepo);

    await useCase.execute({ userId: "user-1", date: "2026-01-01" });

    expect(checkInRepo.checkIns).toHaveLength(0);
    // No check-ins left at all -> falls back to the starting cost.
    expect(g1.currentLockCost).toBe(25);
  });

  it("recomputes forward: removing an earlier day still leaves later days correct", async () => {
    const g1 = goal("g1");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ goalId: "g1", passed: false }], // 25 -> 28
      }),
      CheckIn.create({
        id: "c2",
        userId: "user-1",
        date: LocalDate.create("2026-01-02"),
        marks: [{ goalId: "g1", passed: true }], // 28 -> 27
      }),
    ];
    const checkInRepo = new InMemoryCheckInRepository(checkIns);
    const useCase = new DeleteCheckInUseCase(new InMemoryGoalRepository([g1]), checkInRepo);

    await useCase.execute({ userId: "user-1", date: "2026-01-01" });

    // Only day 2 remains: 25 (start) -> PASS -> 24, not the stale 27.
    expect(g1.currentLockCost).toBe(24);
  });

  it("rejects deleting a day with no existing check-in", async () => {
    const useCase = new DeleteCheckInUseCase(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository([]),
    );

    await expect(useCase.execute({ userId: "user-1", date: "2026-01-01" })).rejects.toBeInstanceOf(
      CheckInNotFoundError,
    );
  });
});
