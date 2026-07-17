import { EconomyConfig } from "../value-objects/EconomyConfig";

/** Global (not per-user) economy configuration — sibling of ConfigRepository, same pattern. */
export interface EconomyConfigRepository {
  getEconomyConfig(): Promise<EconomyConfig>;
  saveEconomyConfig(config: EconomyConfig): Promise<void>;
  resetEconomyConfig(): Promise<void>;
}
