import { ValidationError } from "../errors/DomainError";

/**
 * A non-negative coin balance. Wraps the "can't spend what you don't have"
 * invariant in one place so purchase/claim use cases don't each reimplement
 * the check — mirrors how other value objects in this codebase (e.g.
 * Username) own a single small rule rather than scattering it.
 */
export class Coins {
  private constructor(private readonly value: number) {}

  static of(amount: number): Coins {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new ValidationError("Coin balance must be a non-negative integer.");
    }
    return new Coins(amount);
  }

  add(amount: number): Coins {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new ValidationError("Can only add a non-negative integer amount of coins.");
    }
    return Coins.of(this.value + amount);
  }

  /** Throws if `amount` would take the balance below zero. */
  subtract(amount: number): Coins {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new ValidationError("Can only subtract a non-negative integer amount of coins.");
    }
    if (amount > this.value) {
      throw new ValidationError(`Not enough coins: have ${this.value}, need ${amount}.`);
    }
    return Coins.of(this.value - amount);
  }

  canAfford(amount: number): boolean {
    return amount <= this.value;
  }

  toNumber(): number {
    return this.value;
  }
}
