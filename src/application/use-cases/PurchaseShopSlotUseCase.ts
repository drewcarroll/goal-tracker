import { ShopPurchaseRepository } from "@/domain/repositories/ShopPurchaseRepository";
import { EconomyConfigRepository } from "@/domain/repositories/EconomyConfigRepository";
import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";
import { TrinketInventoryRepository } from "@/domain/repositories/TrinketInventoryRepository";
import { ActivityEventRepository } from "@/domain/repositories/ActivityEventRepository";
import { ShopRollService } from "@/domain/services/ShopRollService";
import { Clock } from "../ports/Clock";
import { ShopSlotAlreadyPurchasedError, InsufficientCoinsError } from "../errors/ApplicationError";
import type { PurchaseShopSlotDTO, PurchaseShopSlotResultDTO } from "../dtos/ShopDTO";

/**
 * Use Case: buy today's offered trinket in one slot. Re-derives which
 * trinket that slot actually offers from the same deterministic roll as
 * GetShopOfferUseCase — never trusts a client-supplied trinket id — and
 * re-checks the rate limit (findPurchasedSlotsForDate) server-side, since
 * the unique (user, date, slot) DB constraint is the final backstop but a
 * pre-check gives a clean domain error instead of a raw constraint failure.
 * NOT a collect-once model: buying a duplicate is allowed and expected —
 * inventory tracks quantity (user decision, 2026-07-16).
 */
export class PurchaseShopSlotUseCase {
  constructor(
    private readonly shopPurchaseRepository: ShopPurchaseRepository,
    private readonly economyConfigRepository: EconomyConfigRepository,
    private readonly coinWalletRepository: CoinWalletRepository,
    private readonly trinketInventoryRepository: TrinketInventoryRepository,
    private readonly activityEventRepository: ActivityEventRepository,
    private readonly shopRollService: ShopRollService,
    private readonly clock: Clock,
  ) {}

  async execute(dto: PurchaseShopSlotDTO): Promise<PurchaseShopSlotResultDTO> {
    const purchasedSlots = await this.shopPurchaseRepository.findPurchasedSlotsForDate(
      dto.userId,
      dto.date,
    );
    if (purchasedSlots.has(dto.slotIndex)) {
      throw new ShopSlotAlreadyPurchasedError();
    }

    const economyConfig = await this.economyConfigRepository.getEconomyConfig();
    const offer = this.shopRollService.rollDailyOffer({
      userId: dto.userId,
      date: dto.date,
      economyConfig,
    });
    const slot = offer.find((s) => s.slotIndex === dto.slotIndex);
    if (!slot) {
      throw new ShopSlotAlreadyPurchasedError(); // an out-of-range slot index is never claimable either
    }

    const price = economyConfig.shopTrinketPrice;
    const balance = await this.coinWalletRepository.getBalance(dto.userId);
    if (balance < price) {
      throw new InsufficientCoinsError();
    }

    await this.shopPurchaseRepository.save({
      userId: dto.userId,
      date: dto.date,
      slotIndex: dto.slotIndex,
      trinketId: slot.trinket.id,
      pricePaid: price,
    });
    const newBalance = await this.coinWalletRepository.adjustBalance(dto.userId, -price);
    await this.trinketInventoryRepository.incrementQuantity(dto.userId, slot.trinket.id, 1);
    const inventory = await this.trinketInventoryRepository.getInventory(dto.userId);
    await this.activityEventRepository.record({
      userId: dto.userId,
      type: "shop_purchase",
      trinketId: slot.trinket.id,
      occurredAt: this.clock.now(),
    });

    return {
      trinket: {
        id: slot.trinket.id,
        emoji: slot.trinket.emoji,
        name: slot.trinket.name,
        rarity: slot.trinket.rarity,
      },
      quantity: inventory.get(slot.trinket.id) ?? 1,
      balance: newBalance,
    };
  }
}
