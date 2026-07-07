import { describe, it, expect } from "vitest";
import { SubmitCheckInUseCase } from "./SubmitCheckInUseCase";
import { Habit } from "../../domain/entities/Habit";
import { CheckIn } from "../../domain/entities/CheckIn";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";
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

function habit(id: string, difficulty: "easy" | "medium" | "hard" = "medium") {
  return Habit.create({
    id,
    userId: "user-1",
    catalogId: "exercise",
    difficulty,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("SubmitCheckInUseCase", () => {
  it("lowers cost for every habit in the plan when the day is a full PASS", async () => {
    const h1 = habit("h1");
    const h2 = habit("h2");
    const useCase = new SubmitCheckInUseCase(
      new InMemoryHabitRepository([h1, h2]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [
        { habitId: "h1", passed: true },
        { habitId: "h2", passed: true },
      ],
    });

    expect(result.dayResult).toBe("PASS");
    expect(h1.currentLockCost).toBe(34); // 35 - 1
    expect(h2.currentLockCost).toBe(34);
  });

  it("raises cost for EVERY habit in the plan when even one habit missed — no partial credit", async () => {
    const h1 = habit("h1"); // passed
    const h2 = habit("h2"); // missed
    const useCase = new SubmitCheckInUseCase(
      new InMemoryHabitRepository([h1, h2]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [
        { habitId: "h1", passed: true },
        { habitId: "h2", passed: false },
      ],
    });

    expect(result.dayResult).toBe("FAIL");
    // Both habits get the FAIL bump, including h1 which the user actually passed.
    expect(h1.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
    expect(h2.currentLockCost).toBe(39);
  });

  it("persists the check-in", async () => {
    const checkIns = new InMemoryCheckInRepository();
    const useCase = new SubmitCheckInUseCase(
      new InMemoryHabitRepository([habit("h1")]),
      checkIns,
      fixedIds,
      fixedClock,
    );

    await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      marks: [{ habitId: "h1", passed: true }],
    });

    expect(checkIns.saved).toHaveLength(1);
    expect(checkIns.saved[0]?.id).toBe("checkin-1");
  });

  it("rejects a mark against a habit the caller does not own", async () => {
    const useCase = new SubmitCheckInUseCase(
      new InMemoryHabitRepository([]),
      new InMemoryCheckInRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({
        userId: "user-1",
        date: "2026-01-20",
        marks: [{ habitId: "missing", passed: true }],
      }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });
});
