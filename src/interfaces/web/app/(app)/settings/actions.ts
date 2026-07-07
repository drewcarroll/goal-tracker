"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { HabitDTO } from "@/application/dtos/HabitDTO";

export type UpdateHabitActionResult = { ok: true; habit: HabitDTO } | { ok: false; error: string };

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR" || coded?.code === "HABIT_NOT_FOUND") {
    return coded.message ?? "That habit could not be updated.";
  }
  return "Something went wrong. Please try again.";
}

export async function setHabitPausedAction(
  habitId: string,
  action: "pause" | "resume",
): Promise<UpdateHabitActionResult> {
  const { updateHabitUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const habit = await updateHabitUseCase.execute({ userId, habitId, action });
    // A paused/resumed habit changes what's schedulable on /plan and what
    // shows on /home, so both need fresh data alongside /settings itself.
    revalidatePath("/settings");
    revalidatePath("/plan");
    revalidatePath("/home");
    return { ok: true, habit };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
