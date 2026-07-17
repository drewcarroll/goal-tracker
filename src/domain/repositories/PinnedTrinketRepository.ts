/**
 * Which of a user's owned trinkets they've chosen to showcase (Profile's
 * "display your trinkets" picker) and in what order. Capped by
 * EconomyConfig.maxPinnedTrinkets, enforced in the use case, not here.
 */
export interface PinnedTrinketRepository {
  /** Ordered trinket ids, first = first shown. */
  getPinned(userId: string): Promise<readonly string[]>;
  /** Replaces the full pinned set (order = display order). */
  setPinned(userId: string, trinketIds: readonly string[]): Promise<void>;
}
