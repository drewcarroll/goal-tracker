import type { SupabaseClient } from "@supabase/supabase-js";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import {
  lockFormulaConfigFrom,
  type LockFormulaConfig,
} from "@/domain/value-objects/LockFormulaConfig";

const APP_CONFIG_TABLE = "app_config";
const LOCK_FORMULA_KEY = "lock_formula";

/**
 * Supabase implementation of the ConfigRepository port. The stored row is a
 * (possibly partial) override; lockFormulaConfigFrom merges it over the
 * defaults and validates, so callers always get a complete config. No row =
 * pure defaults.
 */
export class SupabaseConfigRepository implements ConfigRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    const { data, error } = await this.client
      .from(APP_CONFIG_TABLE)
      .select("value")
      .eq("key", LOCK_FORMULA_KEY)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch lock formula config: ${error.message}`);
    }
    return lockFormulaConfigFrom(data?.value ?? null);
  }

  async saveLockFormulaConfig(config: LockFormulaConfig): Promise<void> {
    const { error } = await this.client.from(APP_CONFIG_TABLE).upsert(
      { key: LOCK_FORMULA_KEY, value: config, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) {
      throw new Error(`Failed to save lock formula config: ${error.message}`);
    }
  }

  async resetLockFormulaConfig(): Promise<void> {
    const { error } = await this.client
      .from(APP_CONFIG_TABLE)
      .delete()
      .eq("key", LOCK_FORMULA_KEY);
    if (error) {
      throw new Error(`Failed to reset lock formula config: ${error.message}`);
    }
  }
}
