import { describe, it, expect } from "vitest";
import { GetTodayPlanUseCase } from "./GetTodayPlanUseCase";
import { DailyPlan } from "../../domain/entities/DailyPlan";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { DailyPlanRepository } from "../../domain/repositories/DailyPlanRepository";

class InMemoryDailyPlanRepository implements DailyPlanRepository {
  constructor(private readonly plans: DailyPlan[]) {}
  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<DailyPlan | null> {
    return this.plans.find((p) => p.userId === userId && p.date.equals(date)) ?? null;
  }
  async save(): Promise<void> {}
}

describe("GetTodayPlanUseCase", () => {
  it("returns the plan for that user-local day", async () => {
    const plan = DailyPlan.create({
      id: "plan-1",
      userId: "user-1",
      date: LocalDate.create("2026-01-21"),
      habitIds: ["h1"],
      locksSpent: 25,
    });
    const useCase = new GetTodayPlanUseCase(new InMemoryDailyPlanRepository([plan]));

    const result = await useCase.execute({ userId: "user-1", date: "2026-01-21" });

    expect(result?.id).toBe("plan-1");
  });

  it("returns null when no plan exists for that day", async () => {
    const useCase = new GetTodayPlanUseCase(new InMemoryDailyPlanRepository([]));

    const result = await useCase.execute({ userId: "user-1", date: "2026-01-21" });

    expect(result).toBeNull();
  });
});
