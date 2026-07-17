import { describe, it, expect } from "vitest";
import { GetFriendPublicGoalsUseCase } from "./GetFriendPublicGoalsUseCase";
import { GoalPrivacyService } from "../../domain/services/GoalPrivacyService";
import { Goal } from "../../domain/entities/Goal";
import { Friendship } from "../../domain/entities/Friendship";
import { GoalRepository } from "../../domain/repositories/GoalRepository";
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

function makeGoal(id: string, userId: string, isPublic: boolean) {
  return Goal.create({
    id,
    userId,
    name: `Goal ${id}`,
    weeklyFrequencyTarget: 7,
    initialLockCost: 20,
    isPublic,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("GetFriendPublicGoalsUseCase", () => {
  it("returns only the friend's public goals", async () => {
    const accepted = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    accepted.accept();
    const useCase = new GetFriendPublicGoalsUseCase(
      new InMemoryGoalRepository([
        makeGoal("g1", "u2", true),
        makeGoal("g2", "u2", false),
        makeGoal("g3", "u1", true), // caller's own goal, irrelevant here
      ]),
      new InMemoryFriendshipRepository([accepted]),
      new GoalPrivacyService(),
    );

    const result = await useCase.execute({ userId: "u1", friendUserId: "u2" });

    expect(result.map((g) => g.id)).toEqual(["g1"]);
  });

  it("rejects when there is no accepted friendship", async () => {
    const pending = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    const useCase = new GetFriendPublicGoalsUseCase(
      new InMemoryGoalRepository([makeGoal("g1", "u2", true)]),
      new InMemoryFriendshipRepository([pending]),
      new GoalPrivacyService(),
    );

    await expect(
      useCase.execute({ userId: "u1", friendUserId: "u2" }),
    ).rejects.toBeInstanceOf(NotFriendsError);
  });

  it("rejects when there is no friendship at all", async () => {
    const useCase = new GetFriendPublicGoalsUseCase(
      new InMemoryGoalRepository([makeGoal("g1", "u2", true)]),
      new InMemoryFriendshipRepository([]),
      new GoalPrivacyService(),
    );

    await expect(
      useCase.execute({ userId: "u1", friendUserId: "u2" }),
    ).rejects.toBeInstanceOf(NotFriendsError);
  });
});
