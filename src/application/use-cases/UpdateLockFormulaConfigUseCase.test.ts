import { describe, it, expect } from "vitest";
import { UpdateLockFormulaConfigUseCase } from "./UpdateLockFormulaConfigUseCase";
import { GetLockFormulaConfigUseCase } from "./GetLockFormulaConfigUseCase";
import { ResetLockFormulaConfigUseCase } from "./ResetLockFormulaConfigUseCase";
import { ConfigRepository } from "../../domain/repositories/ConfigRepository";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  lockFormulaConfigFrom,
  type LockFormulaConfig,
} from "../../domain/value-objects/LockFormulaConfig";
import { ValidationError } from "../../domain/errors/DomainError";

class InMemoryConfigRepository implements ConfigRepository {
  public stored: LockFormulaConfig | null = null;
  async getLockFormulaConfig(): Promise<LockFormulaConfig> {
    return this.stored ?? lockFormulaConfigFrom(null);
  }
  async saveLockFormulaConfig(config: LockFormulaConfig): Promise<void> {
    this.stored = config;
  }
  async resetLockFormulaConfig(): Promise<void> {
    this.stored = null;
  }
}

describe("lock formula config use cases", () => {
  it("saves a partial override merged over defaults", async () => {
    const repo = new InMemoryConfigRepository();
    const saved = await new UpdateLockFormulaConfigUseCase(repo).execute({
      config: { gainRate: 0.1 },
    });

    expect(saved.gainRate).toBe(0.1);
    expect(saved.lossAversion).toBe(DEFAULT_LOCK_FORMULA_CONFIG.lossAversion);
    expect(repo.stored?.gainRate).toBe(0.1);
  });

  it("rejects out-of-range constants without saving", async () => {
    const repo = new InMemoryConfigRepository();

    await expect(
      new UpdateLockFormulaConfigUseCase(repo).execute({ config: { gainRate: 99 } }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.stored).toBeNull();
  });

  it("get returns the active config plus defaults and bounds for the dev panel", async () => {
    const repo = new InMemoryConfigRepository();
    await new UpdateLockFormulaConfigUseCase(repo).execute({ config: { lossAversion: 2.5 } });

    const result = await new GetLockFormulaConfigUseCase(repo).execute();

    expect(result.config.lossAversion).toBe(2.5);
    expect(result.defaults).toEqual(DEFAULT_LOCK_FORMULA_CONFIG);
    expect(result.bounds["gainRate"]).toMatchObject({ min: 0.01, max: 0.25 });
  });

  it("reset drops the override so defaults apply again", async () => {
    const repo = new InMemoryConfigRepository();
    await new UpdateLockFormulaConfigUseCase(repo).execute({ config: { gainRate: 0.2 } });

    const result = await new ResetLockFormulaConfigUseCase(repo).execute();

    expect(result).toEqual(DEFAULT_LOCK_FORMULA_CONFIG);
    expect(repo.stored).toBeNull();
    expect((await new GetLockFormulaConfigUseCase(repo).execute()).config).toEqual(
      DEFAULT_LOCK_FORMULA_CONFIG,
    );
  });
});
