import { describe, it, expect } from "vitest";
import { GetFriendCheckInLogUseCase } from "./GetFriendCheckInLogUseCase";
import { GoalPrivacyService } from "../../domain/services/GoalPrivacyService";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { Friendship } from "../../domain/entities/Friendship";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { NotFriendsError } from "../errors/ApplicationError";

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

class InMemoryFriendshipRepository implements FriendshipRepository {
  constructor(private readonly friendships: Friendship[]) {}
  async findById(id: string): Promise<Friendship | null> {
    return this.friendships.find((f) => f.id === id) ?? null;
  }
  async findBetween(a: string, b: string): Promise<Friendship | null> {
    return this.friendships.find((f) => f.involves(a) && f.involves(b)) ?? null;
  }
  async findAccepted(): Promise<Friendship[]> {
    return [];
  }
  async findPendingIncoming(): Promise<Friendship[]> {
    return [];
  }
  async findPendingOutgoing(): Promise<Friendship[]> {
    return [];
  }
  async save(): Promise<void> {}
}

function makeGoal(id: string, isPublic: boolean) {
  return Goal.create({
    id,
    userId: "u2",
    name: `Goal ${id}`,
    weeklyFrequencyTarget: 7,
    initialLockCost: 20,
    isPublic,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function checkIn(date: string, marks: { goalId: string; passed: boolean }[]) {
  return CheckIn.create({
    id: `c-${date}`,
    userId: "u2",
    date: LocalDate.create(date),
    marks,
    submittedOnTime: true,
  });
}

describe("GetFriendCheckInLogUseCase", () => {
  const accepted = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
  accepted.accept();

  it("strips private goal marks and keeps days with at least one public mark", async () => {
    const useCase = new GetFriendCheckInLogUseCase(
      new InMemoryGoalRepository([makeGoal("g1", true), makeGoal("g2", false)]),
      new InMemoryCheckInRepository([
        checkIn("2026-01-01", [
          { goalId: "g1", passed: true },
          { goalId: "g2", passed: false },
        ]),
      ]),
      new InMemoryFriendshipRepository([accepted]),
      new GoalPrivacyService(),
    );

    const result = await useCase.execute({ userId: "u1", friendUserId: "u2" });

    expect(result).toHaveLength(1);
    expect(result[0]!.marks).toEqual([{ goalId: "g1", passed: true }]);
  });

  it("drops a day entirely when every mark on it is private — never a redacted placeholder", async () => {
    const useCase = new GetFriendCheckInLogUseCase(
      new InMemoryGoalRepository([makeGoal("g2", false)]),
      new InMemoryCheckInRepository([checkIn("2026-01-01", [{ goalId: "g2", passed: true }])]),
      new InMemoryFriendshipRepository([accepted]),
      new GoalPrivacyService(),
    );

    const result = await useCase.execute({ userId: "u1", friendUserId: "u2" });

    expect(result).toEqual([]);
  });

  it("recomputes dayResult from PUBLIC marks only — never leaks a private goal's fail via the day's overall result", async () => {
    // Public goal passed; private goal failed. The day's TRUE dayResult
    // (computed from all marks, private included) would be FAIL — but the
    // friend must see PASS, since that's the true result of what they can see.
    const useCase = new GetFriendCheckInLogUseCase(
      new InMemoryGoalRepository([makeGoal("g1", true), makeGoal("g2", false)]),
      new InMemoryCheckInRepository([
        checkIn("2026-01-01", [
          { goalId: "g1", passed: true },
          { goalId: "g2", passed: false },
        ]),
      ]),
      new InMemoryFriendshipRepository([accepted]),
      new GoalPrivacyService(),
    );

    const result = await useCase.execute({ userId: "u1", friendUserId: "u2" });

    expect(result[0]!.dayResult).toBe("PASS");
  });

  it("rejects when not friends", async () => {
    const useCase = new GetFriendCheckInLogUseCase(
      new InMemoryGoalRepository([]),
      new InMemoryCheckInRepository([]),
      new InMemoryFriendshipRepository([]),
      new GoalPrivacyService(),
    );

    await expect(
      useCase.execute({ userId: "u1", friendUserId: "u2" }),
    ).rejects.toBeInstanceOf(NotFriendsError);
  });
});
