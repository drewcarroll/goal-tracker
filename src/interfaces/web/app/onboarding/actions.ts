"use server";

import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { HabitDTO, CreateHabitSelectionDTO } from "@/application/dtos/HabitDTO";

export type OnboardingActionResult =
  | { ok: true; habits: HabitDTO[] }
  | { ok: false; error: string };

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR") {
    return coded.message ?? "Those habits could not be created.";
  }
  return "Something went wrong. Please try again.";
}

export async function createHabitsFromOnboardingAction(
  selections: CreateHabitSelectionDTO[],
): Promise<OnboardingActionResult> {
  if (selections.length === 0) {
    return { ok: false, error: "Select at least one habit to continue." };
  }

  const { createHabitsFromOnboardingUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const habits = await createHabitsFromOnboardingUseCase.execute({ userId, selections });
    return { ok: true, habits };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
