import { describe, it, expect } from "vitest";
import { GetPendingFriendRequestsUseCase } from "./GetPendingFriendRequestsUseCase";
import { Friendship } from "../../domain/entities/Friendship";
import { Username } from "../../domain/value-objects/Username";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { UsernameRepository } from "../../domain/repositories/UsernameRepository";

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
  async findPendingIncoming(userId: string): Promise<Friendship[]> {
    return this.friendships.filter((f) => f.addresseeId === userId && f.status === "pending");
  }
  async findPendingOutgoing(userId: string): Promise<Friendship[]> {
    return this.friendships.filter((f) => f.requesterId === userId && f.status === "pending");
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

describe("GetPendingFriendRequestsUseCase", () => {
  it("separates incoming from outgoing requests", async () => {
    const incoming = Friendship.request({ id: "f1", requesterId: "u2", addresseeId: "u1" });
    const outgoing = Friendship.request({ id: "f2", requesterId: "u1", addresseeId: "u3" });

    const useCase = new GetPendingFriendRequestsUseCase(
      new InMemoryFriendshipRepository([incoming, outgoing]),
      new InMemoryUsernameRepository(
        new Map([
          ["u2", Username.create("bob")],
          ["u3", Username.create("carol")],
        ]),
      ),
    );

    const result = await useCase.execute({ userId: "u1" });

    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0]!.requesterUsername).toBe("bob");
    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0]!.addresseeUsername).toBe("carol");
  });
});
