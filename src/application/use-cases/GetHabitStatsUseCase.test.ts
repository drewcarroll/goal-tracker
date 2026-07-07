import { describe, it, expect } from "vitest";
import { GetHabitStatsUseCase } from "./GetHabitStatsUseCase";
import { Habit } from "../../domain/entities/Habit";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";

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

function checkIn(date: string, marks: { habitId: string; passed: boolean }[]) {
  return CheckIn.create({ id: `c-${date}`, userId: "user-1", date: LocalDate.create(date), marks });
}

describe("GetHabitStatsUseCase", () => {
  it("returns the full trajectory and the last-30-day pass rate", async () => {
    const habit = Habit.create({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [{ habitId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ habitId: "h1", passed: false }]),
    ];
    const useCase = new GetHabitStatsUseCase(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({ userId: "user-1", habitId: "h1", today: "2026-01-02" });

    expect(result.label).toBe("Exercise");
    expect(result.trajectory).toEqual([
      { date: "2026-01-01", cost: 24 },
      { date: "2026-01-02", cost: 26 }, // 24 * 1.1 = 26.4 -> 26
    ]);
    expect(result.last30).toEqual({ checkedInDays: 2, passedDays: 1, passRate: 50 });
  });

  it("excludes check-ins outside the 30-day window from the pass rate", async () => {
    const habit = Habit.create({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "easy",
      now: new Date("2025-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2025-01-01", [{ habitId: "h1", passed: false }]), // long before the window
      checkIn("2026-01-15", [{ habitId: "h1", passed: true }]),
    ];
    const useCase = new GetHabitStatsUseCase(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({ userId: "user-1", habitId: "h1", today: "2026-01-15" });

    // Trajectory still includes the old check-in (full history)...
    expect(result.trajectory).toHaveLength(2);
    // ...but the 30-day pass rate does not.
    expect(result.last30).toEqual({ checkedInDays: 1, passedDays: 1, passRate: 100 });
  });

  it("returns a null pass rate when there are no check-ins in the window", async () => {
    const habit = Habit.create({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const useCase = new GetHabitStatsUseCase(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository([]),
    );

    const result = await useCase.execute({ userId: "user-1", habitId: "h1", today: "2026-01-15" });

    expect(result.trajectory).toEqual([]);
    expect(result.last30).toEqual({ checkedInDays: 0, passedDays: 0, passRate: null });
  });

  it("rejects a habit the caller does not own", async () => {
    const habit = Habit.create({
      id: "h1",
      userId: "someone-else",
      catalogId: "exercise",
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const useCase = new GetHabitStatsUseCase(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository([]),
    );

    await expect(
      useCase.execute({ userId: "user-1", habitId: "h1", today: "2026-01-15" }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });
});
