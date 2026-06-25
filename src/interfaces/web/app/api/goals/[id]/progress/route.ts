import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { updateProgressSchema } from "../../../../../http/validation";
import { toErrorResponse } from "../../../../../http/errorResponse";
import { unauthorizedResponse } from "../../../../../http/auth";

/**
 * Route handler for PATCH /api/goals/:id/progress.
 *
 * The caller's id is passed to the use case, which rejects (as "not found")
 * any goal the caller does not own — so no user can mutate another's goal.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { authService, updateGoalProgressUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parsed = updateProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const goal = await updateGoalProgressUseCase.execute({
      userId,
      goalId: params.id,
      progress: parsed.data.progress,
    });

    return NextResponse.json({ data: goal });
  } catch (error) {
    return toErrorResponse(error);
  }
}
