"use server";

import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { GoalDTO, CreateGoalSelectionDTO } from "@/application/dtos/GoalDTO";

export type OnboardingActionResult =
  | { ok: true; goals: GoalDTO[] }
  | { ok: false; error: string };

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR") {
    return coded.message ?? "Those goals could not be created.";
  }
  return "Something went wrong. Please try again.";
}

export async function createGoalsFromOnboardingAction(
  selections: CreateGoalSelectionDTO[],
): Promise<OnboardingActionResult> {
  if (selections.length === 0) {
    return { ok: false, error: "Select at least one goal to continue." };
  }

  const { createGoalsFromOnboardingUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const goals = await createGoalsFromOnboardingUseCase.execute({ userId, selections });
    return { ok: true, goals };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
