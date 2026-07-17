import { ValidationError } from "../errors/DomainError";

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

/**
 * Pure, dependency-free deterministic randomness — the same seed always
 * produces the same result. Domain can't use Node's `crypto` (zero
 * third-party/native deps allowed, per src/domain/CLAUDE.md), unlike
 * `usernameToUserId` in interfaces/, which this is the domain-safe
 * equivalent of. Shared by the battle pass's daily coin roll and the shop's
 * daily 5-slot roll — both need "always the same result for the same day/
 * user" without a stored row recording what was rolled.
 */
export class DeterministicRewardService {
  /**
   * A stable value in [0, 1) derived from `seed`, via a 32-bit FNV-1a hash
   * with a Murmur3-style finalizer. The finalizer matters: plain FNV-1a's
   * last operation is a single XOR+multiply, so seeds that differ only in
   * their final character (e.g. "shop:2026-07-16:0" vs "...:1", the exact
   * shape of a per-slot seed) don't fully avalanche and can land in the
   * same weighted bucket — this produced real duplicate shop-slot rolls
   * before the finalizer was added (2026-07-17).
   */
  hash01(seed: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 0xffffffff;
  }

  /** Picks one option, weighted, deterministically from `seed`. */
  weightedPick<T>(seed: string, options: readonly WeightedOption<T>[]): T {
    if (options.length === 0) {
      throw new ValidationError("weightedPick requires at least one option.");
    }
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    if (total <= 0) {
      throw new ValidationError("weightedPick requires a positive total weight.");
    }
    const roll = this.hash01(seed) * total;
    let cumulative = 0;
    for (const option of options) {
      cumulative += option.weight;
      if (roll < cumulative) return option.value;
    }
    return options[options.length - 1]!.value; // floating-point safety net
  }
}
