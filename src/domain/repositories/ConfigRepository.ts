import { LockFormulaConfig } from "../value-objects/LockFormulaConfig";

/**
 * Global (not per-user) app configuration. Implementations merge the stored
 * override with DEFAULT_LOCK_FORMULA_CONFIG (via lockFormulaConfigFrom), so
 * getLockFormulaConfig always returns a complete, validated config.
 */
export interface ConfigRepository {
  getLockFormulaConfig(): Promise<LockFormulaConfig>;
  saveLockFormulaConfig(config: LockFormulaConfig): Promise<void>;
  /** Remove the stored override so defaults apply again. */
  resetLockFormulaConfig(): Promise<void>;
}
