"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { GoalDTO, GoalDifficulty } from "@/application/dtos/GoalDTO";

/** A goal's cost/state feeds Home, Plan, Progress, and History too. */
function revalidateGoalDerivedPages(): void {
  revalidatePath("/home");
  revalidatePath("/goals");
  revalidatePath("/plan");
  revalidatePath("/progress");
  revalidatePath("/history");
}

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR" || coded?.code === "GOAL_NOT_FOUND") {
    return coded.message ?? "That goal could not be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type GoalActionResult = { ok: true; goal: GoalDTO } | { ok: false; error: string };

export async function createGoalAction(
  name: string,
  weeklyFrequencyTarget: number,
  difficulty: GoalDifficulty,
): Promise<GoalActionResult> {
  const { createGoalUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const goal = await createGoalUseCase.execute({ userId, name, weeklyFrequencyTarget, difficulty });
    revalidateGoalDerivedPages();
    return { ok: true, goal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function editGoalAction(
  goalId: string,
  name: string,
  weeklyFrequencyTarget: number,
): Promise<GoalActionResult> {
  const { editGoalUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const goal = await editGoalUseCase.execute({ userId, goalId, name, weeklyFrequencyTarget });
    revalidateGoalDerivedPages();
    return { ok: true, goal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function setGoalPausedAction(
  goalId: string,
  action: "pause" | "resume",
): Promise<GoalActionResult> {
  const { updateGoalUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const goal = await updateGoalUseCase.execute({ userId, goalId, action });
    revalidateGoalDerivedPages();
    return { ok: true, goal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type DeleteGoalActionResult = { ok: true } | { ok: false; error: string };

export async function deleteGoalAction(goalId: string): Promise<DeleteGoalActionResult> {
  const { deleteGoalUseCase } = getContainer();
  const userId = currentUserId();

  try {
    await deleteGoalUseCase.execute({ userId, goalId });
    revalidateGoalDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
