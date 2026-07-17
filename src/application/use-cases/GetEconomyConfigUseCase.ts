import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import {
  DEFAULT_ECONOMY_CONFIG,
  ECONOMY_CONFIG_BOUNDS,
  type EconomyConfig,
} from "@/domain/value-objects/EconomyConfig";

export interface EconomyConfigDTO {
  config: EconomyConfig;
  defaults: EconomyConfig;
  bounds: Record<string, { min: number; max: number; integer?: boolean }>;
}

/** Use Case: read the active economy constants for the dev panel. */
export class GetEconomyConfigUseCase {
  constructor(private readonly economyConfigRepository: EconomyConfigRepository) {}

  async execute(): Promise<EconomyConfigDTO> {
    const config = await this.economyConfigRepository.getEconomyConfig();
    return { config, defaults: DEFAULT_ECONOMY_CONFIG, bounds: ECONOMY_CONFIG_BOUNDS };
  }
}
