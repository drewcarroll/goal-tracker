import { describe, it, expect } from "vitest";
import { SubmitCheckInUseCase } from "./SubmitCheckInUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import {
  UserSettingsRepository,
  type UserSettings,
} from "../../domain/repositories/UserSettingsRepository";
import { DEFAULT_CHECKIN_WINDOW } from "../../domain/services/CheckInWindowService";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";
import { CheckInWindowClosedError, GoalNotFoundError } from "../errors/ApplicationError";
import { CheckInWindowResolver } from "../services/CheckInWindowResolver";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";
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

class InMemoryConfigRepository implements ConfigRepository {
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
}

class InMemoryUserSettingsRepository implements UserSettingsRepository {
  async findByUserId(userId: string): Promise<UserSettings> {
    return { userId, checkInWindow: { ...DEFAULT_CHECKIN_WINDOW } };
  }
  async save(): Promise<void> {}
}

// 02:00 UTC — inside the default window's past-midnight stretch, so the
// nightly log is open and reports on the PREVIOUS day, 2026-01-20.
const NIGHT = new Date("2026-01-21T02:00:00.000Z");
// 10:00 UTC — between window end (07:00) and start (14:00): closed.
const MIDMORNING = new Date("2026-01-21T10:00:00.000Z");
const fixedIds: IdGenerator = { generate: () => "checkin-1" };

function goal(id: string, difficulty: "easy" | "medium" | "hard" = "medium") {
  const initialCost = { easy: 25, medium: 35, hard: 45 }[difficulty];
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 3,
    difficulty,
    initialLockCost: initialCost,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function buildUseCase(goals: Goal[], now: Date, checkIns = new InMemoryCheckInRepository()) {
  const clock: Clock = { now: () => now };
  const goalRepository = new InMemoryGoalRepository(goals);
  return new SubmitCheckInUseCase(
    goalRepository,
    checkIns,
    new CheckInWindowResolver(new InMemoryUserSettingsRepository(), clock),
    new GoalCostRecomputeService(goalRepository, checkIns, new InMemoryConfigRepository()),
    fixedIds,
    clock,
  );
}

describe("SubmitCheckInUseCase", () => {
  it("resolves the target date server-side (1 AM submission reports on yesterday) and stamps on-time", async () => {
    const checkIns = new InMemoryCheckInRepository();
    const useCase = buildUseCase([goal("g1")], NIGHT, checkIns);

    const result = await useCase.execute({
      userId: "user-1",
      timezone: "UTC",
      marks: [{ goalId: "g1", passed: true }],
    });

    expect(result.date).toBe("2026-01-20");
    expect(result.submittedOnTime).toBe(true);
    expect(checkIns.saved).toHaveLength(1);
    expect(checkIns.saved[0]?.id).toBe("checkin-1");
  });

  it("lowers cost for every passed goal on a full-pass day", async () => {
    const g1 = goal("g1");
    const g2 = goal("g2");
    const useCase = buildUseCase([g1, g2], NIGHT);

    const result = await useCase.execute({
      userId: "user-1",
      timezone: "UTC",
      marks: [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: true },
      ],
    });

    expect(result.dayResult).toBe("PASS");
    expect(g1.currentLockCost).toBe(30); // medium first-day pass: 35 → 30
    expect(g2.currentLockCost).toBe(30);
  });

  it("moves each goal by its OWN mark — a pass never gets another goal's fail bump", async () => {
    const g1 = goal("g1"); // passed
    const g2 = goal("g2"); // missed
    const useCase = buildUseCase([g1, g2], NIGHT);

    const result = await useCase.execute({
      userId: "user-1",
      timezone: "UTC",
      marks: [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ],
    });

    // The DAY still reads FAIL (calendar display), but costs are per-goal.
    expect(result.dayResult).toBe("FAIL");
    expect(g1.currentLockCost).toBe(30); // its own pass: 35 → 30
    expect(g2.currentLockCost).toBe(40); // its own fail: 35 → 40 (docs §6.2)
  });

  it("rejects a submission outside the check-in window and saves nothing", async () => {
    const checkIns = new InMemoryCheckInRepository();
    const g1 = goal("g1");
    const useCase = buildUseCase([g1], MIDMORNING, checkIns);

    await expect(
      useCase.execute({
        userId: "user-1",
        timezone: "UTC",
        marks: [{ goalId: "g1", passed: true }],
      }),
    ).rejects.toBeInstanceOf(CheckInWindowClosedError);
    expect(checkIns.saved).toHaveLength(0);
    expect(g1.currentLockCost).toBe(35); // untouched
  });

  it("rejects a mark against a goal the caller does not own", async () => {
    const useCase = buildUseCase([], NIGHT);

    await expect(
      useCase.execute({
        userId: "user-1",
        timezone: "UTC",
        marks: [{ goalId: "missing", passed: true }],
      }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
