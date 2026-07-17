import type { SupabaseClient } from "@supabase/supabase-js";
import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";

const WALLETS_TABLE = "coin_wallets";

export class SupabaseCoinWalletRepository implements CoinWalletRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getBalance(userId: string): Promise<number> {
    const { data, error } = await this.client
      .from(WALLETS_TABLE)
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch wallet for user "${userId}": ${error.message}`);
    }
    return (data as { balance: number } | null)?.balance ?? 0;
  }

  async adjustBalance(userId: string, delta: number): Promise<number> {
    const { data, error } = await this.client.rpc("increment_wallet_balance", {
      p_user_id: userId,
      p_delta: delta,
    });
    if (error) {
      throw new Error(`Failed to adjust wallet for user "${userId}": ${error.message}`);
    }
    return data as number;
  }
}
