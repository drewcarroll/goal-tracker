import { ShopPurchaseRepository } from "@/domain/repositories/ShopPurchaseRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { ActivityEventRepository } from "@/domain/repositories/ActivityEventRepository";
import { MysteryBoxRollService } from "@/domain/services/MysteryBoxRollService";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";
import { InsufficientCoinsError } from "../errors/ApplicationError";
import type { OpenMysteryBoxDTO, OpenMysteryBoxResultDTO } from "../dtos/MysteryBoxDTO";

/**
 * Use Case: open one mystery box (replaces the old daily 5-slot shop
 * rotation, 2026-07-21 — `GetShopOfferUseCase`/`PurchaseShopSlotUseCase`).
 * Every open is a fresh, independent roll seeded off a new id — no daily
 * limit, no fixed slots, bounded only by coin balance (a deliberate default;
 * nothing in the request called for a limit). Not collect-once: duplicates
 * are expected and are exactly what levels a trinket up (see Collection's
 * level badge, which is just the owned quantity).
 */
export class OpenMysteryBoxUseCase {
  constructor(
    private readonly shopPurchaseRepository: ShopPurchaseRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
    private readonly coinWalletRepository: CoinWalletRepository,
    private readonly trinketInventoryRepository: TrinketInventoryRepository,
    private readonly activityEventRepository: ActivityEventRepository,
    private readonly rollService: MysteryBoxRollService,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: OpenMysteryBoxDTO): Promise<OpenMysteryBoxResultDTO> {
    const economyConfig = await this.economyConfigRepository.getEconomyConfig();
    const price = economyConfig.mysteryBoxPrice;

    const balance = await this.coinWalletRepository.getBalance(dto.userId);
    if (balance < price) {
      throw new InsufficientCoinsError();
    }

    const trinket = this.rollService.roll({ seed: this.idGenerator.generate(), economyConfig });

    await this.shopPurchaseRepository.save({
      userId: dto.userId,
      trinketId: trinket.id,
      pricePaid: price,
    });
    const newBalance = await this.coinWalletRepository.adjustBalance(dto.userId, -price);
    await this.trinketInventoryRepository.incrementQuantity(dto.userId, trinket.id, 1);
    const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
    await this.activityEventRepository.record({
      userId: dto.userId,
      type: "shop_purchase",
      trinketId: trinket.id,
      occurredAt: this.clock.now(),
    });

    return {
      trinket: { id: trinket.id, emoji: trinket.emoji, name: trinket.name, rarity: trinket.rarity },
      quantity: inventory.get(trinket.id)?.quantity ?? 1,
      balance: newBalance,
    };
  }
}
