import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { economyConfigFrom, type EconomyConfig } from "@/domain/value-objects/EconomyConfig";

/** Use Case: save dev-tweaked economy constants. Input may be partial — missing fields fall back to defaults. */
export class UpdateEconomyConfigUseCase {
  constructor(private readonly economyConfigRepository: EconomyConfigRepository) {}

  async execute(dto: { config: unknown }): Promise<EconomyConfig> {
    const config = economyConfigFrom(dto.config);
    await this.economyConfigRepository.saveEconomyConfig(config);
    return config;
  }
}
