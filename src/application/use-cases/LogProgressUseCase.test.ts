import { describe, it, expect, beforeEach } from "vitest";
import { LogProgressUseCase } from "./LogProgressUseCase";
import { Goal } from "../../domain/entities/Goal";
import { LogEntry } from "../../domain/entities/LogEntry";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { LogRepository } from "../../domain/repositories/LogRepository";
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

class InMemoryLogRepository implements LogRepository {
  public readonly added: LogEntry[] = [];
  async add(entry: LogEntry): Promise<void> {
    this.added.push(entry);
  }
}

// Jan 16 sits in week index 2 of a Jan 1 -> Feb 5 session.
const NOW = new Date("2026-01-16T00:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
const fixedIds: IdGenerator = { generate: () => "log-1" };

function makeGoal() {
  return Goal.create({
    id: "goal-1",
    userId: "user-1",
    sessionId: "session-1",
    name: "Read books",
    targetValue: 50,
    unit: "books",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-02-05T00:00:00.000Z"),
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("LogProgressUseCase", () => {
  let logRepo: InMemoryLogRepository;

  beforeEach(() => {
    logRepo = new InMemoryLogRepository();
  });

  it("logs against the current week and persists the entry", async () => {
    const useCase = new LogProgressUseCase(
      new InMemoryGoalRepository([makeGoal()]),
      logRepo,
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({ userId: "user-1", goalId: "goal-1", value: 4 });

    expect(result.log).toMatchObject({ id: "log-1", goalId: "goal-1", weekIndex: 2, value: 4 });
    expect(result.weekTotal).toBe(4);
    expect(logRepo.added).toHaveLength(1);
    expect(logRepo.added[0]?.userId).toBe("user-1");
  });

  it("backfills an explicit past week", async () => {
    const useCase = new LogProgressUseCase(
      new InMemoryGoalRepository([makeGoal()]),
      logRepo,
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      goalId: "goal-1",
      value: 6,
      weekIndex: 0,
    });

    expect(result.log.weekIndex).toBe(0);
    expect(result.weekTotal).toBe(6);
    expect(logRepo.added[0]?.weekIndex).toBe(0);
  });

  it("rejects backfilling a week outside the session", async () => {
    const useCase = new LogProgressUseCase(
      new InMemoryGoalRepository([makeGoal()]),
      logRepo,
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", goalId: "goal-1", value: 6, weekIndex: 99 }),
    ).rejects.toThrow();
    expect(logRepo.added).toHaveLength(0);
  });

  it("rejects logging against a goal the caller does not own", async () => {
    const useCase = new LogProgressUseCase(
      new InMemoryGoalRepository([makeGoal()]),
      logRepo,
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "intruder", goalId: "goal-1", value: 4 }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
    expect(logRepo.added).toHaveLength(0);
  });

  it("rejects logging against a missing goal", async () => {
    const useCase = new LogProgressUseCase(
      new InMemoryGoalRepository([]),
      logRepo,
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", goalId: "missing", value: 4 }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
