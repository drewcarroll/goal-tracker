import { describe, it, expect } from "vitest";
import { GetFriendsListUseCase } from "./GetFriendsListUseCase";
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
  async findAccepted(userId: string): Promise<Friendship[]> {
    return this.friendships.filter((f) => f.involves(userId) && f.status === "accepted");
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

describe("GetFriendsListUseCase", () => {
  it("returns accepted friends with usernames resolved, regardless of who requested", async () => {
    const iRequested = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
    iRequested.accept();
    const theyRequested = Friendship.request({ id: "f2", requesterId: "u3", addresseeId: "u1" });
    theyRequested.accept();
    const stillPending = Friendship.request({ id: "f3", requesterId: "u1", addresseeId: "u4" });

    const useCase = new GetFriendsListUseCase(
      new InMemoryFriendshipRepository([iRequested, theyRequested, stillPending]),
      new InMemoryUsernameRepository(
        new Map([
          ["u2", Username.create("bob")],
          ["u3", Username.create("carol")],
        ]),
      ),
    );

    const result = await useCase.execute({ userId: "u1" });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.username).sort()).toEqual(["bob", "carol"]);
  });
});
