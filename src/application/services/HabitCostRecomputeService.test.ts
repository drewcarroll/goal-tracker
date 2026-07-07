import { describe, it, expect } from "vitest";
import { HabitCostRecomputeService } from "./HabitCostRecomputeService";
import { Habit } from "../../domain/entities/Habit";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";

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

describe("HabitCostRecomputeService", () => {
  it("recomputes cost from a full replay, not an increment from the current value", async () => {
    // Stored cost is deliberately wrong (as if stale/never updated) to prove
    // recompute derives fresh from history rather than incrementing from it.
    const habit = Habit.rehydrate({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "easy", // starts at 25
      currentLockCost: 7, // deliberately wrong — must be overwritten by recompute
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [{ habitId: "h1", passed: true }]), // 25 -> 24
      checkIn("2026-01-02", [{ habitId: "h1", passed: true }]), // 24 -> 23
    ];
    const service = new HabitCostRecomputeService(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository(checkIns),
    );

    await service.recompute("user-1", "h1");

    expect(habit.currentLockCost).toBe(23);
  });

  it("falls back to the difficulty's starting cost when there's no check-in history", async () => {
    const habit = Habit.rehydrate({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "hard", // starts at 45
      currentLockCost: 10,
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const service = new HabitCostRecomputeService(
      new InMemoryHabitRepository([habit]),
      new InMemoryCheckInRepository([]),
    );

    await service.recompute("user-1", "h1");

    expect(habit.currentLockCost).toBe(45);
  });

  it("is a no-op when the habit no longer exists", async () => {
    const service = new HabitCostRecomputeService(
      new InMemoryHabitRepository([]),
      new InMemoryCheckInRepository([]),
    );

    await expect(service.recompute("user-1", "missing")).resolves.toBeUndefined();
  });

  it("recomputeMany deduplicates and recomputes each habit", async () => {
    const h1 = Habit.create({
      id: "h1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "easy",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const h2 = Habit.create({
      id: "h2",
      userId: "user-1",
      catalogId: "meditate",
      difficulty: "medium",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const checkIns = [
      checkIn("2026-01-01", [
        { habitId: "h1", passed: true },
        { habitId: "h2", passed: false },
      ]),
    ];
    const service = new HabitCostRecomputeService(
      new InMemoryHabitRepository([h1, h2]),
      new InMemoryCheckInRepository(checkIns),
    );

    await service.recomputeMany("user-1", ["h1", "h2", "h1"]);

    // Both get the FAIL bump — h1 was individually passed, but the day's
    // overall result is FAIL because h2 missed, and that applies uniformly.
    expect(h1.currentLockCost).toBe(28); // 25 * 1.1 = 27.5 -> 28
    expect(h2.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
  });
});
