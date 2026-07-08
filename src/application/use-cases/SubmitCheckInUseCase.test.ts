import { describe, it, expect } from "vitest";
import { SubmitCheckInUseCase } from "./SubmitCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
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

class InMemoryCheckInRepository implements CheckInRepository {
  public readonly saved: CheckIn[] = [];
  async findByUserIdAndDate(): Promise<CheckIn | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.saved.filter((c) => c.userId === userId);
  }
  async save(checkIn: CheckIn): Promise<void> {
    this.saved.push(checkIn);
  }
  async delete(): Promise<void> {}
}

const NOW = new Date("2026-01-21T02:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
const fixedIds: IdGenerator = { generate: () => "checkin-1" };

function goal(id: string, difficulty: "easy" | "medium" | "hard" = "medium") {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("SubmitCheckInUseCase", () => {
  it("lowers cost for every goal in the plan when the day is a full PASS", async () => {
    const g1 = goal("g1");
    const g2 = goal("g2");
    const useCase = new SubmitCheckInUseCase(
      new InMemoryGoalRepository([g1, g2]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: true },
      ],
    });

    expect(result.dayResult).toBe("PASS");
    expect(g1.currentLockCost).toBe(34); // 35 - 1
    expect(g2.currentLockCost).toBe(34);
  });

  it("raises cost for EVERY goal in the plan when even one goal missed — no partial credit", async () => {
    const g1 = goal("g1"); // passed
    const g2 = goal("g2"); // missed
    const useCase = new SubmitCheckInUseCase(
      new InMemoryGoalRepository([g1, g2]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ],
    });

    expect(result.dayResult).toBe("FAIL");
    // Both goals get the FAIL bump, including g1 which the user actually passed.
    expect(g1.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
    expect(g2.currentLockCost).toBe(39);
  });

  it("persists the check-in", async () => {
    const checkIns = new InMemoryCheckInRepository();
    const useCase = new SubmitCheckInUseCase(
      new InMemoryGoalRepository([goal("g1")]),
      checkIns,
      fixedIds,
      fixedClock,
    );

    await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [{ goalId: "g1", passed: true }],
    });

    expect(checkIns.saved).toHaveLength(1);
    expect(checkIns.saved[0]?.id).toBe("checkin-1");
  });

  it("rejects a mark against a goal the caller does not own", async () => {
    const useCase = new SubmitCheckInUseCase(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({
        userId: "user-1",
        date: "2026-01-20",
        marks: [{ goalId: "missing", passed: true }],
      }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
