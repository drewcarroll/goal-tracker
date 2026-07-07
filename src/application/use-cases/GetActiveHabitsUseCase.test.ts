import { describe, it, expect } from "vitest";
import { GetActiveHabitsUseCase } from "./GetActiveHabitsUseCase";
import { Habit } from "../../domain/entities/Habit";
import { HabitRepository } from "../../domain/repositories/HabitRepository";

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

describe("GetActiveHabitsUseCase", () => {
  it("returns only the caller's habits", async () => {
    const useCase = new GetActiveHabitsUseCase(
      new InMemoryHabitRepository([habit("h1", "user-1"), habit("h2", "user-2")]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("h1");
  });

  it("excludes paused habits", async () => {
    const paused = habit("h1", "user-1");
    paused.pause();
    const active = habit("h2", "user-1");

    const useCase = new GetActiveHabitsUseCase(new InMemoryHabitRepository([paused, active]));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("h2");
  });
});
