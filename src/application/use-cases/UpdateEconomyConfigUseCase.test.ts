import { describe, it, expect } from "vitest";
import { UpdateEconomyConfigUseCase } from "./UpdateEconomyConfigUseCase";
import { GetEconomyConfigUseCase } from "./GetEconomyConfigUseCase";
import { ResetEconomyConfigUseCase } from "./ResetEconomyConfigUseCase";
import { EconomyConfigRepository } from "../../domain/repositories/EconomyConfigRepository";
import {
  DEFAULT_ECONOMY_CONFIG,
  economyConfigFrom,
  type EconomyConfig,
} from "../../domain/value-objects/EconomyConfig";
import { ValidationError } from "../../domain/errors/DomainError";

class InMemoryEconomyConfigRepository implements EconomyConfigRepository {
  public stored: EconomyConfig | null = null;
  async getEconomyConfig(): Promise<EconomyConfig> {
    return this.stored ?? economyConfigFrom(null);
  }
  async saveEconomyConfig(config: EconomyConfig): Promise<void> {
    this.stored = config;
  }
  async resetEconomyConfig(): Promise<void> {
    this.stored = null;
  }
}

describe("economy config use cases", () => {
  it("saves a partial override merged over defaults", async () => {
    const repo = new InMemoryEconomyConfigRepository();
    const saved = await new UpdateEconomyConfigUseCase(repo).execute({
      config: { mysteryBoxPrice: 300 },
    });

    expect(saved.mysteryBoxPrice).toBe(300);
    expect(saved.coinsLowAmount).toBe(DEFAULT_ECONOMY_CONFIG.coinsLowAmount);
    expect(repo.stored?.mysteryBoxPrice).toBe(300);
  });

  it("rejects out-of-range constants without saving", async () => {
    const repo = new InMemoryEconomyConfigRepository();

    await expect(
      new UpdateEconomyConfigUseCase(repo).execute({ config: { coinsHighProbability: 5 } }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.stored).toBeNull();
  });

  it("get returns the active config plus defaults and bounds for the dev panel", async () => {
    const repo = new InMemoryEconomyConfigRepository();
    await new UpdateEconomyConfigUseCase(repo).execute({ config: { maxPinnedTrinkets: 10 } });

    const result = await new GetEconomyConfigUseCase(repo).execute();

    expect(result.config.maxPinnedTrinkets).toBe(10);
    expect(result.defaults).toEqual(DEFAULT_ECONOMY_CONFIG);
    expect(result.bounds["mysteryBoxPrice"]).toMatchObject({ min: 10, max: 5000 });
  });

  it("reset drops the override so defaults apply again", async () => {
    const repo = new InMemoryEconomyConfigRepository();
    await new UpdateEconomyConfigUseCase(repo).execute({ config: { mysteryBoxPrice: 999 } });

    const result = await new ResetEconomyConfigUseCase(repo).execute();

    expect(result).toEqual(DEFAULT_ECONOMY_CONFIG);
    expect(repo.stored).toBeNull();
  });
});
