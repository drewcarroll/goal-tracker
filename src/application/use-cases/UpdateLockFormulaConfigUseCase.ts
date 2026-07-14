import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import {
  lockFormulaConfigFrom,
  type LockFormulaConfig,
} from "@/domain/value-objects/LockFormulaConfig";

/**
 * Use Case: save dev-tweaked lock-formula constants. Input may be partial —
 * missing fields fall back to defaults — and is validated against
 * LOCK_FORMULA_BOUNDS before persisting. NOTE: because every cost is a
 * full-history replay, saving here rewrites all trajectories retroactively;
 * stored goal costs refresh on their next recompute (or via
 * RecomputeAllGoalsUseCase).
 */
export class UpdateLockFormulaConfigUseCase {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(dto: { config: unknown }): Promise<LockFormulaConfig> {
    const config = lockFormulaConfigFrom(dto.config);
    await this.configRepository.saveLockFormulaConfig(config);
    return config;
  }
}
