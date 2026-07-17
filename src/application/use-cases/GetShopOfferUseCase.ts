import { ShopPurchaseRepository } from "@/domain/repositories/ShopPurchaseRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { ShopRollService } from "@/domain/services/ShopRollService";
import type { GetShopOfferDTO, ShopOfferDTO } from "../dtos/ShopDTO";

/**
 * Use Case: today's 5-slot shop offer, with price, purchased/owned state per
 * slot, and the user's current coin balance for the UI to gate on.
 */
export class GetShopOfferUseCase {
  constructor(
    private readonly shopPurchaseRepository: ShopPurchaseRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
    private readonly coinWalletRepository: CoinWalletRepository,
    private readonly trinketInventoryRepository: TrinketInventoryRepository,
    private readonly shopRollService: ShopRollService,
  ) {}

  async execute(dto: GetShopOfferDTO): Promise<ShopOfferDTO> {
    const [economyConfig, purchasedSlots, coinBalance, inventory] = await Promise.all([
      this.economyConfigRepository.getEconomyConfig(),
      this.shopPurchaseRepository.findPurchasedSlotsForDate(dto.userId, dto.date),
      this.coinWalletRepository.getBalance(dto.userId),
      this.trinketInventoryRepository.getInventory(dto.userId),
    ]);

    const offer = this.shopRollService.rollDailyOffer({
      userId: dto.userId,
      date: dto.date,
      economyConfig,
    });

    return {
      date: dto.date,
      coinBalance,
      slots: offer.map((slot) => ({
        slotIndex: slot.slotIndex,
        trinket: {
          id: slot.trinket.id,
          emoji: slot.trinket.emoji,
          name: slot.trinket.name,
          rarity: slot.trinket.rarity,
        },
        price: economyConfig.shopTrinketPrice,
        purchased: purchasedSlots.has(slot.slotIndex),
        ownedQuantity: inventory.get(slot.trinket.id) ?? 0,
      })),
    };
  }
}
