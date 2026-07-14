export interface RankDTO {
  /** Cumulative on-time nightly logs. */
  points: number;
  /** 1-based rank (0 points → Rank 1). */
  rank: number;
  /** Points needed for the next rank, or null at the top rank. */
  nextThreshold: number | null;
  maxRank: number;
}

export interface GetRankDTO {
  userId: string;
}
