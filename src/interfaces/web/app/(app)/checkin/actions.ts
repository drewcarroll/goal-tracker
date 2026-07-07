"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import type { CheckInDTO, HabitMarkDTO } from "@/application/dtos/CheckInDTO";
import type { JournalEntryDTO } from "@/application/dtos/JournalEntryDTO";

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR" || coded?.code === "HABIT_NOT_FOUND") {
    return coded.message ?? "That couldn't be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type SubmitCheckInActionResult =
  | { ok: true; checkIn: CheckInDTO }
  | { ok: false; error: string };

/**
 * Submits today's check-in. The target date is computed server-side from
 * the signed-in user's timezone, never trusted from the client.
 */
export async function submitCheckInAction(
  marks: HabitMarkDTO[],
): Promise<SubmitCheckInActionResult> {
  if (marks.length === 0) {
    return { ok: false, error: "Mark at least one habit to check in." };
  }

  const { submitCheckInUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const date = localDateService.today(currentTimezone());

  try {
    const checkIn = await submitCheckInUseCase.execute({ userId, date, marks });
    revalidatePath("/checkin");
    revalidatePath("/home");
    revalidatePath("/progress");
    revalidatePath("/history");
    return { ok: true, checkIn };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type SaveJournalActionResult =
  | { ok: true; entry: JournalEntryDTO }
  | { ok: false; error: string };

/**
 * Saves the optional private journal entry for today. Screen 2 of check-in —
 * entirely optional, never affects lock cost or any stats. No photo support
 * yet (blocked on creating a Supabase Storage bucket).
 */
export async function saveJournalAction(
  text: string | undefined,
  mood: number | undefined,
): Promise<SaveJournalActionResult> {
  const { createJournalEntryUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const date = localDateService.today(currentTimezone());

  try {
    const entry = await createJournalEntryUseCase.execute({ userId, date, text, mood });
    return { ok: true, entry };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
