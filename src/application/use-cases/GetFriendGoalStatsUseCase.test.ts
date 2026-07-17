import { describe, it, expect } from "vitest";
import { GetFriendGoalStatsUseCase } from "./GetFriendGoalStatsUseCase";
import { Goal } from "../../domain/entities/Goal";
import { CheckIn } from "../../domain/entities/CheckIn";
import { Friendship } from "../../domain/entities/Friendship";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";
import { GoalNotFoundError } from "../errors/ApplicationError";

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

class InMemoryConfigRepository implements ConfigRepository {
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
  async saveLockFormulaConfig(): Promise<void> {}
  async resetLockFormulaConfig(): Promise<void> {}
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
    name: "Exercise",
    weeklyFrequencyTarget: 7,
    initialLockCost: 20,
    isPublic,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("GetFriendGoalStatsUseCase", () => {
  const accepted = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
  accepted.accept();

  it("returns stats for a friend's public goal", async () => {
    const useCase = new GetFriendGoalStatsUseCase(
      new InMemoryGoalRepository([makeGoal("g1", true)]),
      new InMemoryCheckInRepository([]),
      new InMemoryConfigRepository(),
      new InMemoryFriendshipRepository([accepted]),
    );

    const result = await useCase.execute({
      userId: "u1",
      friendUserId: "u2",
      goalId: "g1",
      today: "2026-01-01",
    });

    expect(result.label).toBe("Exercise");
  });

  it("treats a PRIVATE goal identically to a nonexistent one", async () => {
    const useCase = new GetFriendGoalStatsUseCase(
      new InMemoryGoalRepository([makeGoal("g1", false)]),
      new InMemoryCheckInRepository([]),
      new InMemoryConfigRepository(),
      new InMemoryFriendshipRepository([accepted]),
    );

    await expect(
      useCase.execute({ userId: "u1", friendUserId: "u2", goalId: "g1", today: "2026-01-01" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it("rejects without an accepted friendship, even for a public goal", async () => {
    const useCase = new GetFriendGoalStatsUseCase(
      new InMemoryGoalRepository([makeGoal("g1", true)]),
      new InMemoryCheckInRepository([]),
      new InMemoryConfigRepository(),
      new InMemoryFriendshipRepository([]),
    );

    await expect(
      useCase.execute({ userId: "u1", friendUserId: "u2", goalId: "g1", today: "2026-01-01" }),
    ).rejects.toBeInstanceOf(GoalNotFoundError);
  });
});
