import { describe, it, expect } from "vitest";
import { EditCheckInUseCase } from "./EditCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { CheckInNotFoundError, GoalNotFoundError } from "../errors/ApplicationError";

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
    const index = this.checkIns.findIndex((c) => c.id === checkIn.id);
    if (index >= 0) this.checkIns[index] = checkIn;
    else this.checkIns.push(checkIn);
  }
  async delete(id: string): Promise<void> {
    const index = this.checkIns.findIndex((c) => c.id === id);
    if (index >= 0) this.checkIns.splice(index, 1);
  }
}

function goal(id: string, difficulty: "easy" | "medium" | "hard" = "easy") {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("EditCheckInUseCase", () => {
  it("corrects a day's marks and recomputes cost from the full history", async () => {
    const g1 = goal("g1");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ goalId: "g1", passed: false }], // originally recorded as a miss
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryGoalRepository([g1]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-01",
      marks: [{ goalId: "g1", passed: true }], // correcting it to a pass
    });

    expect(result.dayResult).toBe("PASS");
    expect(g1.currentLockCost).toBe(24); // 25 - 1, not 25 * 1.1
  });

  it("recomputes a goal that was removed from the marks too", async () => {
    const g1 = goal("g1");
    const g2 = goal("g2");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [
          { goalId: "g1", passed: true },
          { goalId: "g2", passed: true },
        ],
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryGoalRepository([g1, g2]),
      new InMemoryCheckInRepository(checkIns),
    );

    // g2 dropped from the corrected marks entirely.
    await useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ goalId: "g1", passed: true }] });

    // g2 has no check-ins left at all -> falls back to its starting cost.
    expect(g2.currentLockCost).toBe(25);
  });

  it("rejects editing a day with no existing check-in", async () => {
    const useCase = new EditCheckInUseCase(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository([]),
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ goalId: "g1", passed: true }] }),
    ).rejects.toBeInstanceOf(CheckInNotFoundError);
  });

  it("rejects a mark against a goal the caller does not own", async () => {
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ goalId: "g1", passed: true }],
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository(checkIns),
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ goalId: "missing", passed: true }] }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
