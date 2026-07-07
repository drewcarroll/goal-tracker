import { describe, it, expect } from "vitest";
import { EditCheckInUseCase } from "./EditCheckInUseCase";
import { Habit } from "../../domain/entities/Habit";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { CheckInNotFoundError, HabitNotFoundError } from "../errors/ApplicationError";

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

function habit(id: string, difficulty: "easy" | "medium" | "hard" = "easy") {
  return Habit.create({
    id,
    userId: "user-1",
    catalogId: "exercise",
    difficulty,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("EditCheckInUseCase", () => {
  it("corrects a day's marks and recomputes cost from the full history", async () => {
    const h1 = habit("h1");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ habitId: "h1", passed: false }], // originally recorded as a miss
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryHabitRepository([h1]),
      new InMemoryCheckInRepository(checkIns),
    );

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-01",
      marks: [{ habitId: "h1", passed: true }], // correcting it to a pass
    });

    expect(result.dayResult).toBe("PASS");
    expect(h1.currentLockCost).toBe(24); // 25 - 1, not 25 * 1.1
  });

  it("recomputes a habit that was removed from the marks too", async () => {
    const h1 = habit("h1");
    const h2 = habit("h2");
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [
          { habitId: "h1", passed: true },
          { habitId: "h2", passed: true },
        ],
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryHabitRepository([h1, h2]),
      new InMemoryCheckInRepository(checkIns),
    );

    // h2 dropped from the corrected marks entirely.
    await useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ habitId: "h1", passed: true }] });

    // h2 has no check-ins left at all -> falls back to its starting cost.
    expect(h2.currentLockCost).toBe(25);
  });

  it("rejects editing a day with no existing check-in", async () => {
    const useCase = new EditCheckInUseCase(
      new InMemoryHabitRepository([]),
      new InMemoryCheckInRepository([]),
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ habitId: "h1", passed: true }] }),
    ).rejects.toBeInstanceOf(CheckInNotFoundError);
  });

  it("rejects a mark against a habit the caller does not own", async () => {
    const checkIns = [
      CheckIn.create({
        id: "c1",
        userId: "user-1",
        date: LocalDate.create("2026-01-01"),
        marks: [{ habitId: "h1", passed: true }],
      }),
    ];
    const useCase = new EditCheckInUseCase(
      new InMemoryHabitRepository([]),
      new InMemoryCheckInRepository(checkIns),
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-01", marks: [{ habitId: "missing", passed: true }] }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });
});
