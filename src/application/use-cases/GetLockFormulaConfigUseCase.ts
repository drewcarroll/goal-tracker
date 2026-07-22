import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  LOCK_FORMULA_BOUNDS,
  type LockFormulaConfig,
} from "@/domain/value-objects/LockFormulaConfig";

export interface LockFormulaConfigDTO {
  /** The currently-active config (stored override merged over defaults). */
  config: LockFormulaConfig;
  /** The shipped defaults, for the dev panel's reset/comparison display. */
  defaults: LockFormulaConfig;
  /** Validation ranges + explanations per dotted path, for the dev panel. */
  bounds: Record<string, { min: number; max: number; integer?: boolean; description: string }>;
}

/** Use Case: read the active lock-formula constants for the dev panel. */
export class GetLockFormulaConfigUseCase {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(): Promise<LockFormulaConfigDTO> {
    const config = await this.configRepository.getLockFormulaConfig();
    return {
      config,
      defaults: DEFAULT_LOCK_FORMULA_CONFIG,
      bounds: LOCK_FORMULA_BOUNDS,
    };
  }
}
