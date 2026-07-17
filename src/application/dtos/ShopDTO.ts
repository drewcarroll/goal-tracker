import type { TrinketRarity } from "@/domain/value-objects/Trinket";

export interface ShopOfferSlotDTO {
  slotIndex: number;
  trinket: { id: string; emoji: string; name: string; rarity: TrinketRarity };
  price: number;
  purchased: boolean;
  ownedQuantity: number;
}

export interface ShopOfferDTO {
  date: string;
  slots: ShopOfferSlotDTO[];
  coinBalance: number;
}

export interface GetShopOfferDTO {
  userId: string;
  date: string;
}

export interface PurchaseShopSlotDTO {
  userId: string;
  date: string;
  slotIndex: number;
}

export interface PurchaseShopSlotResultDTO {
  trinket: { id: string; emoji: string; name: string; rarity: TrinketRarity };
  quantity: number;
  balance: number;
}
