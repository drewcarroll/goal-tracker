import { describe, it, expect } from "vitest";
import { SendFriendRequestUseCase } from "./SendFriendRequestUseCase";
import { Friendship } from "../../domain/entities/Friendship";
import { FriendshipRepository } from "../../domain/repositories/FriendshipRepository";
import { UsernameRepository } from "../../domain/repositories/UsernameRepository";
import { Username } from "../../domain/value-objects/Username";
import { UserNotFoundError, FriendRequestAlreadyExistsError } from "../errors/ApplicationError";
import { ValidationError } from "../../domain/errors/DomainError";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

class InMemoryFriendshipRepository implements FriendshipRepository {
  public readonly saved: Friendship[] = [];
  async findById(id: string): Promise<Friendship | null> {
    return this.saved.find((f) => f.id === id) ?? null;
  }
  async findBetween(a: string, b: string): Promise<Friendship | null> {
    return (
      this.saved.find(
        (f) =>
          f.involves(a) &&
          f.involves(b) &&
          (f.status === "pending" || f.status === "accepted"),
      ) ?? null
    );
  }
  async findAccepted(userId: string): Promise<Friendship[]> {
    return this.saved.filter((f) => f.involves(userId) && f.status === "accepted");
  }
  async findPendingIncoming(userId: string): Promise<Friendship[]> {
    return this.saved.filter((f) => f.addresseeId === userId && f.status === "pending");
  }
  async findPendingOutgoing(userId: string): Promise<Friendship[]> {
    return this.saved.filter((f) => f.requesterId === userId && f.status === "pending");
  }
  async save(friendship: Friendship): Promise<void> {
    if (!this.saved.some((f) => f.id === friendship.id)) this.saved.push(friendship);
  }
}

class InMemoryUsernameRepository implements UsernameRepository {
  constructor(private readonly byUserId = new Map<string, Username>()) {}
  async register(userId: string, username: Username): Promise<void> {
    this.byUserId.set(userId, username);
  }
  async findUserIdByUsername(username: Username): Promise<string | null> {
    for (const [userId, u] of this.byUserId) if (u.equals(username)) return userId;
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

const fixedClock: Clock = { now: () => new Date("2026-01-01T00:00:00.000Z") };
const fixedIds: IdGenerator = { generate: () => "friendship-1" };

function buildUseCase(usernames: Record<string, string> = {}) {
  const byUserId = new Map(Object.entries(usernames).map(([id, name]) => [id, Username.create(name)]));
  const usernameRepository = new InMemoryUsernameRepository(byUserId);
  const friendshipRepository = new InMemoryFriendshipRepository();
  return {
    useCase: new SendFriendRequestUseCase(
      friendshipRepository,
      usernameRepository,
      fixedIds,
      fixedClock,
    ),
    friendshipRepository,
  };
}

describe("SendFriendRequestUseCase", () => {
  it("creates a pending request resolved to the target's userId", async () => {
    const { useCase, friendshipRepository } = buildUseCase({ "user-1": "drew", "user-2": "bob" });

    const result = await useCase.execute({ userId: "user-1", targetUsername: "bob" });

    expect(result.status).toBe("pending");
    expect(result.requesterId).toBe("user-1");
    expect(result.addresseeId).toBe("user-2");
    expect(result.requesterUsername).toBe("drew");
    expect(result.addresseeUsername).toBe("bob");
    expect(friendshipRepository.saved).toHaveLength(1);
  });

  it("rejects a username that has never logged in", async () => {
    const { useCase } = buildUseCase({ "user-1": "drew" });

    await expect(
      useCase.execute({ userId: "user-1", targetUsername: "ghost" }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("rejects requesting yourself", async () => {
    const { useCase } = buildUseCase({ "user-1": "drew" });

    await expect(
      useCase.execute({ userId: "user-1", targetUsername: "drew" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a duplicate open request", async () => {
    const { useCase } = buildUseCase({ "user-1": "drew", "user-2": "bob" });

    await useCase.execute({ userId: "user-1", targetUsername: "bob" });

    await expect(
      useCase.execute({ userId: "user-1", targetUsername: "bob" }),
    ).rejects.toBeInstanceOf(FriendRequestAlreadyExistsError);
  });
});
