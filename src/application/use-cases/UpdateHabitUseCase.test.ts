import { describe, it, expect } from "vitest";
import { UpdateHabitUseCase } from "./UpdateHabitUseCase";
import { Habit } from "../../domain/entities/Habit";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
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

const NOW = new Date("2026-01-20T00:00:00.000Z");

function habit(id: string, userId: string) {
  return Habit.create({ id, userId, catalogId: "exercise", difficulty: "medium", now: NOW });
}

describe("UpdateHabitUseCase", () => {
  it("pauses an active habit", async () => {
    const useCase = new UpdateHabitUseCase(
      new InMemoryHabitRepository([habit("h1", "user-1")]),
    );

    const result = await useCase.execute({ userId: "user-1", habitId: "h1", action: "pause" });

    expect(result.state).toBe("paused");
  });

  it("resumes a paused habit", async () => {
    const h = habit("h1", "user-1");
    h.pause();
    const useCase = new UpdateHabitUseCase(new InMemoryHabitRepository([h]));

    const result = await useCase.execute({ userId: "user-1", habitId: "h1", action: "resume" });

    expect(result.state).toBe("active");
  });

  it("rejects mutating a habit the caller does not own", async () => {
    const useCase = new UpdateHabitUseCase(
      new InMemoryHabitRepository([habit("h1", "user-1")]),
    );

    await expect(
      useCase.execute({ userId: "intruder", habitId: "h1", action: "pause" }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });

  it("rejects mutating a missing habit", async () => {
    const useCase = new UpdateHabitUseCase(new InMemoryHabitRepository([]));

    await expect(
      useCase.execute({ userId: "user-1", habitId: "missing", action: "pause" }),
    ).rejects.toBeInstanceOf(HabitNotFoundError);
  });
});
