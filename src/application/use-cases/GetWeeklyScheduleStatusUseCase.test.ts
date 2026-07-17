import { describe, it, expect } from "vitest";
import { GetWeeklyScheduleStatusUseCase } from "./GetWeeklyScheduleStatusUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";

class InMemoryGoalRepository implements GoalRepository {
  constructor(private goals: Goal[]) {}
  async findById(id: string) {
    return this.goals.find((g) => g.id === id) ?? null;
  }
  async findByUserId(userId: string) {
    return this.goals.filter((g) => g.userId === userId);
  }
  async save() {}
  async delete() {}
}

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private checkIns: CheckIn[]) {}
  async findByUserIdAndDate() {
    return null;
  }
  async findByUserId(userId: string) {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save() {}
  async delete() {}
}

function goal(id: string, weeklyFrequencyTarget: number) {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget,
    initialLockCost: 20,
    now: new Date("2026-07-13T00:00:00Z"),
  });
}

function passedCheckIn(goalId: string, date: string) {
  return CheckIn.create({
    id: `ci-${date}`,
    userId: "user-1",
    date: LocalDate.create(date),
    marks: [{ goalId, passed: true }],
    submittedOnTime: true,
  });
}

describe("GetWeeklyScheduleStatusUseCase", () => {
  // 2026-07-16 is a Thursday. Mon-Sun week = 07-13..07-19. Days remaining
  // from tomorrow (07-17) through Sunday (07-19) inclusive = 3.
  it("is on track when completed-so-far + days remaining can still reach the target", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 3)]);
    const checkIns = new InMemoryCheckInRepository([
      passedCheckIn("g1", "2026-07-13"),
      passedCheckIn("g1", "2026-07-14"),
    ]);
    const useCase = new GetWeeklyScheduleStatusUseCase(goals, checkIns);

    const [status] = await useCase.execute({ userId: "user-1", todayDate: "2026-07-16" });

    // completed=2, daysRemaining=3, target=3 -> 2+3=5 >= 3
    expect(status!.completedThisWeek).toBe(2);
    expect(status!.daysRemainingInWeek).toBe(3);
    expect(status!.onTrack).toBe(true);
  });

  it("is off track when the target is arithmetically unreachable", async () => {
    const goals = new InMemoryGoalRepository([goal("g1", 6)]);
    const checkIns = new InMemoryCheckInRepository([]); // 0 completed so far

    const useCase = new GetWeeklyScheduleStatusUseCase(goals, checkIns);
    const [status] = await useCase.execute({ userId: "user-1", todayDate: "2026-07-16" });

    // completed=0, daysRemaining=3, target=6 -> 0+3=3 < 6
    expect(status!.onTrack).toBe(false);
  });

  it("excludes paused goals", async () => {
    const paused = goal("g1", 3);
    paused.pause();
    const useCase = new GetWeeklyScheduleStatusUseCase(
      new InMemoryGoalRepository([paused]),
      new InMemoryCheckInRepository([]),
    );

    const result = await useCase.execute({ userId: "user-1", todayDate: "2026-07-16" });
    expect(result).toEqual([]);
  });
});
