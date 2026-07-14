import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "@/domain/value-objects/LockFormulaConfig";

/** Use Case: drop the stored override so the shipped defaults apply again. */
export class ResetLockFormulaConfigUseCase {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(): Promise<LockFormulaConfig> {
    await this.configRepository.resetLockFormulaConfig();
    return DEFAULT_LOCK_FORMULA_CONFIG;
  }
}
