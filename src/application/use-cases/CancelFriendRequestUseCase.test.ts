import { describe, it, expect } from "vitest";
import { CancelFriendRequestUseCase } from "./CancelFriendRequestUseCase";
import { Friendship } from "../../domain/entities/Friendship";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { FriendshipNotFoundError } from "../errors/ApplicationError";
import { Clock } from "../ports/Clock";

class InMemoryFriendshipRepository implements FriendshipRepository {
  constructor(private readonly friendships: Friendship[]) {}
  async findById(id: string): Promise<Friendship | null> {
    return this.friendships.find((f) => f.id === id) ?? null;
  }
  async findBetween(): Promise<Friendship | null> {
    return null;
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

const fixedClock: Clock = { now: () => new Date("2026-01-02T00:00:00.000Z") };

describe("CancelFriendRequestUseCase", () => {
  it("cancels the caller's own pending request", async () => {
    const friendship = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    const useCase = new CancelFriendRequestUseCase(
      new InMemoryFriendshipRepository([friendship]),
      fixedClock,
    );

    await useCase.execute({ userId: "u1", friendshipId: "f1" });

    expect(friendship.status).toBe("cancelled");
  });

  it("rejects when the caller is not the requester", async () => {
    const friendship = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    const useCase = new CancelFriendRequestUseCase(
      new InMemoryFriendshipRepository([friendship]),
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "u2", friendshipId: "f1" }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });
});
