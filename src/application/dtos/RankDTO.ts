export interface RankDTO {
  /** Current rank, 1-based (a brand-new user is Rank 1). */
  rank: number;
  /** The rank the current climb leads to. */
  nextRank: number;
  /** Total XP earned (nightly logs × XP per log). */
  xp: number;
  /** XP earned toward the current rank-up. */
  xpIntoRank: number;
  /** Total XP the current rank-up requires. */
  xpForRankUp: number;
  /** XP granted per on-time nightly log (for "Submit +500 XP" UI). */
  xpPerLog: number;
}

export interface GetRankDTO {
  userId: string;
}
