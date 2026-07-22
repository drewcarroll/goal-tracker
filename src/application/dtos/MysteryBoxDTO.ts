import type { TrinketRarity } from "@/domain/value-objects/Trinket";

export interface OpenMysteryBoxDTO {
  userId: string;
}

export interface OpenMysteryBoxResultDTO {
  trinket: { id: string; emoji: string; name: string; rarity: TrinketRarity };
  /** Total owned after this open — doubles as the trinket's new level. */
  quantity: number;
  /** Coin balance after paying for the box. */
  balance: number;
}
