import { PinnedTrinketRepository } from "@/domain/repositories/PinnedTrinketRepository";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { TooManyPinnedTrinketsError } from "../errors/ApplicationError";

export interface SetPinnedTrinketsDTO {
  userId: string;
  trinketIds: readonly string[];
}

/**
 * Use Case: choose which owned trinkets to showcase (Profile's Collection
 * section). Capped at EconomyConfig.maxPinnedTrinkets; silently drops any id
 * the user doesn't actually own rather than erroring, since that can only
 * happen from a stale client (e.g. a trinket sold/removed elsewhere) and
 * dropping it is harmless.
 */
export class SetPinnedTrinketsUseCase {
  constructor(
    private readonly pinnedTrinketRepository: PinnedTrinketRepository,
    private readonly trinketInventoryRepository: TrinketInventoryRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
  ) {}

  async execute(dto: SetPinnedTrinketsDTO): Promise<void> {
    const economyConfig = await this.economyConfigRepository.getEconomyConfig();
    if (dto.trinketIds.length > economyConfig.maxPinnedTrinkets) {
      throw new TooManyPinnedTrinketsError(economyConfig.maxPinnedTrinkets);
    }

    const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
    const owned = dto.trinketIds.filter((id) => (inventory.get(id)?.quantity ?? 0) > 0);

    await this.pinnedTrinketRepository.setPinned(dto.userId, owned);
  }
}
