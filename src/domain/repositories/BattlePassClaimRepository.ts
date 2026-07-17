export interface BattlePassClaim {
  userId: string;
  date: string;
  rewardType: "coins" | "trinket";
  coinsAwarded?: number;
  trinketId?: string;
}

/**
 * One row per (user, calendar day) claim — the idempotency guard that
 * prevents double-claiming a day (unique on user_id+date, see schema.sql).
 */
export interface BattlePassClaimRepository {
  /** The set of already-claimed dates ("YYYY-MM-DD") for a user within a given month. */
  findClaimedDatesForMonth(userId: string, year: number, month: number): Promise<ReadonlySet<string>>;
  hasClaimed(userId: string, date: string): Promise<boolean>;
  save(claim: BattlePassClaim): Promise<void>;
}
