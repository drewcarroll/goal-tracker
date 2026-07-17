import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { getTrinketById, trinketSource } from "@/domain/value-objects/TrinketCatalog";
import type { OwnedTrinketDTO } from "../dtos/TrinketCollectionDTO";

export interface GetTrinketCollectionDTO {
  userId: string;
}

/**
 * Use Case: a user's owned trinkets with quantity — NOT a collect-once
 * model, duplicates show as ownedQuantity > 1 (user decision, 2026-07-16).
 * Shared by "my collection" and, later, a friend's collection view.
 */
export class GetTrinketCollectionUseCase {
  constructor(private readonly trinketInventoryRepository: TrinketInventoryRepository) {}

  async execute(dto: GetTrinketCollectionDTO): Promise<OwnedTrinketDTO[]> {
    const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
    const owned: OwnedTrinketDTO[] = [];
    for (const [trinketId, quantity] of inventory) {
      const trinket = getTrinketById(trinketId);
      const source = trinketSource(trinketId);
      if (!trinket || source === "unknown") continue; // defensive; every stored id should resolve
      owned.push({ id: trinket.id, emoji: trinket.emoji, name: trinket.name, quantity, source });
    }
    return owned.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  }
}
