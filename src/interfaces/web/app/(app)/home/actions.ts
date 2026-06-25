"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { LogDTO } from "@/application/dtos/LogDTO";
import { quickLogSchema } from "@/interfaces/web/http/validation";

/** Raw values as they arrive from the quick-log form (all strings). */
export interface QuickLogFormValues {
  goalId: string;
  value: string;
}

export type QuickLogFieldErrors = Partial<Record<keyof QuickLogFormValues, string>>;

export type QuickLogActionResult =
  | { ok: true; log: LogDTO; goal: GoalDTO; weekTotal: number }
  | { ok: false; error: string; fieldErrors?: QuickLogFieldErrors };

/** Map a ZodError's flattened field errors to one message per field. */
function toFieldErrors(fieldErrors: Record<string, string[] | undefined>): QuickLogFieldErrors {
  const result: QuickLogFieldErrors = {};
  for (const key of ["goalId", "value"] as const) {
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
    return coded.message ?? "That entry could not be logged.";
  }
  return "Something went wrong. Please try again.";
}

export async function logProgressAction(values: QuickLogFormValues): Promise<QuickLogActionResult> {
  const { authService, logProgressUseCase } = getContainer();
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to log progress." };
  }

  const parsed = quickLogSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const result = await logProgressUseCase.execute({
      userId,
      goalId: parsed.data.goalId,
      value: parsed.data.value,
    });
    // Goals' projected totals are derived from logs and surface on other tabs.
    revalidatePath("/home");
    revalidatePath("/goals");
    revalidatePath("/progress");
    return { ok: true, log: result.log, goal: result.goal, weekTotal: result.weekTotal };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
