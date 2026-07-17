import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BattlePassClaim,
  BattlePassClaimRepository,
} from "@/domain/repositories/BattlePassClaimRepository";

const TABLE = "battle_pass_claims";

interface ClaimRow {
  user_id: string;
  date: string;
  reward_type: "coins" | "trinket";
  coins_awarded: number | null;
  trinket_id: string | null;
}

export class SupabaseBattlePassClaimRepository implements BattlePassClaimRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findClaimedDatesForMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<ReadonlySet<string>> {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const { data, error } = await this.client
      .from(TABLE)
      .select("date")
      .eq("user_id", userId)
      .gte("date", `${prefix}-01`)
      .lte("date", `${prefix}-31`);

    if (error) {
      throw new Error(`Failed to fetch battle-pass claims for user "${userId}": ${error.message}`);
    }
    return new Set((data as { date: string }[]).map((row) => row.date));
  }

  async hasClaimed(userId: string, date: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("user_id")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check battle-pass claim for user "${userId}": ${error.message}`);
    }
    return data !== null;
  }

  async save(claim: BattlePassClaim): Promise<void> {
    const row: ClaimRow = {
      user_id: claim.userId,
      date: claim.date,
      reward_type: claim.rewardType,
      coins_awarded: claim.coinsAwarded ?? null,
      trinket_id: claim.trinketId ?? null,
    };
    const { error } = await this.client.from(TABLE).insert(row);
    if (error) {
      throw new Error(`Failed to save battle-pass claim for user "${claim.userId}": ${error.message}`);
    }
  }
}
