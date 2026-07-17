import { describe, it, expect } from "vitest";
import { GetActivityFeedUseCase } from "./GetActivityFeedUseCase";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { UsernameRepository } from "../../domain/repositories/UsernameRepository";
import { ActivityEventRepository, ActivityEvent } from "../../domain/repositories/ActivityEventRepository";
import { Friendship } from "../../domain/entities/Friendship";
import { Username } from "../../domain/value-objects/Username";

class InMemoryFriendshipRepository implements FriendshipRepository {
  constructor(private friendships: Friendship[] = []) {}
  async findById(id: string) {
    return this.friendships.find((f) => f.id === id) ?? null;
  }
  async findBetween(userIdA: string, userIdB: string) {
    return (
      this.friendships.find((f) => f.involves(userIdA) && f.involves(userIdB)) ?? null
    );
  }
  async findAccepted(userId: string) {
    return this.friendships.filter((f) => f.involves(userId) && f.status === "accepted");
  }
  async findPendingIncoming() {
    return [];
  }
  async findPendingOutgoing() {
    return [];
  }
  async save(friendship: Friendship) {
    this.friendships.push(friendship);
  }
}

class InMemoryUsernameRepository implements UsernameRepository {
  constructor(private usernames: Map<string, Username> = new Map()) {}
  async register(userId: string, username: Username) {
    this.usernames.set(userId, username);
  }
  async findUserIdByUsername() {
    return null;
  }
  async findUsernameByUserId(userId: string) {
    return this.usernames.get(userId) ?? null;
  }
  async findUsernamesByUserIds(userIds: readonly string[]) {
    const result = new Map<string, Username>();
    for (const id of userIds) {
      const username = this.usernames.get(id);
      if (username) result.set(id, username);
    }
    return result;
  }
}

class InMemoryActivityEventRepository implements ActivityEventRepository {
  constructor(private events: ActivityEvent[] = []) {}
  async record(event: ActivityEvent) {
    this.events.push(event);
  }
  async findForUsers(userIds: readonly string[], limit: number) {
    return this.events.filter((e) => userIds.includes(e.userId)).slice(0, limit);
  }
}

function acceptedFriendship(userA: string, userB: string): Friendship {
  const friendship = Friendship.request({ id: `f-${userA}-${userB}`, requesterId: userA, addresseeId: userB });
  friendship.accept();
  return friendship;
}

describe("GetActivityFeedUseCase", () => {
  it("returns only accepted friends' events, never the viewer's own", async () => {
    const friendshipRepo = new InMemoryFriendshipRepository([acceptedFriendship("me", "friend-1")]);
    const usernameRepo = new InMemoryUsernameRepository(
      new Map([["friend-1", Username.create("Ada")]]),
    );
    const activityRepo = new InMemoryActivityEventRepository([
      { userId: "friend-1", type: "battle_pass_claim", trinketId: "bp:2026-07:d25", occurredAt: new Date("2026-07-25") },
      { userId: "me", type: "shop_purchase", trinketId: "shop:common:01", occurredAt: new Date("2026-07-16") },
      { userId: "stranger", type: "shop_purchase", coins: 50, occurredAt: new Date("2026-07-16") },
    ]);
    const useCase = new GetActivityFeedUseCase(friendshipRepo, usernameRepo, activityRepo);

    const feed = await useCase.execute({ userId: "me" });

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      username: "ada",
      type: "battle_pass_claim",
      trinket: { id: "bp:2026-07:d25", emoji: "🗽" },
    });
  });

  it("returns an empty feed when the user has no accepted friends", async () => {
    const useCase = new GetActivityFeedUseCase(
      new InMemoryFriendshipRepository(),
      new InMemoryUsernameRepository(),
      new InMemoryActivityEventRepository(),
    );
    expect(await useCase.execute({ userId: "me" })).toEqual([]);
  });
});
