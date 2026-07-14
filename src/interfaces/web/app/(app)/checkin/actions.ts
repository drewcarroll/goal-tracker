"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import type { CheckInDTO, GoalMarkDTO } from "@/application/dtos/CheckInDTO";
import type { JournalEntryDTO } from "@/application/dtos/JournalEntryDTO";

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (
    coded?.code === "VALIDATION_ERROR" ||
    coded?.code === "GOAL_NOT_FOUND" ||
    coded?.code === "CHECKIN_WINDOW_CLOSED"
  ) {
    return coded.message ?? "That couldn't be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type SubmitCheckInActionResult =
  | {
      ok: true;
      checkIn: CheckInDTO;
      /** The nightly-log reward: XP for the on-time submission. */
      rank: {
        xpEarned: number;
        xp: number;
        rank: number;
        nextRank: number;
        xpIntoRank: number;
        xpForRankUp: number;
        rankedUp: boolean;
      };
    }
  | { ok: false; error: string };

/**
 * Submits the nightly check-in. The target date and on-time status are
 * resolved entirely server-side from the user's timezone and check-in window
 * (never the client's clock); outside the window the use case rejects.
 * On success the fresh rank is returned so the flow can celebrate the point.
 */
export async function submitCheckInAction(
  marks: GoalMarkDTO[],
): Promise<SubmitCheckInActionResult> {
  if (marks.length === 0) {
    return { ok: false, error: "Mark at least one goal to check in." };
  }

  const { submitCheckInUseCase, getRankUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const before = await getRankUseCase.execute({ userId });
    const checkIn = await submitCheckInUseCase.execute({
      userId,
      timezone: currentTimezone(),
      marks,
    });
    const after = await getRankUseCase.execute({ userId });
    revalidatePath("/checkin");
    revalidatePath("/home");
    revalidatePath("/progress");
    revalidatePath("/history");
    revalidatePath("/profile");
    return {
      ok: true,
      checkIn,
      rank: {
        xpEarned: after.xp - before.xp,
        xp: after.xp,
        rank: after.rank,
        nextRank: after.nextRank,
        xpIntoRank: after.xpIntoRank,
        xpForRankUp: after.xpForRankUp,
        rankedUp: after.rank > before.rank,
      },
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type SaveJournalActionResult =
  | { ok: true; entry: JournalEntryDTO }
  | { ok: false; error: string };

/**
 * Saves the optional private journal entry. Screen 2 of check-in — entirely
 * optional, never affects lock cost or any stats. Anchored to the same
 * logical day as the check-in (a 1 AM entry belongs to yesterday), falling
 * back to the calendar day if the window happens to be closed. No photo
 * support yet (blocked on creating a Supabase Storage bucket).
 */
export async function saveJournalAction(
  text: string | undefined,
  mood: number | undefined,
): Promise<SaveJournalActionResult> {
  const { createJournalEntryUseCase, getCheckInWindowUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const window = await getCheckInWindowUseCase.execute({ userId, timezone });
  const date = window.open ? window.targetDate : localDateService.today(timezone);

  try {
    const entry = await createJournalEntryUseCase.execute({ userId, date, text, mood });
    return { ok: true, entry };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
