"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import type { PurchaseShopSlotResultDTO } from "@/application/dtos/ShopDTO";

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "SHOP_SLOT_ALREADY_PURCHASED" || coded?.code === "INSUFFICIENT_COINS") {
    return coded.message ?? "That couldn't be completed.";
  }
  return "Something went wrong. Please try again.";
}

export type PurchaseShopSlotActionResult =
  | { ok: true; result: PurchaseShopSlotResultDTO }
  | { ok: false; error: string };

/**
 * Buys today's offered trinket in one slot. The date is resolved
 * server-side (never trusted from the client) so a purchase always lands on
 * the same day whose offer the user is actually looking at.
 */
export async function purchaseShopSlotAction(slotIndex: number): Promise<PurchaseShopSlotActionResult> {
  const { purchaseShopSlotUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const date = localDateService.today(currentTimezone());

  try {
    const result = await purchaseShopSlotUseCase.execute({ userId, date, slotIndex });
    revalidatePath("/shop");
    revalidatePath("/profile");
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
