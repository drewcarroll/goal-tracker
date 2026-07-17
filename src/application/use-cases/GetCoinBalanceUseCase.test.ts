import { describe, it, expect } from "vitest";
import { GetCoinBalanceUseCase } from "./GetCoinBalanceUseCase";
import { CoinWalletRepository } from "../../domain/repositories/CoinWalletRepository";

class InMemoryCoinWalletRepository implements CoinWalletRepository {
  constructor(private balances: Record<string, number> = {}) {}
  async getBalance(userId: string): Promise<number> {
    return this.balances[userId] ?? 0;
  }
  async adjustBalance(userId: string, delta: number): Promise<number> {
    const next = (this.balances[userId] ?? 0) + delta;
    if (next < 0) throw new Error("insufficient coin balance");
    this.balances[userId] = next;
    return next;
  }
}

describe("GetCoinBalanceUseCase", () => {
  it("returns the stored balance", async () => {
    const useCase = new GetCoinBalanceUseCase(
      new InMemoryCoinWalletRepository({ "user-1": 250 }),
    );

    expect(await useCase.execute({ userId: "user-1" })).toBe(250);
  });

  it("returns 0 for a user with no wallet row yet", async () => {
    const useCase = new GetCoinBalanceUseCase(new InMemoryCoinWalletRepository());

    expect(await useCase.execute({ userId: "user-1" })).toBe(0);
  });
});
