"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import { createGoalSchema, updateGoalSchema } from "@/interfaces/web/http/validation";

/** Raw values as they arrive from the form (all strings). */
export interface GoalFormValues {
  name: string;
  targetValue: string;
  unit: string;
  startDate: string;
  endDate: string;
}

export type GoalFieldErrors = Partial<Record<keyof GoalFormValues, string>>;

export type GoalActionResult =
  | { ok: true; goal: GoalDTO }
  | { ok: false; error: string; fieldErrors?: GoalFieldErrors };

/** Map a ZodError's flattened field errors to one message per field. */
function toFieldErrors(fieldErrors: Record<string, string[] | undefined>): GoalFieldErrors {
  const result: GoalFieldErrors = {};
  for (const key of ["name", "targetValue", "unit", "startDate", "endDate"] as const) {
    const message = fieldErrors[key]?.[0];
    if (message) {
      result[key] = message;
    }
  }
  return result;
}

/** Translate thrown domain/application errors into a user-facing message. */
function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR" || coded?.code === "GOAL_NOT_FOUND") {
    return coded.message ?? "That goal could not be saved.";
  }
  return "Something went wrong. Please try again.";
}

export async function createGoalAction(values: GoalFormValues): Promise<GoalActionResult> {
  const { ownerId, createGoalUseCase } = getContainer();

  const parsed = createGoalSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const goal = await createGoalUseCase.execute({ userId: ownerId, ...parsed.data });
    revalidatePath("/goals");
    return { ok: true, goal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateGoalAction(
  goalId: string,
  values: GoalFormValues,
): Promise<GoalActionResult> {
  const { ownerId, updateGoalUseCase } = getContainer();

  const parsed = updateGoalSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const goal = await updateGoalUseCase.execute({ userId: ownerId, goalId, ...parsed.data });
    revalidatePath("/goals");
    return { ok: true, goal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type DeleteActionResult = { ok: true } | { ok: false; error: string };

export async function deleteGoalAction(goalId: string): Promise<DeleteActionResult> {
  const { ownerId, deleteGoalUseCase } = getContainer();

  try {
    await deleteGoalUseCase.execute({ userId: ownerId, goalId });
    revalidatePath("/goals");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
