import { describe, it, expect } from "vitest";
import { CreateHabitsFromOnboardingUseCase } from "./CreateHabitsFromOnboardingUseCase";
import { Habit } from "../../domain/entities/Habit";
import { HabitRepository } from "../../domain/repositories/HabitRepository";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

class InMemoryHabitRepository implements HabitRepository {
  public readonly saved: Habit[] = [];
  async findById(id: string): Promise<Habit | null> {
    return this.saved.find((h) => h.id === id) ?? null;
  }
  async findByUserId(userId: string): Promise<Habit[]> {
    return this.saved.filter((h) => h.userId === userId);
  }
  async save(habit: Habit): Promise<void> {
    this.saved.push(habit);
  }
}

const NOW = new Date("2026-01-20T00:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
let counter = 0;
const fixedIds: IdGenerator = { generate: () => `habit-${++counter}` };

describe("CreateHabitsFromOnboardingUseCase", () => {
  it("creates one habit per selection, each at its difficulty's starting cost", async () => {
    const repo = new InMemoryHabitRepository();
    const useCase = new CreateHabitsFromOnboardingUseCase(repo, fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      selections: [
        { catalogId: "exercise", difficulty: "easy" },
        { catalogId: "meditate", difficulty: "hard" },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ catalogId: "exercise", currentLockCost: 25, state: "active" });
    expect(result[1]).toMatchObject({ catalogId: "meditate", currentLockCost: 45, state: "active" });
    expect(repo.saved).toHaveLength(2);
    expect(repo.saved.every((h) => h.userId === "user-1")).toBe(true);
  });

  it("creates nothing for an empty selection list", async () => {
    const repo = new InMemoryHabitRepository();
    const useCase = new CreateHabitsFromOnboardingUseCase(repo, fixedIds, fixedClock);

    const result = await useCase.execute({ userId: "user-1", selections: [] });

    expect(result).toEqual([]);
    expect(repo.saved).toHaveLength(0);
  });
});
