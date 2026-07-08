"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
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
  revalidatePath("/progress");
  revalidatePath("/history");
  revalidatePath("/checkin");
}

export type HistoryActionResult = { ok: true } | { ok: false; error: string };

export type CheckInActionResult =
  | { ok: true; checkIn: CheckInDTO }
  | { ok: false; error: string };

/**
 * Backfill a missed day. The date must be in the past (never today or the
 * future — today goes through /checkin, and "the future" isn't a thing you
 * can have checked in for yet) relative to the signed-in user's timezone.
 */
export async function addPastCheckInAction(
  date: string,
  marks: GoalMarkDTO[],
): Promise<CheckInActionResult> {
  if (marks.length === 0) {
    return { ok: false, error: "Mark at least one goal." };
  }

  const { submitCheckInUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());
  if (date >= today) {
    return { ok: false, error: "Pick a date before today — today's check-in happens on /checkin." };
  }

  try {
    const checkIn = await submitCheckInUseCase.execute({ userId, date, marks });
    revalidateCheckInDerivedPages();
    return { ok: true, checkIn };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

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
