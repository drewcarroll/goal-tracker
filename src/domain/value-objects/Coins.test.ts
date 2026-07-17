import { describe, it, expect } from "vitest";
import { Coins } from "./Coins";
import { ValidationError } from "../errors/DomainError";

describe("Coins", () => {
  it("creates a balance from a non-negative integer", () => {
    expect(Coins.of(100).toNumber()).toBe(100);
    expect(Coins.of(0).toNumber()).toBe(0);
  });

  it("rejects a negative or non-integer amount", () => {
    expect(() => Coins.of(-1)).toThrow(ValidationError);
    expect(() => Coins.of(1.5)).toThrow(ValidationError);
  });

  it("adds coins", () => {
    expect(Coins.of(100).add(50).toNumber()).toBe(150);
  });

  it("subtracts coins", () => {
    expect(Coins.of(100).subtract(50).toNumber()).toBe(50);
  });

  it("rejects subtracting more than the balance", () => {
    expect(() => Coins.of(100).subtract(150)).toThrow(ValidationError);
  });

  it("allows subtracting exactly the full balance", () => {
    expect(Coins.of(100).subtract(100).toNumber()).toBe(0);
  });

  it("canAfford reflects the balance without mutating it", () => {
    const coins = Coins.of(100);
    expect(coins.canAfford(100)).toBe(true);
    expect(coins.canAfford(101)).toBe(false);
    expect(coins.toNumber()).toBe(100);
  });
});
