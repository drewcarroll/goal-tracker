import type { SupabaseClient } from "@supabase/supabase-js";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { economyConfigFrom, type EconomyConfig } from "@/domain/value-objects/EconomyConfig";

const APP_CONFIG_TABLE = "app_config";
const ECONOMY_KEY = "economy";

/** Supabase implementation, same pattern as SupabaseConfigRepository — a partial override row, merged over defaults. */
export class SupabaseEconomyConfigRepository implements EconomyConfigRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getEconomyConfig(): Promise<EconomyConfig> {
    const { data, error } = await this.client
      .from(APP_CONFIG_TABLE)
      .select("value")
      .eq("key", ECONOMY_KEY)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch economy config: ${error.message}`);
    }
    return economyConfigFrom(data?.value ?? null);
  }

  async saveEconomyConfig(config: EconomyConfig): Promise<void> {
    const { error } = await this.client.from(APP_CONFIG_TABLE).upsert(
      { key: ECONOMY_KEY, value: config, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) {
      throw new Error(`Failed to save economy config: ${error.message}`);
    }
  }

  async resetEconomyConfig(): Promise<void> {
    const { error } = await this.client.from(APP_CONFIG_TABLE).delete().eq("key", ECONOMY_KEY);
    if (error) {
      throw new Error(`Failed to reset economy config: ${error.message}`);
    }
  }
}
