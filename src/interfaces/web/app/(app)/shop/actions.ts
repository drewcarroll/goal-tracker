"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { OpenMysteryBoxResultDTO } from "@/application/dtos/MysteryBoxDTO";

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "INSUFFICIENT_COINS") {
    return coded.message ?? "That couldn't be completed.";
  }
  return "Something went wrong. Please try again.";
}

export type OpenMysteryBoxActionResult =
  | { ok: true; result: OpenMysteryBoxResultDTO }
  | { ok: false; error: string };

/** Opens one mystery box for the signed-in user. */
export async function openMysteryBoxAction(): Promise<OpenMysteryBoxActionResult> {
  const { openMysteryBoxUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const result = await openMysteryBoxUseCase.execute({ userId });
    revalidatePath("/shop");
    revalidatePath("/profile");
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
