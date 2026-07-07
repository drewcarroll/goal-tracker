"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import type { DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";

export type CreateDailyPlanActionResult =
  | { ok: true; plan: DailyPlanDTO }
  | { ok: false; error: string };

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (
    coded?.code === "VALIDATION_ERROR" ||
    coded?.code === "LOCK_BUDGET_EXCEEDED" ||
    coded?.code === "HABIT_NOT_SCHEDULABLE" ||
    coded?.code === "HABIT_NOT_FOUND"
  ) {
    return coded.message ?? "That plan could not be saved.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Plans tomorrow by default; `dateChoice: "today"` is the grace path for a
 * day that ended up with no plan at all. Either way the target date is
 * computed server-side from the signed-in user's timezone, never trusted
 * from the client as a literal date.
 */
export async function createDailyPlanAction(
  habitIds: string[],
  dateChoice: "today" | "tomorrow" = "tomorrow",
): Promise<CreateDailyPlanActionResult> {
  if (habitIds.length === 0) {
    return { ok: false, error: "Pick at least one habit to plan." };
  }

  const { createDailyPlanUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const date =
    dateChoice === "today" ? localDateService.today(timezone) : localDateService.tomorrow(timezone);

  try {
    const plan = await createDailyPlanUseCase.execute({ userId, date, habitIds });
    revalidatePath("/plan");
    revalidatePath("/home");
    return { ok: true, plan };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
