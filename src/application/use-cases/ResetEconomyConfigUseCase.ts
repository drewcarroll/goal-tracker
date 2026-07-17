import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { DEFAULT_ECONOMY_CONFIG, type EconomyConfig } from "@/domain/value-objects/EconomyConfig";

/** Use Case: drop the stored economy override so the shipped defaults apply again. */
export class ResetEconomyConfigUseCase {
  constructor(private readonly economyConfigRepository: EconomyConfigRepository) {}

  async execute(): Promise<EconomyConfig> {
    await this.economyConfigRepository.resetEconomyConfig();
    return DEFAULT_ECONOMY_CONFIG;
  }
}
