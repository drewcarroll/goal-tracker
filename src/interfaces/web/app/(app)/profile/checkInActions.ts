"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { CheckInDTO, GoalMarkDTO } from "@/application/dtos/CheckInDTO";

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (
    coded?.code === "VALIDATION_ERROR" ||
    coded?.code === "GOAL_NOT_FOUND" ||
    coded?.code === "CHECK_IN_NOT_FOUND"
  ) {
    return coded.message ?? "That change could not be saved.";
  }
  return "Something went wrong. Please try again.";
}

/** Mutating a check-in changes every goal-derived tab, so refresh them all. */
function revalidateCheckInDerivedPages(): void {
  revalidatePath("/home");
  revalidatePath("/goals");
  revalidatePath("/profile");
  revalidatePath("/checkin");
}

export type HistoryActionResult = { ok: true } | { ok: false; error: string };

export type CheckInActionResult =
  | { ok: true; checkIn: CheckInDTO }
  | { ok: false; error: string };

/** Correct an existing day's marks. */
export async function editCheckInAction(
  date: string,
  marks: GoalMarkDTO[],
): Promise<CheckInActionResult> {
  if (marks.length === 0) {
    return { ok: false, error: "Mark at least one goal." };
  }

  const { editCheckInUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const checkIn = await editCheckInUseCase.execute({ userId, date, marks });
    revalidateCheckInDerivedPages();
    return { ok: true, checkIn };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteCheckInAction(date: string): Promise<HistoryActionResult> {
  const { deleteCheckInUseCase } = getContainer();
  const userId = currentUserId();

  try {
    await deleteCheckInUseCase.execute({ userId, date });
    revalidateCheckInDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
