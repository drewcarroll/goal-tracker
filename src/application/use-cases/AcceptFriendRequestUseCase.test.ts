import { describe, it, expect } from "vitest";
import { AcceptFriendRequestUseCase } from "./AcceptFriendRequestUseCase";
import { Friendship } from "../../domain/entities/Friendship";
import { Username } from "../../domain/value-objects/Username";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { UsernameRepository } from "../../domain/repositories/UsernameRepository";
import { FriendshipNotFoundError } from "../errors/ApplicationError";
import { Clock } from "../ports/Clock";

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

class InMemoryUsernameRepository implements UsernameRepository {
  constructor(private readonly byUserId: Map<string, Username>) {}
  async register(): Promise<void> {}
  async findUserIdByUsername(): Promise<string | null> {
    return null;
  }
  async findUsernameByUserId(userId: string): Promise<Username | null> {
    return this.byUserId.get(userId) ?? null;
  }
  async findUsernamesByUserIds(userIds: readonly string[]): Promise<Map<string, Username>> {
    const result = new Map<string, Username>();
    for (const id of userIds) {
      const u = this.byUserId.get(id);
      if (u) result.set(id, u);
    }
    return result;
  }
}

const fixedClock: Clock = { now: () => new Date("2026-01-02T00:00:00.000Z") };

describe("AcceptFriendRequestUseCase", () => {
  it("accepts a pending request addressed to the caller", async () => {
    const friendship = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    const useCase = new AcceptFriendRequestUseCase(
      new InMemoryFriendshipRepository([friendship]),
      new InMemoryUsernameRepository(
        new Map([
          ["u1", Username.create("drew")],
          ["u2", Username.create("bob")],
        ]),
      ),
      fixedClock,
    );

    const result = await useCase.execute({ userId: "u2", friendshipId: "f1" });

    expect(result.status).toBe("accepted");
    expect(friendship.status).toBe("accepted");
  });

  it("rejects when the caller is not the addressee", async () => {
    const friendship = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    const useCase = new AcceptFriendRequestUseCase(
      new InMemoryFriendshipRepository([friendship]),
      new InMemoryUsernameRepository(new Map()),
      fixedClock,
    );

    // The requester trying to accept their own outgoing request.
    await expect(
      useCase.execute({ userId: "u1", friendshipId: "f1" }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });

  it("rejects a missing friendship", async () => {
    const useCase = new AcceptFriendRequestUseCase(
      new InMemoryFriendshipRepository([]),
      new InMemoryUsernameRepository(new Map()),
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "u2", friendshipId: "missing" }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });
});
