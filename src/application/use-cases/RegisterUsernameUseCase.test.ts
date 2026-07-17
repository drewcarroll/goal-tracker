import { describe, it, expect } from "vitest";
import { RegisterUsernameUseCase } from "./RegisterUsernameUseCase";
import { UsernameRepository } from "../../domain/repositories/UsernameRepository";
import { Username } from "../../domain/value-objects/Username";
import { ValidationError } from "../../domain/errors/DomainError";

class InMemoryUsernameRepository implements UsernameRepository {
  public readonly byUserId = new Map<string, Username>();

  async register(userId: string, username: Username): Promise<void> {
    this.byUserId.set(userId, username);
  }
  async findUserIdByUsername(username: Username): Promise<string | null> {
    for (const [userId, u] of this.byUserId) {
      if (u.equals(username)) return userId;
    }
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

describe("RegisterUsernameUseCase", () => {
  it("registers a normalized username for a userId", async () => {
    const repo = new InMemoryUsernameRepository();
    const useCase = new RegisterUsernameUseCase(repo);

    await useCase.execute({ userId: "user-1", username: "  DrewTest  " });

    expect(repo.byUserId.get("user-1")?.toString()).toBe("drewtest");
  });

  it("re-registering the same user overwrites rather than duplicating", async () => {
    const repo = new InMemoryUsernameRepository();
    const useCase = new RegisterUsernameUseCase(repo);

    await useCase.execute({ userId: "user-1", username: "drew" });
    await useCase.execute({ userId: "user-1", username: "drew" });

    expect(repo.byUserId.size).toBe(1);
  });

  it("rejects an empty username", async () => {
    const useCase = new RegisterUsernameUseCase(new InMemoryUsernameRepository());

    await expect(useCase.execute({ userId: "user-1", username: "" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
