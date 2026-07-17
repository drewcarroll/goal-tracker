import { describe, it, expect } from "vitest";
import { DeleteCheckInUseCase } from "./DeleteCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";
import { CheckInNotFoundError } from "../errors/ApplicationError";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";
import { Clock } from "../ports/Clock";

const fixedClock: Clock = { now: () => new Date("2026-01-02T00:00:00.000Z") };

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

class InMemoryConfigRepository implements ConfigRepository {
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

function goal(id: string) {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 7,
    initialLockCost: 20,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function checkIn(id: string, date: string, marks: { goalId: string; passed: boolean }[]) {
  return CheckIn.create({
    id,
    userId: "user-1",
    date: LocalDate.create(date),
    marks,
    submittedOnTime: true,
  });
}

function buildUseCase(goals: Goal[], checkIns: CheckIn[]) {
  const goalRepository = new InMemoryGoalRepository(goals);
  const checkInRepository = new InMemoryCheckInRepository(checkIns);
  return {
    useCase: new DeleteCheckInUseCase(
      checkInRepository,
      new GoalCostRecomputeService(
        goalRepository,
        checkInRepository,
        new InMemoryConfigRepository(),
        fixedClock,
      ),
    ),
    checkInRepository,
  };
}

describe("DeleteCheckInUseCase", () => {
  it("removes the check-in and recomputes affected goals", async () => {
    const g1 = goal("g1");
    const { useCase, checkInRepository } = buildUseCase(
      [g1],
      [checkIn("c1", "2026-01-01", [{ goalId: "g1", passed: false }])],
    );

    await useCase.execute({ userId: "user-1", date: "2026-01-01" });

    expect(checkInRepository.checkIns).toHaveLength(0);
    // No check-ins left at all -> falls back to the starting cost.
    expect(g1.currentLockCost).toBe(20);
  });

  it("recomputes forward: removing an earlier day still leaves later days correct", async () => {
    const g1 = goal("g1");
    const { useCase } = buildUseCase(
      [g1],
      [
        checkIn("c1", "2026-01-01", [{ goalId: "g1", passed: false }]),
        checkIn("c2", "2026-01-02", [{ goalId: "g1", passed: true }]),
      ],
    );

    await useCase.execute({ userId: "user-1", date: "2026-01-01" });

    // Only day 2 remains, replayed as the goal's FIRST day: pass 20 → 17.
    expect(g1.currentLockCost).toBe(17);
  });

  it("rejects deleting a day with no existing check-in", async () => {
    const { useCase } = buildUseCase([], []);

    await expect(useCase.execute({ userId: "user-1", date: "2026-01-01" })).rejects.toBeInstanceOf(
      CheckInNotFoundError,
    );
  });
});
