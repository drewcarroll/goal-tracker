"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { quickLogSchema } from "@/interfaces/web/http/validation";

/** Mutating a log changes every goal-derived tab, so refresh them all. */
function revalidateLogDerivedPages(): void {
  revalidatePath("/home");
  revalidatePath("/goals");
  revalidatePath("/progress");
  revalidatePath("/history");
}

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (
    coded?.code === "VALIDATION_ERROR" ||
    coded?.code === "GOAL_NOT_FOUND" ||
    coded?.code === "LOG_NOT_FOUND"
  ) {
    return coded.message ?? "That change could not be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type HistoryActionResult = { ok: true } | { ok: false; error: string };

/** Remove a single mistaken entry from a goal's history. */
export async function deleteLogAction(
  goalId: string,
  logId: string,
): Promise<HistoryActionResult> {
  const { deleteLogUseCase } = getContainer();
  const userId = currentUserId();
  try {
    await deleteLogUseCase.execute({ userId, goalId, logId });
    revalidateLogDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** Add an entry to a specific (already-started) week from the history view. */
export async function addLogToWeekAction(
  goalId: string,
  weekIndex: number,
  value: string,
): Promise<HistoryActionResult> {
  const { logProgressUseCase } = getContainer();
  const userId = currentUserId();

  const parsed = quickLogSchema.safeParse({ goalId, value, weekIndex });
  if (!parsed.success) {
    const fieldError = parsed.error.flatten().fieldErrors;
    return { ok: false, error: fieldError.value?.[0] ?? "Enter a valid amount." };
  }

  try {
    await logProgressUseCase.execute({
      userId,
      goalId: parsed.data.goalId,
      value: parsed.data.value,
      weekIndex: parsed.data.weekIndex,
    });
    revalidateLogDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
